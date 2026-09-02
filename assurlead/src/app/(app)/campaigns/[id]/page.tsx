import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { getFunnel } from '@/server/services/analytics';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignWorkspace } from '@/components/campaigns/campaign-workspace';
import { campaignStatusLabel, campaignStatusTone, insuranceLabel, objectiveLabel } from '@/lib/domain';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('campaigns:read');
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspaceId },
    include: {
      variants: { orderBy: { createdAt: 'asc' } },
      segment: true,
      emailAccount: { include: { domain: true } },
      landingPage: { include: { form: { include: { fields: true } } } },
    },
  });
  if (!campaign) notFound();

  const [segments, accounts, pages, funnel, recipientStats] = await Promise.all([
    prisma.segment.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { name: 'asc' }, select: { id: true, name: true, cachedCount: true } }),
    prisma.emailAccount.findMany({ where: { workspaceId: ctx.workspaceId, active: true }, select: { id: true, label: true, fromEmail: true, fromName: true, provider: true, dailyLimit: true } }),
    prisma.landingPage.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, status: true, product: true } }),
    campaign.status === 'DRAFT' ? null : getFunnel({ workspaceId: ctx.workspaceId, campaignId: campaign.id }),
    prisma.campaignRecipient.groupBy({ by: ['status'], where: { campaignId: campaign.id }, _count: { _all: true } }),
  ]);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/campaigns"><ArrowLeft /> Campagnes</Link>
      </Button>

      <PageHeader title={campaign.name} description={`${insuranceLabel(campaign.product)} · ${objectiveLabel(campaign.objective)}`}>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={campaignStatusTone[campaign.status]}>{campaignStatusLabel(campaign.status)}</Badge>
          {campaign.launchedAt ? <Badge variant="muted">Lancée le {campaign.launchedAt.toLocaleDateString('fr-FR')}</Badge> : null}
          {campaign.emailAccount?.provider === 'DEMO' ? <Badge variant="warning">Fournisseur DEMO — aucun envoi réel</Badge> : null}
        </div>
      </PageHeader>

      <CampaignWorkspace
        campaign={{
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          product: campaign.product,
          objective: campaign.objective,
          locale: campaign.locale,
          segmentId: campaign.segmentId,
          emailAccountId: campaign.emailAccountId,
          landingPageId: campaign.landingPageId,
          scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
          trackOpens: campaign.trackOpens,
          trackClicks: campaign.trackClicks,
          batchSize: campaign.batchSize,
          batchIntervalMinutes: campaign.batchIntervalMinutes,
          dailyCap: campaign.dailyCap,
          abEnabled: campaign.abEnabled,
          readinessScore: campaign.readinessScore,
          recipientCount: campaign.recipientCount,
        }}
        variants={campaign.variants.map((v) => ({
          id: v.id, label: v.label, weight: v.weight, subject: v.subject,
          previewText: v.previewText, bodyText: v.bodyText, ctaLabel: v.ctaLabel, isControl: v.isControl,
        }))}
        segments={segments}
        accounts={accounts}
        pages={pages}
        funnel={funnel}
        recipientStats={recipientStats.map((r) => ({ status: r.status, count: r._count._all }))}
        canWrite={can(ctx.role, 'campaigns:write')}
        canLaunch={can(ctx.role, 'campaigns:launch')}
        canUseAi={can(ctx.role, 'ai:use')}
      />
    </div>
  );
}
