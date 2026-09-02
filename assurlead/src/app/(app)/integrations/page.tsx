import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { redactConfig } from '@/lib/crypto';
import { PageHeader } from '@/components/ui/page-header';
import { IntegrationsView } from '@/components/integrations/integrations-view';
import { INTEGRATION_CATALOG } from '@/lib/integration-catalog';
import { getAiProvider } from '@/server/providers/ai';
import { getVerificationProvider } from '@/server/providers/verification';

export const metadata = { title: 'Intégrations' };
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const ctx = await requireWorkspace('integrations:read');
  const [integrations, ai, verifier, usage] = await Promise.all([
    prisma.integration.findMany({ where: { workspaceId: ctx.workspaceId } }),
    getAiProvider(ctx.workspaceId),
    getVerificationProvider(ctx.workspaceId),
    prisma.apiUsage.groupBy({
      by: ['kind'],
      where: { workspaceId: ctx.workspaceId, periodMonth: new Date().toISOString().slice(0, 7) },
      _sum: { quantity: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Intégrations"
        description="Fournisseurs externes utilisés par la plateforme. Les secrets sont chiffrés avant stockage et ne sont jamais renvoyés au navigateur."
      />
      <IntegrationsView
        catalog={INTEGRATION_CATALOG.map((c) => ({ ...c, fields: [...c.fields] }))}
        integrations={integrations.map((i) => ({
          kind: i.kind, provider: i.provider, status: i.status,
          statusMessage: i.statusMessage,
          lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
          config: redactConfig(i.config as Record<string, unknown>),
        }))}
        activeProviders={{
          ai: { name: ai.name, model: ai.model, simulated: ai.simulated },
          verification: { name: verifier.name, simulated: verifier.simulated },
        }}
        usage={usage.map((u) => ({ kind: u.kind, quantity: u._sum.quantity ?? 0 }))}
        canWrite={can(ctx.role, 'integrations:write')}
      />
    </div>
  );
}
