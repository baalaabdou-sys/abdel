import 'server-only';
import crypto from 'crypto';
import type { CompliancePolicy, VerificationStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getEmailProvider } from '../providers/email';
import { renderCampaignEmail } from './email-render';
import { contactVariables, renderTemplate } from './personalization';
import { enqueue } from './queue';
import { appUrl } from '@/lib/config';

/**
 * The sending pipeline.
 *
 * Invariants enforced here (and covered by tests in `tests/`):
 *  1. A suppressed address is never sent to — re-checked at send time.
 *  2. An INVALID address is never sent to.
 *  3. A retried job never sends twice — the recipient row is claimed with a
 *     conditional update before the provider call.
 *  4. Nothing is ever sent for a campaign that was not explicitly launched.
 */

export const VERIFICATION_HARD_BLOCK: VerificationStatus[] = ['INVALID'];

export function verificationAllowed(status: VerificationStatus, policy: CompliancePolicy): boolean {
  if (status === 'INVALID') return false;
  if (status === 'CATCH_ALL') return policy.allowCatchAll;
  if (status === 'RISKY') return policy.allowRisky;
  if (status === 'UNVERIFIED' || status === 'UNKNOWN') return policy.allowUnverified;
  return true;
}

export type EligibilityIssue =
  | 'SUPPRESSED' | 'UNSUBSCRIBED' | 'INVALID_EMAIL' | 'VERIFICATION_BLOCKED'
  | 'CONSENT_UNKNOWN' | 'CONSENT_DENIED' | 'MISSING_SOURCE' | 'MARKETING_NOT_ALLOWED';

export type EligibilityBreakdown = {
  eligible: number;
  total: number;
  issues: Record<EligibilityIssue, number>;
};

/**
 * Evaluates a campaign audience against the workspace's configurable policy.
 * The policy is data, not hardcoded law: the workspace decides which situations
 * merely warn and which exclude a contact.
 */
export async function evaluateAudience(
  workspaceId: string,
  where: object,
  policy: CompliancePolicy,
): Promise<EligibilityBreakdown> {
  const issues: Record<EligibilityIssue, number> = {
    SUPPRESSED: 0, UNSUBSCRIBED: 0, INVALID_EMAIL: 0, VERIFICATION_BLOCKED: 0,
    CONSENT_UNKNOWN: 0, CONSENT_DENIED: 0, MISSING_SOURCE: 0, MARKETING_NOT_ALLOWED: 0,
  };

  const base = where as Record<string, unknown>;
  const total = await prisma.contact.count({ where: base });

  const [suppressed, unsubscribed, invalid, consentUnknown, consentDenied, missingSource, marketingBlocked] =
    await Promise.all([
      prisma.contact.count({ where: { ...base, suppressed: true } }),
      prisma.contact.count({ where: { ...base, unsubscribed: true } }),
      prisma.contact.count({ where: { ...base, verificationStatus: 'INVALID' } }),
      prisma.contact.count({ where: { ...base, consentEmail: 'UNKNOWN' } }),
      prisma.contact.count({ where: { ...base, consentEmail: { in: ['DENIED', 'WITHDRAWN'] } } }),
      prisma.contact.count({ where: { ...base, OR: [{ source: null }, { source: '' }] } }),
      prisma.contact.count({ where: { ...base, emailMarketingAllowed: false } }),
    ]);

  issues.SUPPRESSED = suppressed;
  issues.UNSUBSCRIBED = unsubscribed;
  issues.INVALID_EMAIL = invalid;
  issues.CONSENT_UNKNOWN = consentUnknown;
  issues.CONSENT_DENIED = consentDenied;
  issues.MISSING_SOURCE = missingSource;
  issues.MARKETING_NOT_ALLOWED = marketingBlocked;

  const blockedStatuses: VerificationStatus[] = (['CATCH_ALL', 'RISKY', 'UNVERIFIED', 'UNKNOWN'] as VerificationStatus[])
    .filter((s) => !verificationAllowed(s, policy));
  issues.VERIFICATION_BLOCKED = blockedStatuses.length
    ? await prisma.contact.count({ where: { ...base, verificationStatus: { in: blockedStatuses } } })
    : 0;

  const eligible = await prisma.contact.count({ where: eligibilityWhere(base, policy) });
  return { eligible, total, issues };
}

