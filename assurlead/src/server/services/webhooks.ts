import 'server-only';
import crypto from 'crypto';
import type { CampaignEventType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/utils';
import { addSuppression } from './suppression';
import { runAutomations } from './automations';

/**
 * Provider webhook ingestion.
 *
 * Two guarantees:
 *  - Signatures are verified where the provider supports them.
 *  - Every event carries a deterministic dedupeKey, so a redelivered webhook is
 *    a no-op rather than a duplicate activity row.
 */

export type NormalizedEvent = {
  type: CampaignEventType;
  email: string;
  providerMessageId?: string;
  occurredAt: Date;
  /** Provider's own event id when available — the strongest dedupe signal. */
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export function verifySignature(provider: string, rawBody: string, headers: Headers, secret: string): boolean {
  if (!secret) return false;
  switch (provider) {
    case 'brevo': {
      // Brevo signs with a shared token header.
      const token = headers.get('x-sib-token') ?? headers.get('x-mailin-custom') ?? '';
      return timingSafeEqual(token, secret);
    }
    case 'mailgun': {
      const timestamp = headers.get('x-mailgun-timestamp') ?? '';
      const token = headers.get('x-mailgun-token') ?? '';
      const signature = headers.get('x-mailgun-signature') ?? '';
      if (!timestamp || !token || !signature) {
        // Mailgun also nests the signature inside the JSON body.
        try {
          const body = JSON.parse(rawBody) as { signature?: { timestamp: string; token: string; signature: string } };
          if (!body.signature) return false;
          const expected = crypto.createHmac('sha256', secret)
            .update(body.signature.timestamp + body.signature.token)
            .digest('hex');
          return timingSafeEqual(expected, body.signature.signature);
        } catch {
          return false;
        }
      }
      const expected = crypto.createHmac('sha256', secret).update(timestamp + token).digest('hex');
      return timingSafeEqual(expected, signature);
    }
    case 'postmark': {
      const token = headers.get('x-postmark-token') ?? '';
      return timingSafeEqual(token, secret);
    }
    case 'ses': {
      // SNS messages are validated by the shared secret in the subscription URL.
      const token = headers.get('x-assurlead-token') ?? '';
      return timingSafeEqual(token, secret);
    }
    default: {
      const signature = headers.get('x-assurlead-signature') ?? '';
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return timingSafeEqual(expected, signature);
    }
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const BREVO_MAP: Record<string, CampaignEventType> = {
  delivered: 'DELIVERED', hard_bounce: 'BOUNCED', soft_bounce: 'SOFT_BOUNCED',
  click: 'CLICKED', opened: 'OPENED', unique_opened: 'OPENED',
  spam: 'COMPLAINT', unsubscribed: 'UNSUBSCRIBED', blocked: 'BOUNCED',
  invalid_email: 'BOUNCED', deferred: 'SOFT_BOUNCED', error: 'FAILED',
};

const MAILGUN_MAP: Record<string, CampaignEventType> = {
  delivered: 'DELIVERED', failed: 'BOUNCED', clicked: 'CLICKED',
  opened: 'OPENED', complained: 'COMPLAINT', unsubscribed: 'UNSUBSCRIBED',
};

const POSTMARK_MAP: Record<string, CampaignEventType> = {
  Delivery: 'DELIVERED', Bounce: 'BOUNCED', SpamComplaint: 'COMPLAINT',
  Open: 'OPENED', Click: 'CLICKED', SubscriptionChange: 'UNSUBSCRIBED',
};

export function normalizeEvents(provider: string, body: unknown): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const list = Array.isArray(body) ? body : [body];

  for (const raw of list) {
    const e = raw as Record<string, unknown>;
    try {
      if (provider === 'brevo') {
        const type = BREVO_MAP[String(e.event ?? '')];
        if (!type) continue;
        events.push({
          type,
          email: String(e.email ?? ''),
          providerMessageId: e['message-id'] ? String(e['message-id']) : undefined,
          externalId: e.id ? String(e.id) : undefined,
          occurredAt: e.date ? new Date(String(e.date)) : new Date(),
          metadata: { provider, reason: e.reason ?? null },
        });
      } else if (provider === 'mailgun') {
        const data = (e['event-data'] ?? e) as Record<string, unknown>;
        const type = MAILGUN_MAP[String(data.event ?? '')];
        if (!type) continue;
        const recipient = String(data.recipient ?? '');
        const severity = String((data as { severity?: string }).severity ?? '');
        events.push({
          type: type === 'BOUNCED' && severity === 'temporary' ? 'SOFT_BOUNCED' : type,
          email: recipient,
          providerMessageId: (data.message as { headers?: { 'message-id'?: string } })?.headers?.['message-id'],
          externalId: data.id ? String(data.id) : undefined,
          occurredAt: data.timestamp ? new Date(Number(data.timestamp) * 1000) : new Date(),
          metadata: { provider, severity },
        });
      } else if (provider === 'postmark') {
        const type = POSTMARK_MAP[String(e.RecordType ?? '')];
        if (!type) continue;
        const isSuppression = e.RecordType === 'SubscriptionChange' && e.SuppressSending === true;
        events.push({
          type: e.RecordType === 'SubscriptionChange' && !isSuppression ? 'DELIVERED' : type,
          email: String(e.Recipient ?? e.Email ?? ''),
          providerMessageId: e.MessageID ? String(e.MessageID) : undefined,
          externalId: e.ID ? String(e.ID) : undefined,
          occurredAt: e.DeliveredAt || e.BouncedAt || e.ReceivedAt ? new Date(String(e.DeliveredAt ?? e.BouncedAt ?? e.ReceivedAt)) : new Date(),
          metadata: { provider, type: e.Type ?? null },
        });
      } else if (provider === 'ses') {
        const message = typeof e.Message === 'string' ? (JSON.parse(e.Message) as Record<string, unknown>) : e;
        const notificationType = String(message.eventType ?? message.notificationType ?? '');
        const mail = (message.mail ?? {}) as { messageId?: string; destination?: string[] };
        const map: Record<string, CampaignEventType> = {
          Delivery: 'DELIVERED', Bounce: 'BOUNCED', Complaint: 'COMPLAINT',
          Open: 'OPENED', Click: 'CLICKED',
        };
        const type = map[notificationType];
        if (!type) continue;
        const bounce = message.bounce as { bounceType?: string } | undefined;
        events.push({
          type: type === 'BOUNCED' && bounce?.bounceType === 'Transient' ? 'SOFT_BOUNCED' : type,
          email: String(mail.destination?.[0] ?? ''),
          providerMessageId: mail.messageId,
          occurredAt: new Date(),
          metadata: { provider, bounceType: bounce?.bounceType ?? null },
        });
      }
    } catch {
      // Malformed payload entry — skip it rather than failing the batch.
    }
  }

  return events.filter((e) => e.email);
}

export type IngestResult = { processed: number; duplicates: number; unmatched: number };

export async function ingestEvents(workspaceId: string, provider: string, events: NormalizedEvent[]): Promise<IngestResult> {
  const result: IngestResult = { processed: 0, duplicates: 0, unmatched: 0 };

  for (const event of events) {
    const emailNormalized = normalizeEmail(event.email);

    // Resolve the recipient by provider message id first, then by address.
    let recipient = event.providerMessageId
      ? await prisma.campaignRecipient.findFirst({
          where: { providerMessageId: event.providerMessageId, campaign: { workspaceId } },
          select: { id: true, campaignId: true, contactId: true, variantId: true },
        })
      : null;

    if (!recipient) {
      recipient = await prisma.campaignRecipient.findFirst({
        where: { contact: { workspaceId, emailNormalized }, status: 'SENT' },
        orderBy: { sentAt: 'desc' },
        select: { id: true, campaignId: true, contactId: true, variantId: true },
      });
    }

    const contact = recipient
      ? null
      : await prisma.contact.findUnique({
          where: { workspaceId_emailNormalized: { workspaceId, emailNormalized } },
          select: { id: true },
        });

    if (!recipient && !contact) {
      result.unmatched += 1;
      continue;
    }

    const dedupeKey = event.externalId
      ? `wh:${provider}:${event.externalId}`
      : `wh:${provider}:${event.type}:${recipient?.id ?? contact?.id}:${event.occurredAt.toISOString().slice(0, 16)}`;

    try {
      await prisma.campaignEvent.create({
        data: {
          workspaceId,
          campaignId: recipient?.campaignId ?? null,
          recipientId: recipient?.id ?? null,
          contactId: recipient?.contactId ?? contact?.id ?? null,
          variantId: recipient?.variantId ?? null,
          type: event.type,
          dedupeKey,
          occurredAt: event.occurredAt,
          metadata: (event.metadata ?? {}) as never,
        },
      });
      result.processed += 1;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        result.duplicates += 1;
        continue; // exact same event already recorded — nothing further to do
      }
      throw err;
    }

    // Side effects, applied only on the first (non-duplicate) delivery.
    if (event.type === 'BOUNCED') {
      if (recipient) {
        await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'BOUNCED' } });
      }
      await prisma.emailAccount.updateMany({
        where: { workspaceId, campaigns: { some: { id: recipient?.campaignId ?? '' } } },
        data: { bounceCount: { increment: 1 } },
      });
      await addSuppression({ workspaceId, email: event.email, reason: 'HARD_BOUNCE', source: `webhook:${provider}` });
      await runAutomations('HARD_BOUNCE', { workspaceId, email: event.email, contactId: recipient?.contactId ?? contact?.id });
    } else if (event.type === 'COMPLAINT') {
      await addSuppression({ workspaceId, email: event.email, reason: 'COMPLAINT', source: `webhook:${provider}` });
    } else if (event.type === 'UNSUBSCRIBED') {
      await addSuppression({ workspaceId, email: event.email, reason: 'UNSUBSCRIBED', source: `webhook:${provider}` });
      await runAutomations('UNSUBSCRIBE', { workspaceId, email: event.email, contactId: recipient?.contactId ?? contact?.id });
    }
  }

  return result;
}
