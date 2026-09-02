'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { buildRecipients, dispatchCampaignBatch } from '../services/sending';
import { evaluateCampaignReadiness } from '../services/readiness';
import { enqueue } from '../services/queue';
import { contactVariables, renderTemplate } from '../services/personalization';
import { generateCampaignEmail, rewriteEmail, type EmailStyle } from '../ai/email-writer';
import { segmentContactWhere } from '../services/segments';
import { INSURANCE_TYPES, CAMPAIGN_OBJECTIVE_LIST } from '@/lib/domain';
import { appUrl } from '@/lib/config';

const campaignSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(120),
  objective: z.enum(CAMPAIGN_OBJECTIVE_LIST as [string, ...string[]]),
  product: z.enum(INSURANCE_TYPES as [string, ...string[]]),
  segmentId: z.string().optional().nullable(),
  emailAccountId: z.string().optional().nullable(),
  landingPageId: z.string().optional().nullable(),
  locale: z.enum(['fr', 'en']).default('fr'),
  scheduledAt: z.string().optional().nullable(),
  trackOpens: z.boolean().default(false),
  trackClicks: z.boolean().default(true),
  batchSize: z.coerce.number().int().min(10).max(5000).default(200),
  batchIntervalMinutes: z.coerce.number().int().min(1).max(1440).default(10),
  dailyCap: z.coerce.number().int().min(10).max(100000).default(2000),
  abEnabled: z.boolean().default(false),
  abDimension: z.string().optional().nullable(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(20).default('A'),
  weight: z.coerce.number().int().min(0).max(100).default(100),
  subject: z.string().min(2, 'Objet requis').max(200),
  previewText: z.string().max(200).default(''),
  bodyText: z.string().min(10, 'Corps du message trop court'),
  ctaLabel: z.string().min(2).max(60).default('Demander mon devis'),
  isControl: z.boolean().default(true),
});

export async function createCampaignAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:write');
    const parsed = campaignSchema.partial({ objective: true, product: true }).safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: parsed.data.name,
        objective: (parsed.data.objective ?? 'QUOTE_REQUEST') as 'QUOTE_REQUEST',
        product: (parsed.data.product ?? 'AUTO') as 'AUTO',
        locale: parsed.data.locale ?? 'fr',
        status: 'DRAFT',
        createdById: ctx.user.id,
      },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.create',
      entityType: 'Campaign', entityId: campaign.id, summary: campaign.name,
    });
    revalidatePath('/campaigns');
    return ok({ id: campaign.id });
  });
}

export async function updateCampaignAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:write');
    const parsed = campaignSchema.partial().safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const existing = await prisma.campaign.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return fail('Campagne introuvable');
    if (['SENDING', 'COMPLETED'].includes(existing.status)) {
      return fail("Une campagne en cours d'envoi ou terminée ne peut plus être modifiée. Mettez-la en pause d'abord.");
    }

    const d = parsed.data;
    await prisma.campaign.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.objective !== undefined ? { objective: d.objective as 'QUOTE_REQUEST' } : {}),
        ...(d.product !== undefined ? { product: d.product as 'AUTO' } : {}),
        ...(d.segmentId !== undefined ? { segmentId: d.segmentId || null } : {}),
        ...(d.emailAccountId !== undefined ? { emailAccountId: d.emailAccountId || null } : {}),
        ...(d.landingPageId !== undefined ? { landingPageId: d.landingPageId || null } : {}),
        ...(d.locale !== undefined ? { locale: d.locale } : {}),
        ...(d.scheduledAt !== undefined ? { scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null } : {}),
        ...(d.trackOpens !== undefined ? { trackOpens: d.trackOpens } : {}),
        ...(d.trackClicks !== undefined ? { trackClicks: d.trackClicks } : {}),
        ...(d.batchSize !== undefined ? { batchSize: d.batchSize } : {}),
        ...(d.batchIntervalMinutes !== undefined ? { batchIntervalMinutes: d.batchIntervalMinutes } : {}),
        ...(d.dailyCap !== undefined ? { dailyCap: d.dailyCap } : {}),
        ...(d.abEnabled !== undefined ? { abEnabled: d.abEnabled } : {}),
        ...(d.abDimension !== undefined ? { abDimension: d.abDimension || null } : {}),
      },
    });
    revalidatePath(`/campaigns/${id}`);
    return ok({ id });
  });
}

