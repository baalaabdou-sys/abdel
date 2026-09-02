import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { TasksBoard } from '@/components/tasks/tasks-board';

export const metadata = { title: 'Tâches' };
export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('tasks:read');
  const scope = searchParams.scope ?? 'mine';

  const [tasks, members, leads] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(scope === 'mine' ? { assigneeId: ctx.user.id } : {}),
        ...(searchParams.status && searchParams.status !== 'all' ? { status: searchParams.status as 'TODO' } : {}),
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        assignee: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true, score: true } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.lead.findMany({
      where: { workspaceId: ctx.workspaceId, status: { notIn: ['GAGNE', 'PERDU', 'NE_PAS_CONTACTER'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Tâches" description="Appels, devis, relances et rendez-vous à traiter." />
      <TasksBoard
        tasks={tasks.map((t) => ({
          id: t.id, title: t.title, description: t.description, type: t.type,
          status: t.status, priority: t.priority,
          dueAt: t.dueAt?.toISOString() ?? null,
          assigneeId: t.assigneeId, assigneeName: t.assignee?.name ?? null,
          leadId: t.leadId,
          leadName: t.lead ? ([t.lead.firstName, t.lead.lastName].filter(Boolean).join(' ') || t.lead.email || 'Lead') : null,
          leadScore: t.lead?.score ?? null,
        }))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        leads={leads.map((l) => ({ id: l.id, name: [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || 'Lead' }))}
        canWrite={can(ctx.role, 'tasks:write')}
        currentUserId={ctx.user.id}
      />
    </div>
  );
}
