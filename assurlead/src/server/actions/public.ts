'use server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { guard, ok, fail, type ActionResult } from '../context';
import { addSuppression } from '../services/suppression';
import { runAutomations } from '../services/automations';
import { checkRateLimit } from '../services/rate-limit';

/** Public unsubscribe — no session required, addressed by opaque token only. */
export async function unsubscribeAction(token: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = await checkRateLimit(`unsub:${ip}`, 30, 60_000);
    if (!limit.allowed) return fail('Trop de requêtes. Réessayez dans une minute.');

    const recipient = await prisma.campaignRecipient.findUnique({
      where: { trackingToken: token },
      include: { contact: true, campaign: { select: { workspaceId: true, id: true, name: true } } },
    });
    if (!recipient) return fail('Lien de désinscription invalide.');

    await addSuppression({
      workspaceId: recipient.campaign.workspaceId,
      email: recipient.contact.email,
      reason: 'UNSUBSCRIBED',
      source: `campagne:${recipient.campaign.name}`,
      campaignId: recipient.campaign.id,
    });

    await prisma.contact.update({
      where: { id: recipient.contactId },
      data: {
        unsubscribed: true, unsubscribedAt: new Date(),
        emailMarketingAllowed: false, consentEmail: 'WITHDRAWN', suppressed: true,
      },
    });
    await prisma.consentRecord.create({
      data: { contactId: recipient.contactId, channel: 'email', state: 'WITHDRAWN', source: 'unsubscribe_link' },
    });
    await prisma.campaignEvent.create({
      data: {
        workspaceId: recipient.campaign.workspaceId,
        campaignId: recipient.campaignId,
        recipientId: recipient.id,
        contactId: recipient.contactId,
        type: 'UNSUBSCRIBED',
        dedupeKey: `unsub:${recipient.id}`,
      },
    }).catch(() => undefined);

    await runAutomations('UNSUBSCRIBE', {
      workspaceId: recipient.campaign.workspaceId,
      contactId: recipient.contactId,
      email: recipient.contact.email,
    });

    return ok(null);
  });
}