export async function saveVariantsAction(campaignId: string, raw: unknown): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:write');
    const parsed = z.array(variantSchema).min(1).max(4).safeParse(raw);
    if (!parsed.success) return fail('Contenu invalide');

    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    if (campaign.status === 'SENDING') return fail("Impossible de modifier le contenu d'une campagne en cours d'envoi.");

    const keepIds = parsed.data.map((v) => v.id).filter(Boolean) as string[];
    await prisma.campaignVariant.deleteMany({ where: { campaignId, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } });

    for (const [i, v] of parsed.data.entries()) {
      const data = {
        label: v.label || String.fromCharCode(65 + i),
        weight: v.weight,
        subject: v.subject,
        previewText: v.previewText,
        bodyText: v.bodyText,
        ctaLabel: v.ctaLabel,
        isControl: i === 0,
      };
      if (v.id) await prisma.campaignVariant.update({ where: { id: v.id }, data });
      else await prisma.campaignVariant.create({ data: { ...data, campaignId } });
    }
    revalidatePath(`/campaigns/${campaignId}`);
    return ok({ count: parsed.data.length });
  });
}

export async function checkReadinessAction(campaignId: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:read');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    const report = await evaluateCampaignReadiness(campaignId);
    return ok(report);
  });
}

/** Renders the campaign email exactly as three real recipients would receive it. */
export async function previewRecipientsAction(campaignId: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:read');
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId: ctx.workspaceId },
      include: { variants: true },
    });
    if (!campaign) return fail('Campagne introuvable');
    const variant = campaign.variants[0];
    if (!variant) return fail("Aucun contenu d'email à prévisualiser");
    if (!campaign.segmentId) return fail('Aucun segment sélectionné');

    const where = await segmentContactWhere(ctx.workspaceId, campaign.segmentId);
    if (!where) return fail('Segment introuvable');

    const contacts = await prisma.contact.findMany({ where, take: 3, orderBy: { updatedAt: 'desc' } });
    const previews = contacts.map((c) => {
      const vars = contactVariables(c, campaign.locale === 'en' ? 'en' : 'fr');
      return {
        email: c.email,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || '—',
        subject: renderTemplate(variant.subject, vars),
        previewText: renderTemplate(variant.previewText, vars),
        bodyText: renderTemplate(variant.bodyText, vars).replace('[[CTA]]', `[ ${renderTemplate(variant.ctaLabel, vars)} ]`),
      };
    });
    return ok({ previews, ctaUrlExample: `${appUrl()}/c/<jeton-unique-par-destinataire>` });
  });
}

/**
 * Explicit launch. A campaign never starts sending as a side effect of being
 * created, edited or scheduled — only this action moves it to SENDING.
 */
export async function launchCampaignAction(campaignId: string, options?: { force?: boolean }): Promise<ActionResult<{ recipients: number; scheduled: boolean }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:launch');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    if (!['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status)) {
      return fail(`Cette campagne est déjà au statut « ${campaign.status} ».`);
    }

    const report = await evaluateCampaignReadiness(campaignId);
    if (report.blocking.length > 0 && !options?.force) {
      return fail(`Lancement bloqué : ${report.blocking.map((b) => b.label).join(', ')}.`);
    }
    // `force` can only bypass warnings, never a hard structural failure.
    const hardBlocks = report.blocking.filter((b) => ['sender', 'content', 'landing', 'form', 'form_contact', 'audience_size', 'duplicates'].includes(b.key));
    if (hardBlocks.length > 0) {
      return fail(`Lancement impossible : ${hardBlocks.map((b) => b.label).join(', ')}.`);
    }

    const { total } = await buildRecipients(campaignId);

    const scheduled = !!campaign.scheduledAt && campaign.scheduledAt > new Date();
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: scheduled ? 'SCHEDULED' : 'SENDING',
        startedAt: scheduled ? null : new Date(),
        launchedAt: new Date(),
        launchedById: ctx.user.id,
      },
    });

    if (scheduled) {
      // At the scheduled moment, flip to SENDING and start dispatching.
      await enqueue('campaign.dispatch', { campaignId }, {
        workspaceId: ctx.workspaceId,
        runAt: campaign.scheduledAt!,
        dedupeKey: `dispatch:${campaignId}:scheduled`,
      });
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SCHEDULED' } });
    } else {
      await enqueue('campaign.dispatch', { campaignId }, {
        workspaceId: ctx.workspaceId,
        dedupeKey: `dispatch:${campaignId}:initial`,
      });
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.launch',
      entityType: 'Campaign', entityId: campaignId,
      summary: `« ${campaign.name} » lancée — ${total} destinataire(s), score ${report.score}/100`,
      after: { recipients: total, readiness: report.score, forced: !!options?.force },
    });

    revalidatePath('/campaigns');
    revalidatePath(`/campaigns/${campaignId}`);
    return ok({ recipients: total, scheduled });
  });
}