/** The filter that decides who actually receives a campaign email. */
export function eligibilityWhere(base: Record<string, unknown>, policy: CompliancePolicy): Record<string, unknown> {
  const blockedStatuses: VerificationStatus[] = (
    ['INVALID', 'CATCH_ALL', 'RISKY', 'UNVERIFIED', 'UNKNOWN'] as VerificationStatus[]
  ).filter((s) => !verificationAllowed(s, policy));

  const and: Record<string, unknown>[] = [
    { suppressed: false },
    { unsubscribed: false },
    { verificationStatus: { notIn: blockedStatuses } },
  ];

  if (policy.requireExplicitConsent) {
    and.push({ emailMarketingAllowed: true });
    and.push({ consentEmail: policy.allowUnknownConsent ? { in: ['GRANTED', 'UNKNOWN'] } : 'GRANTED' });
  } else {
    and.push({ consentEmail: { notIn: ['DENIED', 'WITHDRAWN'] } });
  }
  if (policy.requireSourceRecorded) {
    and.push({ NOT: { OR: [{ source: null }, { source: '' }] } });
  }

  return { ...base, AND: and };
}

function sendKeyFor(campaignId: string, contactId: string) {
  return crypto.createHash('sha256').update(`${campaignId}:${contactId}`).digest('hex');
}

function trackingToken() {
  return crypto.randomBytes(18).toString('base64url');
}

/**
 * Materialises the recipient list for a campaign. Idempotent: re-running only
 * adds recipients that do not exist yet, and never resurrects sent ones.
 */
export async function buildRecipients(campaignId: string): Promise<{ created: number; total: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { workspace: { include: { policy: true } }, variants: true },
  });
  if (!campaign) throw new Error('Campagne introuvable');
  if (!campaign.segmentId) throw new Error('Aucun segment sélectionné');

  const policy = campaign.workspace.policy ?? (await prisma.compliancePolicy.create({ data: { workspaceId: campaign.workspaceId } }));
  const { segmentContactWhere } = await import('./segments');
  const segWhere = await segmentContactWhere(campaign.workspaceId, campaign.segmentId);
  if (!segWhere) throw new Error('Segment introuvable');

  const where = eligibilityWhere(segWhere as Record<string, unknown>, policy);
  const variants = campaign.variants.length > 0 ? campaign.variants : [];

  let created = 0;
  let cursor: string | undefined;
  const CHUNK = 1000;

  // Streamed in chunks — a 100k-contact segment never lands in memory at once.
  for (;;) {
    const batch = await prisma.contact.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
      take: CHUNK,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    const rows = batch.map((c, i) => ({
      campaignId,
      contactId: c.id,
      variantId: variants.length ? assignVariant(variants, `${campaignId}:${c.id}`, i) : null,
      sendKey: sendKeyFor(campaignId, c.id),
      trackingToken: trackingToken(),
      status: 'PENDING' as const,
    }));
    const res = await prisma.campaignRecipient.createMany({ data: rows, skipDuplicates: true });
    created += res.count;
    if (batch.length < CHUNK) break;
  }

  const total = await prisma.campaignRecipient.count({ where: { campaignId } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { recipientCount: total } });
  return { created, total };
}

/** Deterministic weighted variant assignment — stable across re-runs. */
function assignVariant(variants: { id: string; weight: number }[], key: string, index: number): string {
  const totalWeight = variants.reduce((s, v) => s + Math.max(0, v.weight), 0) || variants.length;
  const hash = crypto.createHash('md5').update(key).digest();
  const bucket = ((hash.readUInt32BE(0) % 10_000) / 10_000) * totalWeight;
  let acc = 0;
  for (const v of variants) {
    acc += Math.max(0, v.weight) || 1;
    if (bucket < acc) return v.id;
  }
  return variants[index % variants.length].id;
}

/**
 * Dispatch tick: enqueues one batch of individual send jobs, honouring the
 * campaign batch size, the account's daily/hourly caps and warm-up ramp.
 * Re-schedules itself until the campaign is drained.
 */
