import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { CrmBoard } from '@/components/crm/crm-board';
import { CRM_PIPELINE } from '@/lib/domain';

export const metadata = { title: 'CRM' };
export const dynamic = 'force-dynamic';

export default async function CrmPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('leads:read');
  const ownerFilter = searchParams.owner;

  const [leads, members] = await Promise.all([
    prisma.lead.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        status: { in: CRM_PIPELINE },
        ...(ownerFilter === 'unassigned' ? { ownerId: null } : ownerFilter && ownerFilter !== 'all' ? { ownerId: ownerFilter } : {}),
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 400,
      include: { owner: { select: { id: true, name: true } } },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId, role: { in: ['SALES', 'ADMIN', 'OWNER'] } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM"
        description="Pipeline commercial. Faites glisser une carte pour changer son étape — chaque déplacement est journalisé."
      />
      <CrmBoard
        leads={leads.map((l) => ({
          id: l.id,
          name: [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || 'Lead',
          email: l.email, phone: l.phone, city: l.city, product: l.product,
          status: l.status, score: l.score, value: l.value,
          ownerName: l.owner?.name ?? null,
          createdAt: l.createdAt.toISOString(),
        }))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        canWrite={can(ctx.role, 'leads:write')}
      />
    </div>
  );
}