export async function pauseCampaignAction(campaignId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:launch');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
    await prisma.campaignRecipient.updateMany({ where: { campaignId, status: 'QUEUED' }, data: { status: 'PENDING' } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.pause',
      entityType: 'Campaign', entityId: campaignId, summary: campaign.name,
    });
    revalidatePath(`/campaigns/${campaignId}`);
    return ok(null);
  });
}

export async function resumeCampaignAction(campaignId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:launch');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    if (campaign.status !== 'PAUSED') return fail('Seule une campagne en pause peut être reprise.');
    if (!campaign.launchedAt) return fail("Cette campagne n'a jamais été lancée.");
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING' } });
    await enqueue('campaign.dispatch', { campaignId }, { workspaceId: ctx.workspaceId, dedupeKey: `dispatch:${campaignId}:resume:${Date.now()}` });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.resume', entityType: 'Campaign', entityId: campaignId, summary: campaign.name });
    revalidatePath(`/campaigns/${campaignId}`);
    return ok(null);
  });
}

export async function cancelCampaignAction(campaignId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:launch');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED', completedAt: new Date() } });
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } },
      data: { status: 'CANCELLED', skipReason: 'Campagne annulée' },
    });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.cancel', entityType: 'Campaign', entityId: campaignId, summary: campaign.name });
    revalidatePath(`/campaigns/${campaignId}`);
    return ok(null);
  });
}

export async function deleteCampaignAction(campaignId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:write');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    if (campaign.status === 'SENDING') return fail("Mettez la campagne en pause avant de la supprimer.");
    await prisma.campaign.delete({ where: { id: campaignId } });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'campaign.delete', entityType: 'Campaign', entityId: campaignId, summary: campaign.name });
    revalidatePath('/campaigns');
    return ok(null);
  });
}

/** Processes one dispatch tick immediately — used by the UI when no worker runs. */
export async function tickCampaignAction(campaignId: string): Promise<ActionResult<{ queued: number; done: boolean }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('campaigns:launch');
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
    if (!campaign) return fail('Campagne introuvable');
    const result = await dispatchCampaignBatch(campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    return ok({ queued: result.queued, done: result.done });
  });
}

export async function generateEmailAction(params: {
  campaignId: string;
  style: EmailStyle;
  instructions?: string;
}) {
  return guard(async () => {
    const ctx = await requireWorkspace('ai:use');
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.campaignId, workspaceId: ctx.workspaceId },
      include: { segment: true },
    });
    if (!campaign) return fail('Campagne introuvable');

    const generated = await generateCampaignEmail({
      workspaceId: ctx.workspaceId,
      companyName: ctx.workspaceName,
      product: campaign.product,
      objective: campaign.objective,
      style: params.style,
      audienceDescription: campaign.segment ? `${campaign.segment.name} — ${campaign.segment.description}` : undefined,
      extraInstructions: params.instructions,
      locale: campaign.locale === 'en' ? 'en' : 'fr',
    });
    return ok(generated);
  });
}

export async function rewriteEmailAction(params: { campaignId: string; instruction: string }) {
  return guard(async () => {
    const ctx = await requireWorkspace('ai:use');
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.campaignId, workspaceId: ctx.workspaceId },
      include: { variants: true },
    });
    if (!campaign) return fail('Campagne introuvable');
    const variant = campaign.variants[0];
    if (!variant) return fail('Aucun contenu à réécrire');

    const { insuranceLabel } = await import('@/lib/domain');
    const result = await rewriteEmail({
      workspaceId: ctx.workspaceId,
      subject: variant.subject,
      bodyText: variant.bodyText,
      instruction: params.instruction,
      productLabel: insuranceLabel(campaign.product),
    });
    return ok(result);
  });
}
