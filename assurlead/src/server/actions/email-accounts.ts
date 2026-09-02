'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { encryptConfig, decryptConfig } from '@/lib/crypto';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { getEmailProvider } from '../providers/email';
import { checkDomainAuthentication, inspectDomain } from '../services/deliverability';

const accountSchema = z.object({
  label: z.string().min(2).max(120),
  provider: z.enum(['DEMO', 'SMTP', 'BREVO', 'MAILGUN', 'SES', 'POSTMARK']),
  fromEmail: z.string().email('Adresse expéditeur invalide'),
  fromName: z.string().min(2).max(120),
  replyTo: z.string().email().optional().or(z.literal('')),
  dailyLimit: z.coerce.number().int().min(1).max(500000),
  hourlyLimit: z.coerce.number().int().min(1).max(50000),
  warmupEnabled: z.boolean().default(false),
  warmupStartLimit: z.coerce.number().int().min(1).max(10000).default(50),
  warmupIncrement: z.coerce.number().int().min(0).max(10000).default(50),
  credentials: z.record(z.unknown()).default({}),
});

export async function saveEmailAccountAction(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const parsed = accountSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);
    const d = parsed.data;

    // Attach or create the sending domain derived from the sender address.
    const domainName = d.fromEmail.split('@')[1];
    const domain = await prisma.sendingDomain.upsert({
      where: { workspaceId_domain: { workspaceId: ctx.workspaceId, domain: domainName } },
      update: {},
      create: { workspaceId: ctx.workspaceId, domain: domainName },
    });

    // Existing secrets are preserved when the form sends the masked placeholder.
    let credentials = d.credentials;
    if (id) {
      const existing = await prisma.emailAccount.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return fail('Compte introuvable');
      const current = decryptConfig(existing.credentials as Record<string, unknown>);
      credentials = Object.fromEntries(
        Object.entries(credentials).map(([k, v]) => (v === '••••••••' || v === '' ? [k, current[k] ?? ''] : [k, v])),
      );
    }

    const data = {
      label: d.label,
      provider: d.provider,
      fromEmail: d.fromEmail,
      fromName: d.fromName,
      replyTo: d.replyTo || null,
      dailyLimit: d.dailyLimit,
      hourlyLimit: d.hourlyLimit,
      warmupEnabled: d.warmupEnabled,
      warmupStartLimit: d.warmupStartLimit,
      warmupIncrement: d.warmupIncrement,
      warmupStartAt: d.warmupEnabled ? new Date() : null,
      credentials: encryptConfig(credentials) as never,
      domainId: domain.id,
    };

    const account = id
      ? await prisma.emailAccount.update({ where: { id }, data })
      : await prisma.emailAccount.create({ data: { ...data, workspaceId: ctx.workspaceId } });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id,
      action: id ? 'email_account.update' : 'email_account.create',
      entityType: 'EmailAccount', entityId: account.id,
      summary: `${account.fromName} <${account.fromEmail}> · ${account.provider}`,
    });
    revalidatePath('/email-accounts');
    return ok({ id: account.id });
  });
}

export async function testEmailAccountAction(id: string): Promise<ActionResult<{ ok: boolean; message: string; simulated: boolean }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const account = await prisma.emailAccount.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!account) return fail('Compte introuvable');

    const provider = getEmailProvider(account);
    const result = await provider.verifyConnection();
    await prisma.emailAccount.update({
      where: { id },
      data: {
        status: result.ok ? 'CONNECTED' : 'ERROR',
        statusMessage: result.message,
        lastSyncAt: new Date(),
      },
    });
    revalidatePath('/email-accounts');
    return ok({ ...result, simulated: provider.simulated });
  });
}

export async function sendTestEmailAction(id: string, to: string): Promise<ActionResult<{ simulated: boolean; messageId: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const parsed = z.string().email().safeParse(to);
    if (!parsed.success) return fail('Adresse de test invalide');

    const account = await prisma.emailAccount.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!account) return fail('Compte introuvable');

    const provider = getEmailProvider(account);
    const result = await provider.send({
      to: parsed.data,
      from: account.fromEmail,
      fromName: account.fromName,
      subject: `[Test] Configuration de ${account.fromName}`,
      idempotencyKey: `test-${id}-${Date.now()}`,
      text: `Ceci est un email de test envoyé depuis ASSURLEAD AI pour vérifier la configuration du compte « ${account.label} ».`,
      html: `<p style="font-family:system-ui,sans-serif;font-size:15px">Ceci est un email de test envoyé depuis ASSURLEAD AI pour vérifier la configuration du compte « <strong>${account.label}</strong> ».</p>`,
    });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'email_account.test_send',
      entityType: 'EmailAccount', entityId: id, summary: `Email de test vers ${parsed.data}`,
    });
    return ok({ simulated: result.simulated, messageId: result.providerMessageId });
  });
}

export async function toggleEmailAccountAction(id: string, active: boolean): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const account = await prisma.emailAccount.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!account) return fail('Compte introuvable');
    await prisma.emailAccount.update({ where: { id }, data: { active } });
    revalidatePath('/email-accounts');
    return ok(null);
  });
}

export async function deleteEmailAccountAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const account = await prisma.emailAccount.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!account) return fail('Compte introuvable');
    const inUse = await prisma.campaign.count({ where: { emailAccountId: id, status: { in: ['SENDING', 'SCHEDULED'] } } });
    if (inUse > 0) return fail('Ce compte est utilisé par une campagne active.');
    await prisma.emailAccount.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'email_account.delete', entityType: 'EmailAccount', entityId: id, summary: account.label });
    revalidatePath('/email-accounts');
    return ok(null);
  });
}

export async function checkDomainAction(domainId: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('deliverability:read');
    const domain = await prisma.sendingDomain.findFirst({ where: { id: domainId, workspaceId: ctx.workspaceId } });
    if (!domain) return fail('Domaine introuvable');
    const updated = await checkDomainAuthentication(domainId);
    revalidatePath('/deliverability');
    return ok(updated);
  });
}

export async function addDomainAction(domainName: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('email_accounts:write');
    const parsed = z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Nom de domaine invalide').safeParse(domainName.trim().toLowerCase());
    if (!parsed.success) return fail('Nom de domaine invalide');

    const existing = await prisma.sendingDomain.findUnique({
      where: { workspaceId_domain: { workspaceId: ctx.workspaceId, domain: parsed.data } },
    });
    if (existing) return fail('Ce domaine est déjà enregistré.');

    const inspection = await inspectDomain(parsed.data);
    const domain = await prisma.sendingDomain.create({
      data: {
        workspaceId: ctx.workspaceId,
        domain: parsed.data,
        spf: inspection.spf, dkim: inspection.dkim, dmarc: inspection.dmarc,
        spfRecord: inspection.spfRecord, dmarcRecord: inspection.dmarcRecord, dkimRecord: inspection.dkimRecord,
        lastCheckedAt: new Date(),
        notes: inspection.notes.join('\n'),
      },
    });
    revalidatePath('/deliverability');
    return ok({ id: domain.id });
  });
}
