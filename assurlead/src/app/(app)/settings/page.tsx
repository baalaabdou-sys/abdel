import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { SettingsView } from '@/components/settings/settings-view';
import { startOfDay } from '@/lib/utils';

export const metadata = { title: 'Paramètres' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const ctx = await requireWorkspace('settings:read');
  const today = startOfDay();

  const [workspace, policy, members, products, goal, auditLogs, usage] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId } }),
    prisma.compliancePolicy.findUnique({ where: { workspaceId: ctx.workspaceId } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.insuranceProduct.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { type: 'asc' } }),
    prisma.dailyGoal.findUnique({ where: { workspaceId_date: { workspaceId: ctx.workspaceId, date: today } } }),
    can(ctx.role, 'audit:read')
      ? prisma.auditLog.findMany({
          where: { workspaceId: ctx.workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { user: { select: { name: true } } },
        })
      : [],
    prisma.apiUsage.groupBy({
      by: ['kind'],
      where: { workspaceId: ctx.workspaceId, periodMonth: new Date().toISOString().slice(0, 7) },
      _sum: { quantity: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Paramètres" description="Espace de travail, conformité, équipe et journal d’audit." />
      <SettingsView
        workspace={{
          id: workspace.id, name: workspace.name, slug: workspace.slug,
          logoUrl: workspace.logoUrl, locale: workspace.locale,
          timezone: workspace.timezone, isDemo: workspace.isDemo,
        }}
        policy={policy ? {
          requireExplicitConsent: policy.requireExplicitConsent,
          allowUnknownConsent: policy.allowUnknownConsent,
          requireSourceRecorded: policy.requireSourceRecorded,
          allowCatchAll: policy.allowCatchAll,
          allowRisky: policy.allowRisky,
          allowUnverified: policy.allowUnverified,
          blockOnUnknownConsent: policy.blockOnUnknownConsent,
          blockOnMissingSource: policy.blockOnMissingSource,
          blockOnLowReadiness: policy.blockOnLowReadiness,
          minReadinessScore: policy.minReadinessScore,
          retentionMonths: policy.retentionMonths,
          legalNotice: policy.legalNotice,
          privacyUrl: policy.privacyUrl,
          dpoEmail: policy.dpoEmail,
        } : null}
        members={members.map((m) => ({
          userId: m.user.id, name: m.user.name, email: m.user.email, role: m.role,
          lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
        }))}
        products={products.map((p) => ({ type: p.type, label: p.label, active: p.active }))}
        goal={{ minTarget: goal?.minTarget ?? 10, stretchTarget: goal?.stretchTarget ?? 20 }}
        auditLogs={auditLogs.map((a) => ({
          id: a.id, action: a.action, entityType: a.entityType, summary: a.summary,
          userName: a.user?.name ?? 'Système', createdAt: a.createdAt.toISOString(),
        }))}
        usage={usage.map((u) => ({ kind: u.kind, quantity: u._sum.quantity ?? 0 }))}
        currentUserId={ctx.user.id}
        currentRole={ctx.role}
        canWrite={can(ctx.role, 'settings:write')}
        canManageMembers={can(ctx.role, 'members:manage')}
        canManageWorkspace={can(ctx.role, 'workspace:manage')}
        canReadAudit={can(ctx.role, 'audit:read')}
      />
    </div>
  );
}
