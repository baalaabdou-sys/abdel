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

  const page = recipient.campaign.landingPage;
  const target = page
    ? `${appUrl()}/p/${page.slug}?r=${encodeURIComponent(params.token)}`
    : `${appUrl()}/lien-invalide`;

  return NextResponse.redirect(target, { status: 302 });
}
