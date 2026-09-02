import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { getFunnel, getDailySeries, getCampaignComparison, getSpeedToLead, forecastForTarget } from '@/server/services/analytics';
import { PageHeader } from '@/components/ui/page-header';
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { daysAgo } from '@/lib/utils';

export const metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('analytics:read');
  const days = Number(searchParams.days ?? 30);
  const campaignId = searchParams.campaign;
  const from = daysAgo(days - 1);

  const [funnel, series, comparison, speed, forecast, campaigns] = await Promise.all([
    getFunnel({ workspaceId: ctx.workspaceId, from, ...(campaignId ? { campaignId } : {}) }),
    getDailySeries(ctx.workspaceId, days),
    getCampaignComparison(ctx.workspaceId, 10),
    getSpeedToLead(ctx.workspaceId, days),
    forecastForTarget(ctx.workspaceId, 15, days),
    prisma.campaign.findMany({
      where: { workspaceId: ctx.workspaceId, status: { in: ['SENDING', 'PAUSED', 'COMPLETED'] } },
      orderBy: { launchedAt: 'desc' }, take: 30,
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Chiffres calculés à partir des événements réellement enregistrés — jamais estimés, sauf mention explicite."
      />
      <AnalyticsView
        funnel={funnel}
        series={series.series}
        comparison={comparison.map((c) => ({
          id: c.id, name: c.name, product: c.product, status: c.status,
          sent: c.counts.sent, clicks: c.counts.uniqueClicks, visits: c.counts.landingViews,
          submits: c.counts.formSubmits, leads: c.counts.leads, qualified: c.counts.qualifiedLeads,
          appointments: c.counts.appointments, sales: c.counts.sales,
          clickRate: c.rates.clickRate, landingConversionRate: c.rates.landingConversionRate,
          qualifiedRate: c.rates.qualifiedRate,
        }))}
        speed={speed}
        forecast={forecast}
        campaigns={campaigns}
        selectedCampaign={campaignId ?? null}
        days={days}
        canUseAi={can(ctx.role, 'ai:use')}
      />
    </div>
  );
}
