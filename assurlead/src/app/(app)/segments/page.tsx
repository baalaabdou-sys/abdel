import Link from 'next/link';
import { Plus, Filter, Users, RefreshCw } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatNumber } from '@/lib/utils';
import { SegmentActions } from '@/components/segments/segment-actions';

export const metadata = { title: 'Segments' };
export const dynamic = 'force-dynamic';

export default async function SegmentsPage() {
  const ctx = await requireWorkspace('segments:read');
  const segments = await prisma.segment.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { campaigns: true } } },
  });
  const canWrite = can(ctx.role, 'segments:write');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Segments"
        description="Ciblez précisément votre base : produit, échéance, zone géographique, historique de campagne."
        actions={canWrite ? <Button size="sm" asChild><Link href="/segments/new"><Plus /> Nouveau segment</Link></Button> : null}
      />

      {segments.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Aucun segment"
          description="Un segment définit qui recevra vos campagnes. Vous pouvez le construire avec des filtres ou le décrire en français à l’assistant IA."
          action={canWrite ? <Button asChild><Link href="/segments/new"><Plus /> Créer mon premier segment</Link></Button> : null}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment) => {
            const rules = segment.rules as { conditions?: unknown[] };
            return (
              <Card key={segment.id} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      <Link href={`/segments/${segment.id}`} className="hover:underline">{segment.name}</Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{segment.description || 'Aucune description'}</CardDescription>
                  </div>
                  {canWrite ? <SegmentActions segmentId={segment.id} /> : null}
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="num text-2xl font-semibold">{formatNumber(segment.cachedCount)}</span>
                    <span className="text-xs text-muted-foreground">contacts</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={segment.kind === 'DYNAMIC' ? 'default' : 'secondary'}>
                      {segment.kind === 'DYNAMIC' ? 'Dynamique' : 'Statique'}
                    </Badge>
                    <Badge variant="muted">{rules.conditions?.length ?? 0} filtre(s)</Badge>
                    {segment._count.campaigns > 0 ? <Badge variant="secondary">{segment._count.campaigns} campagne(s)</Badge> : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {segment.countedAt ? `Compté le ${segment.countedAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Jamais compté'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