export async function dispatchCampaignBatch(campaignId: string): Promise<{ queued: number; done: boolean; reason?: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { emailAccount: true },
  });
  if (!campaign) return { queued: 0, done: true, reason: 'not_found' };

  // Nothing is ever sent unless the campaign was explicitly launched.
  if (campaign.status !== 'SENDING') {
    return { queued: 0, done: campaign.status !== 'SCHEDULED', reason: `status_${campaign.status}` };
  }
  if (!campaign.emailAccount || !campaign.emailAccount.active) {
    return { queued: 0, done: false, reason: 'no_account' };
  }

  const account = campaign.emailAccount;
  const remainingToday = await remainingDailyCapacity(account.id);
  if (remainingToday <= 0) {
    // Resume tomorrow morning.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    await enqueue('campaign.dispatch', { campaignId }, {
      workspaceId: campaign.workspaceId,
      runAt: tomorrow,
      dedupeKey: `dispatch:${campaignId}:${tomorrow.toISOString().slice(0, 13)}`,
    });
    return { queued: 0, done: false, reason: 'daily_cap' };
  }

  const take = Math.min(campaign.batchSize, remainingToday, campaign.dailyCap);
  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: 'PENDING' },
    select: { id: true },
    take,
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) {
    const remaining = await prisma.campaignRecipient.count({ where: { campaignId, status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] } } });
    if (remaining === 0) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await prisma.notification.create({
        data: {
          workspaceId: campaign.workspaceId,
          level: 'SUCCESS',
          type: 'CAMPAIGN_COMPLETED',
          title: 'Campagne terminée',
          body: `« ${campaign.name} » a terminé son envoi.`,
          link: `/campaigns/${campaign.id}`,
          dedupeKey: `campaign_completed:${campaign.id}`,
        },
      }).catch(() => undefined);
      return { queued: 0, done: true };
    }
    return { queued: 0, done: false, reason: 'in_flight' };
  }

  await prisma.campaignRecipient.updateMany({
    where: { id: { in: pending.map((p) => p.id) }, status: 'PENDING' },
    data: { status: 'QUEUED', scheduledAt: new Date() },
  });

  for (const r of pending) {
    await enqueue('campaign.send_recipient', { recipientId: r.id }, {
      workspaceId: campaign.workspaceId,
      dedupeKey: `send:${r.id}`,
      maxAttempts: 3,
    });
  }

  // Gradual sending: next batch after the configured interval.
  const nextRun = new Date(Date.now() + Math.max(1, campaign.batchIntervalMinutes) * 60_000);
  await enqueue('campaign.dispatch', { campaignId }, {
    workspaceId: campaign.workspaceId,
    runAt: nextRun,
    dedupeKey: `dispatch:${campaignId}:${nextRun.toISOString().slice(0, 16)}`,
  });

  return { queued: pending.length, done: false };
}

async function remainingDailyCapacity(accountId: string): Promise<number> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = account.sentTodayDate && account.sentTodayDate >= today ? account.sentToday : 0;

  let limit = account.dailyLimit;
  if (account.warmupEnabled && account.warmupStartAt) {
    const days = Math.floor((Date.now() - account.warmupStartAt.getTime()) / 86_400_000);
    limit = Math.min(account.dailyLimit, account.warmupStartLimit + days * account.warmupIncrement);
  }
  return Math.max(0, limit - sentToday);
}

export type SendOutcome = { status: 'SENT' | 'SKIPPED' | 'SUPPRESSED' | 'FAILED' | 'ALREADY_SENT'; detail?: string; simulated?: boolean };

/**
 * Sends one recipient. Safe to call twice: the recipient is claimed with a
 * conditional update, so a retried job observes ALREADY_SENT instead of
 * re-delivering.
 */
