import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { AutomationsView } from '@/components/automations/automations-view';

export const metadata = { title: 'Automatisations' };
export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const ctx = await requireWorkspace('automations:read');
  const [rules, executions] = await Promise.all([
    prisma.automationRule.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { executions: true } } },
    }),
    prisma.automationExecution.findMany({
      where: { rule: { workspaceId: ctx.workspaceId } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { rule: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automatisations"
        description="Règles « quand … alors … » exécutées automatiquement. Chaque exécution est dédupliquée : une même règle ne s’applique jamais deux fois au même événement."
      />
      <AutomationsView
        rules={rules.map((r) => ({
          id: r.id, name: r.name, description: r.description, trigger: r.trigger,
          conditions: r.conditions as unknown as { field: string; operator: string; value: unknown }[],
          actions: r.actions as unknown as Record<string, unknown>[],
          enabled: r.enabled, runCount: r.runCount,
          lastRunAt: r.lastRunAt?.toISOString() ?? null,
          executionCount: r._count.executions,
        }))}
        executions={executions.map((e) => ({
          id: e.id, ruleName: e.rule.name, entityType: e.entityType,
          entityId: e.entityId, status: e.status, createdAt: e.createdAt.toISOString(),
        }))}
        canWrite={can(ctx.role, 'automations:write')}
      />
    </div>
  );
}
