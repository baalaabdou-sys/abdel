'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/utils';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { classifyReply } from '../ai/reply-classifier';
import { getEmailProvider } from '../providers/email';
import { addSuppression } from '../services/suppression';
import { REPLY_CATEGORY_LIST } from '@/lib/domain';

/**
 * Ingests an inbound reply.
 *
 * Automatic sending is never enabled: the AI produces a *suggested* reply that a
 * human must review and send. Only classification happens automatically.
 */
export async function ingestReplyAction(raw: {
  fromEmail: string; subject: string; body: string; toEmail?: string; providerMessageId?: string;
}): Promise<ActionResult<{ threadId: string; category: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('inbox:write');
    const parsed = z.object({
      fromEmail: z.string().email(),
      subject: z.string().max(300).default(''),
      body: z.string().min(1).max(20000),
      toEmail: z.string().email().optional(),
      providerMessageId: z.string().max(200).optional(),
    }).safeParse(raw);
    if (!parsed.success) return fail('Message invalide');

    const emailNormalized = normalizeEmail(parsed.data.fromEmail);
    const contact = await prisma.contact.findUnique({
      where: { workspaceId_emailNormalized: { workspaceId: ctx.workspaceId, emailNormalized } },
      select: { id: true },
    });

    const recipient = await prisma.campaignRecipient.findFirst({
      where: { contact: { workspaceId: ctx.workspaceId, emailNormalized }, status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { id: true, campaignId: true },
    });

    const lead = contact
      ? await prisma.lead.findFirst({ where: { workspaceId: ctx.workspaceId, contactId: contact.id }, orderBy: { createdAt: 'desc' }, select: { id: true } })
      : null;

    const account = await prisma.emailAccount.findFirst({
      where: { workspaceId: ctx.workspaceId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fromEmail: true },
    });

    const classification = await classifyReply(ctx.workspaceId, parsed.data.subject, parsed.data.body);

    const thread = await prisma.emailThread.create({
      data: {
        workspaceId: ctx.workspaceId,
        emailAccountId: account?.id ?? null,
        subject: parsed.data.subject || '(sans objet)',
        participants: [parsed.data.fromEmail, parsed.data.toEmail ?? account?.fromEmail ?? ''].filter(Boolean),
        category: classification.category,
        campaignId: recipient?.campaignId ?? null,
        leadId: lead?.id ?? null,
        lastMessageAt: new Date(),
        messages: {
          create: {
            emailAccountId: account?.id ?? null,
            contactId: contact?.id ?? null,
            direction: 'INBOUND',
            fromEmail: parsed.data.fromEmail,
            toEmail: parsed.data.toEmail ?? account?.fromEmail ?? '',
            subject: parsed.data.subject,
            bodyText: parsed.data.body,
            providerMessageId: parsed.data.providerMessageId,
            category: classification.category,
            aiSuggestion: classification.suggestedReply,
            aiReasoning: classification.reasoning,
          },
        },
      },
    });

    if (recipient) {
      await prisma.campaignEvent.create({
        data: {
          workspaceId: ctx.workspaceId,
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          contactId: contact?.id ?? null,
          type: 'REPLIED',
          dedupeKey: `reply:${thread.id}`,
        },
      }).catch(() => undefined);
    }

    // An unsubscribe request in a reply is honoured immediately.
    if (classification.category === 'UNSUBSCRIBE') {
      await addSuppression({
        workspaceId: ctx.workspaceId,
        email: parsed.data.fromEmail,
        reason: 'UNSUBSCRIBED',
        source: 'réponse email',
        userId: ctx.user.id,
      });
    }

    revalidatePath('/inbox');
    return ok({ threadId: thread.id, category: classification.category });
  });
}

export async function updateThreadAction(threadId: string, data: { category?: string; unread?: boolean; archived?: boolean }): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('inbox:write');
    const thread = await prisma.emailThread.findFirst({ where: { id: threadId, workspaceId: ctx.workspaceId } });
    if (!thread) return fail('Conversation introuvable');
    if (data.category && !REPLY_CATEGORY_LIST.includes(data.category as 'OTHER')) return fail('Catégorie inconnue');

    await prisma.emailThread.update({
      where: { id: threadId },
      data: {
        ...(data.category ? { category: data.category as 'OTHER' } : {}),
        ...(data.unread !== undefined ? { unread: data.unread } : {}),
        ...(data.archived !== undefined ? { archived: data.archived } : {}),
      },
    });
    revalidatePath('/inbox');
    return ok(null);
  });
}

/** Sends a human-reviewed reply. There is no auto-send path anywhere. */
export async function sendReplyAction(threadId: string, body: string): Promise<ActionResult<{ simulated: boolean }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('inbox:write');
    const parsed = z.string().min(2).max(20000).safeParse(body);
    if (!parsed.success) return fail('Le message est vide.');

    const thread = await prisma.emailThread.findFirst({
      where: { id: threadId, workspaceId: ctx.workspaceId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 }, account: true },
    });
    if (!thread) return fail('Conversation introuvable');

    const inbound = thread.messages[0];
    const account = thread.account ?? (await prisma.emailAccount.findFirst({ where: { workspaceId: ctx.workspaceId, active: true } }));
    if (!account || !inbound) return fail('Aucun compte d’envoi disponible.');

    const provider = getEmailProvider(account);
    const result = await provider.send({
      to: inbound.fromEmail,
      from: account.fromEmail,
      fromName: account.fromName,
      replyTo: account.replyTo ?? undefined,
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      idempotencyKey: `reply-${threadId}-${Date.now()}`,
      text: parsed.data,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${parsed.data.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c))}</div>`,
    });

    await prisma.emailMessage.create({
      data: {
        threadId,
        emailAccountId: account.id,
        contactId: inbound.contactId,
        direction: 'OUTBOUND',
        fromEmail: account.fromEmail,
        toEmail: inbound.fromEmail,
        subject: thread.subject,
        bodyText: parsed.data,
        providerMessageId: result.providerMessageId,
      },
    });
    await prisma.emailThread.update({
      where: { id: threadId },
      data: { unread: false, lastMessageAt: new Date() },
    });

    if (thread.leadId) {
      await prisma.leadActivity.create({
        data: { leadId: thread.leadId, userId: ctx.user.id, type: 'EMAIL', title: 'Réponse envoyée', body: parsed.data.slice(0, 1000) },
      });
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'inbox.reply',
      entityType: 'EmailThread', entityId: threadId, summary: `Réponse envoyée à ${inbound.fromEmail}`,
    });
    revalidatePath('/inbox');
    return ok({ simulated: result.simulated });
  });
}
