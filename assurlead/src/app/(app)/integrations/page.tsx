import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { redactConfig } from '@/lib/crypto';
import { PageHeader } from '@/components/ui/page-header';
import { IntegrationsView } from '@/components/integrations/integrations-view';
import { INTEGRATION_CATALOG } from '@/lib/integration-catalog';
import { getAiProvider } from '@/server/providers/ai';
import { getVerificationProvider } from '@/server/providers/verification';
import { CaptureSites } from '@/components/integrations/capture-sites';
import { appUrl } from '@/lib/config';

export const metadata = { title: 'Intégrations' };
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const ctx = await requireWorkspace('integrations:read');
  const [integrations, ai, verifier, usage, captureSites, forms] = await Promise.all([
    prisma.integration.findMany({ where: { workspaceId: ctx.workspaceId } }),
    getAiProvider(ctx.workspaceId),
    getVerificationProvider(ctx.workspaceId),
    prisma.apiUsage.groupBy({
      by: ['kind'],
      where: { workspaceId: ctx.workspaceId, periodMonth: new Date().toISOString().slice(0, 7) },
      _sum: { quantity: true },
    }),
    prisma.captureSite.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { form: { select: { name: true } } },
    }),
    prisma.form.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
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

      <CaptureSites
        sites={captureSites.map((s) => ({
          id: s.id, name: s.name, url: s.url, publicKey: s.publicKey,
          allowedOrigins: s.allowedOrigins, formId: s.formId,
          formName: s.form?.name ?? null, product: s.product,
          fieldMapping: (s.fieldMapping as Record<string, string>) ?? {},
          consentText: s.consentText, requireConsentField: s.requireConsentField,
          active: s.active, viewCount: s.viewCount, leadCount: s.leadCount,
          lastEventAt: s.lastEventAt?.toISOString() ?? null,
        }))}
        forms={forms}
        appUrl={appUrl()}
        canWrite={can(ctx.role, 'integrations:write')}
      />
    </div>
  );
}
