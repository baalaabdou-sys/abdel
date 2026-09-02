import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Campaign CTA link. Records a CLICKED event (idempotent per recipient per
 * minute so a double click is not counted twice) and forwards the visitor to
 * the campaign's landing page with the tracking token attached.
 */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { trackingToken: params.token },
    include: { campaign: { include: { landingPage: true } } },
  });

  if (!recipient) return NextResponse.redirect(`${appUrl()}/lien-invalide`, { status: 302 });

  const minuteBucket = new Date().toISOString().slice(0, 16);
  await prisma.campaignEvent.create({
    data: {
      workspaceId: recipient.campaign.workspaceId,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
      variantId: recipient.variantId,
      type: 'CLICKED',
      dedupeKey: `click:${recipient.id}:${minuteBucket}`,
    },
  }).catch(() => undefined); // duplicate within the same minute — ignore

  return NextResponse.redirect(destinationFor(recipient.campaign, params.token), { status: 302 });
}

/**
 * Where the CTA sends the visitor: a landing page hosted here, or one the client
 * hosts themselves. In both cases the tracking token travels with them so the
 * resulting lead stays attributed to the campaign.
 */
function destinationFor(
  campaign: { landingPage: { slug: string } | null; externalLandingUrl: string | null },
  token: string,
): string {
  if (campaign.externalLandingUrl) {
    try {
      const target = new URL(campaign.externalLandingUrl);
      // `alid` is the parameter the capture snippet reads.
      target.searchParams.set('alid', token);
      return target.toString();
    } catch {
      return `${appUrl()}/lien-invalide`;
    }
  }
  if (campaign.landingPage) {
    return `${appUrl()}/p/${campaign.landingPage.slug}?r=${encodeURIComponent(token)}`;
  }
  return `${appUrl()}/lien-invalide`;
}
