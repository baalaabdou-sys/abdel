import Link from 'next/link';
import { Plus, Send } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { getFunnel } from '@/server/services/analytics';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { campaignStatusLabel, campaignStatusTone, insuranceLabel, objectiveLabel } from '@/lib/domain';
import { formatNumber } from '@/lib/utils';

export const metadata = { title: 'Campagnes' };
export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const ctx = await requireWorkspace('campaigns:read');
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: [{ launchedAt: 'desc' }, { createdAt: 'desc' }],
    include: { segment: { select: { name: true } }, _count: { select: { recipients: true } } },
    take: 60,
  });

  const withMetrics = await Promise.all(
    campaigns.map(async (c) => ({
      campaign: c,
      funnel: ['DRAFT'].includes(c.status) ? null : await getFunnel({ workspaceId: ctx.workspaceId, campaignId: c.id }),
    })),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Campagnes"
        description="Une campagne ne démarre jamais toute seule : elle doit être lancée explicitement."
        actions={can(ctx.role, 'campaigns:write') ? <Button size="sm" asChild><Link href="/campaigns/new"><Plus /> Nouvelle campagne</Link></Button> : null}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Aucune campagne"
          description="Créez votre première campagne : objectif, produit, segment, email, landing page, formulaire — puis lancez-la quand tout est prêt."
          action={can(ctx.role, 'campaigns:write') ? <Button asChild><Link href="/campaigns/new"><Plus /> Créer une campagne</Link></Button> : null}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Destinataires</TableHead>
                  <TableHead className="text-right">Envoyés</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Leads qual.</TableHead>
                  <TableHead className="text-right">Conv. LP</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withMetrics.map(({ campaign, funnel }) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link href={`/campaigns/${campaign.id}`} className="block min-w-0">
                        <span className="block truncate font-medium hover:underline">{campaign.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {insuranceLabel(campaign.product)} · {objectiveLabel(campaign.objective)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant={campaignStatusTone[campaign.status]}>{campaignStatusLabel(campaign.status)}</Badge></TableCell>
                    <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{campaign.segment?.name ?? '—'}</TableCell>
                    <TableCell className="num text-right">{formatNumber(campaign._count.recipients)}</TableCell>
                    <TableCell className="num text-right">{funnel ? formatNumber(funnel.counts.sent) : '—'}</TableCell>
                    <TableCell className="num text-right">{funnel ? formatNumber(funnel.counts.uniqueClicks) : '—'}</TableCell>
                    <TableCell className="num text-right font-semibold">{funnel ? formatNumber(funnel.counts.qualifiedLeads) : '—'}</TableCell>
                    <TableCell className="num text-right">{funnel ? `${funnel.rates.landingConversionRate} %` : '—'}</TableCell>
                    <TableCell>
                      {campaign.readinessScore > 0 ? (
                        <Badge variant={campaign.readinessScore >= 80 ? 'success' : campaign.readinessScore >= 60 ? 'warning' : 'destructive'}>
                          {campaign.readinessScore}/100
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