export async function sendRecipient(recipientId: string): Promise<SendOutcome> {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: {
      contact: true,
      variant: true,
      campaign: { include: { emailAccount: true, workspace: { include: { policy: true } }, landingPage: true, variants: true } },
    },
  });
  if (!recipient) return { status: 'FAILED', detail: 'Destinataire introuvable' };
  if (['SENT', 'BOUNCED'].includes(recipient.status)) return { status: 'ALREADY_SENT' };

  const { campaign, contact } = recipient;
  if (campaign.status !== 'SENDING') {
    return { status: 'SKIPPED', detail: `Campagne en statut ${campaign.status}` };
  }

  // ── Invariant re-checks at send time ───────────────────────────
  const suppression = await prisma.suppressionEntry.findUnique({
    where: { workspaceId_emailNormalized: { workspaceId: campaign.workspaceId, emailNormalized: contact.emailNormalized } },
    select: { id: true, reason: true },
  });
  if (suppression || contact.suppressed || contact.unsubscribed) {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'SUPPRESSED', skipReason: `Suppression (${suppression?.reason ?? 'contact'})` },
    });
    return { status: 'SUPPRESSED', detail: 'Adresse sur la liste de suppression' };
  }
  if (contact.verificationStatus === 'INVALID') {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'SKIPPED', skipReason: 'Adresse email invalide' },
    });
    return { status: 'SKIPPED', detail: 'Adresse invalide' };
  }
  const policy = campaign.workspace.policy;
  if (policy && !verificationAllowed(contact.verificationStatus, policy)) {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'SKIPPED', skipReason: `Statut de vérification exclu (${contact.verificationStatus})` },
    });
    return { status: 'SKIPPED', detail: 'Statut de vérification exclu par la politique' };
  }

  const account = campaign.emailAccount;
  if (!account) return { status: 'FAILED', detail: "Aucun compte d'envoi configuré" };

  // ── Claim: only one worker may proceed past this point ─────────
  const claim = await prisma.campaignRecipient.updateMany({
    where: { id: recipientId, status: { in: ['PENDING', 'QUEUED'] } },
    data: { status: 'PROCESSING' },
  });
  if (claim.count === 0) return { status: 'ALREADY_SENT' };

  const variant = recipient.variant ?? campaign.variants[0];
  if (!variant) {
    await prisma.campaignRecipient.update({ where: { id: recipientId }, data: { status: 'FAILED', error: 'Aucun contenu email' } });
    return { status: 'FAILED', detail: 'Aucun contenu email' };
  }

  const base = appUrl();
  const vars = contactVariables(contact, campaign.locale === 'en' ? 'en' : 'fr');
  const subject = renderTemplate(variant.subject, vars);
  const bodyText = renderTemplate(variant.bodyText || variant.bodyHtml, vars);
  const ctaUrl = `${base}/c/${recipient.trackingToken}`;
  const unsubscribeUrl = `${base}/u/${recipient.trackingToken}`;

  const { html, text } = renderCampaignEmail({
    bodyText,
    ctaLabel: renderTemplate(variant.ctaLabel, vars),
    ctaUrl,
    unsubscribeUrl,
    senderName: account.fromName,
    companyName: campaign.workspace.name,
    legalNotice: policy?.legalNotice || undefined,
    privacyUrl: policy?.privacyUrl || undefined,
    logoUrl: campaign.workspace.logoUrl,
    trackingPixelUrl: campaign.trackOpens ? `${base}/api/track/open/${recipient.trackingToken}` : null,
  });

  try {
    const provider = getEmailProvider(account);
    const result = await provider.send({
      to: contact.email,
      toName: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || undefined,
      from: account.fromEmail,
      fromName: account.fromName,
      replyTo: account.replyTo ?? undefined,
      subject,
      html,
      text,
      idempotencyKey: recipient.sendKey,
      listUnsubscribeUrl: unsubscribeUrl,
    });

    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.providerMessageId, error: null },
      }),
      prisma.campaignEvent.create({
        data: {
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          recipientId,
          contactId: contact.id,
          variantId: variant.id,
          type: 'SENT',
          dedupeKey: `sent:${recipientId}`,
          metadata: { provider: provider.name, simulated: result.simulated } as never,
        },
      }),
      prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          sentTotal: { increment: 1 },
          sentToday: account.sentTodayDate && isToday(account.sentTodayDate) ? { increment: 1 } : 1,
          sentTodayDate: new Date(),
          lastSyncAt: new Date(),
        },
      }),
      prisma.apiUsage.create({
        data: {
          workspaceId: campaign.workspaceId,
          kind: 'EMAIL_SEND',
          provider: provider.name,
          quantity: 1,
          periodMonth: new Date().toISOString().slice(0, 7),
        },
      }),
    ]);

    return { status: 'SENT', simulated: result.simulated };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur d’envoi';
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      // Back to PENDING so the queue's retry can pick it up again.
      data: { status: 'PENDING', error: message.slice(0, 500), failedAt: new Date(), attempts: { increment: 1 } },
    });
    throw err;
  }
}

function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
