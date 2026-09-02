import { Ban } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SuppressionView } from '@/components/suppression/suppression-view';
import { suppressionReasonLabel, SUPPRESSION_REASON_LIST } from '@/lib/domain';

export const metadata = { title: 'Suppression' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function SuppressionPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('suppression:read');
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const where: Prisma.SuppressionEntryWhereInput = { workspaceId: ctx.workspaceId };
  if (searchParams.q) where.emailNormalized = { contains: searchParams.q.toLowerCase() };
  if (searchParams.reason && searchParams.reason !== 'all') where.reason = searchParams.reason as 'UNSUBSCRIBED';

  const [entries, total, byReason] = await Promise.all([
    prisma.suppressionEntry.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.suppressionEntry.count({ where }),
    prisma.suppressionEntry.groupBy({ by: ['reason'], where: { workspaceId: ctx.workspaceId }, _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(byReason.map((r) => [r.reason, r._count._all]));
  const totalAll = byReason.reduce((s, r) => s + r._count._all, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Liste de suppression"
        description="Les adresses de cette liste ne reçoivent jamais d’email marketing. Le contrôle est refait au moment de chaque envoi, pas seulement à la création de la campagne."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total supprimé" value={totalAll} icon={Ban} tone="warning" />
        <StatCard label="Désinscriptions" value={counts.UNSUBSCRIBED ?? 0} />
        <StatCard label="Rebonds définitifs" value={counts.HARD_BOUNCE ?? 0} tone={counts.HARD_BOUNCE ? 'destructive' : 'default'} />
        <StatCard label="Plaintes" value={counts.COMPLAINT ?? 0} tone={counts.COMPLAINT ? 'destructive' : 'default'} />
        <StatCard label="Blocages manuels" value={counts.MANUAL_BLOCK ?? 0} />
      </div>

      <SuppressionView
        entries={entries.map((e) => ({
          id: e.id, email: e.email, phone: e.phone, reason: e.reason,
          reasonLabel: suppressionReasonLabel(e.reason), source: e.source, notes: e.notes,
          campaignId: e.campaignId, createdAt: e.createdAt.toISOString(),
        }))}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        reasons={SUPPRESSION_REASON_LIST.map((r) => ({ value: r, label: suppressionReasonLabel(r) }))}
        canWrite={can(ctx.role, 'suppression:write')}
      />
    </div>
  );
}
