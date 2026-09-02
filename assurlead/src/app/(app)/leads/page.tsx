import Link from 'next/link';
import { Flame, Clock } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LeadsTable } from '@/components/leads/leads-table';
import { StatCard } from '@/components/ui/stat-card';
import { QUALIFIED_SCORE_THRESHOLD } from '@/lib/domain';
import { startOfDay } from '@/lib/utils';

export const metadata = { title: 'Leads' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 40;

export default async function LeadsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('leads:read');
  const page = Math.max(1, Number(searchParams.page ?? 1));

  const where: Prisma.LeadWhereInput = { workspaceId: ctx.workspaceId };
  const and: Prisma.LeadWhereInput[] = [];
  if (searchParams.q) {
    and.push({
      OR: [
        { firstName: { contains: searchParams.q, mode: 'insensitive' } },
        { lastName: { contains: searchParams.q, mode: 'insensitive' } },
        { email: { contains: searchParams.q, mode: 'insensitive' } },
        { phone: { contains: searchParams.q } },
        { city: { contains: searchParams.q, mode: 'insensitive' } },
      ],
    });
  }
  if (searchParams.status && searchParams.status !== 'all') and.push({ status: searchParams.status as 'NOUVEAU' });
  if (searchParams.product && searchParams.product !== 'all') and.push({ product: searchParams.product as 'AUTO' });
  if (searchParams.owner === 'unassigned') and.push({ ownerId: null });
  else if (searchParams.owner && searchParams.owner !== 'all') and.push({ ownerId: searchParams.owner });
  if (searchParams.band === 'hot') and.push({ score: { gte: 80 } });
  else if (searchParams.band === 'qualified') and.push({ score: { gte: QUALIFIED_SCORE_THRESHOLD } });
  if (searchParams.filter === 'uncontacted') and.push({ firstActionAt: null, status: { in: ['NOUVEAU', 'A_CONTACTER'] } });
  if (and.length) where.AND = and;

  const today = startOfDay();
  const [rows, total, members, stats] = await Promise.all([
    prisma.lead.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { owner: { select: { id: true, name: true } }, campaign: { select: { name: true } } },
    }),
    prisma.lead.count({ where }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId, role: { in: ['SALES', 'ADMIN', 'OWNER'] } },
      include: { user: { select: { id: true, name: true } } },
    }),
    Promise.all([
      prisma.lead.count({ where: { workspaceId: ctx.workspaceId, createdAt: { gte: today } } }),
      prisma.lead.count({ where: { workspaceId: ctx.workspaceId, createdAt: { gte: today }, score: { gte: QUALIFIED_SCORE_THRESHOLD } } }),
      prisma.lead.count({ where: { workspaceId: ctx.workspaceId, score: { gte: 80 }, status: { in: ['NOUVEAU', 'A_CONTACTER', 'QUALIFIE'] } } }),
      prisma.lead.count({ where: { workspaceId: ctx.workspaceId, firstActionAt: null, status: { in: ['NOUVEAU', 'A_CONTACTER'] } } }),
    ]),
  ]);

  const [todayLeads, todayQualified, hotOpen, uncontacted] = stats;

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" description="Toutes les demandes générées par vos campagnes et landing pages." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads aujourd’hui" value={todayLeads} icon={Flame} />
        <StatCard label="Qualifiés aujourd’hui" value={todayQualified} icon={Flame} tone="success" hint={`Score ≥ ${QUALIFIED_SCORE_THRESHOLD}`} />
        <StatCard label="Leads chauds ouverts" value={hotOpen} icon={Flame} tone="warning" hint="Score ≥ 80, non traités" />
        <StatCard label="Sans première action" value={uncontacted} icon={Clock} tone={uncontacted > 0 ? 'destructive' : 'default'} />
      </div>

      {total === 0 && !searchParams.q && !searchParams.status ? (
        <EmptyState
          icon={Flame}
          title="Aucun lead pour le moment"
          description="Les leads sont créés automatiquement lorsqu’un visiteur soumet un formulaire sur l’une de vos landing pages."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <LeadsTable
              rows={rows.map((l) => ({
                id: l.id, firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone,
                city: l.city, product: l.product, status: l.status, score: l.score,
                ownerId: l.ownerId, ownerName: l.owner?.name ?? null, campaignName: l.campaign?.name ?? null,
                createdAt: l.createdAt.toISOString(), responseMinutes: l.responseMinutes,
                firstActionAt: l.firstActionAt?.toISOString() ?? null,
              }))}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
              canAssign={can(ctx.role, 'leads:assign')}
              canWrite={can(ctx.role, 'leads:write')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
