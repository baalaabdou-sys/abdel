import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Optional open-tracking pixel. Open tracking is disabled by default because
 * image proxies and privacy features make it unreliable; the product does not
 * base any decision on it.
 */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { trackingToken: params.token },
    select: { id: true, campaignId: true, contactId: true, variantId: true, campaign: { select: { workspaceId: true, trackOpens: true } } },
  });

  if (recipient?.campaign.trackOpens) {
    await prisma.campaignEvent.create({
      data: {
        workspaceId: recipient.campaign.workspaceId,
        campaignId: recipient.campaignId,
        recipientId: recipient.id,
        contactId: recipient.contactId,
        variantId: recipient.variantId,
        type: 'OPENED',
        dedupeKey: `open:${recipient.id}:${new Date().toISOString().slice(0, 13)}`,
      },
    }).catch(() => undefined);
  }

  return new NextResponse(PIXEL, {
    headers: { 'content-type': 'image/gif', 'cache-control': 'no-store, max-age=0' },
  });
}
