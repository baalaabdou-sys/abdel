import { FileText } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { TemplatesView } from '@/components/templates/templates-view';

export const metadata = { title: 'Templates' };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const ctx = await requireWorkspace('templates:read');
  const templates = await prisma.template.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }],
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Templates"
        description="Modèles d’emails réutilisables par produit et par intention."
      />
      <TemplatesView
        templates={templates.map((t) => ({
          id: t.id, name: t.name, category: t.category, product: t.product, locale: t.locale,
          subject: t.subject, previewText: t.previewText, bodyText: t.bodyText,
          version: t.version, archived: t.archived, isDemo: t.isDemo,
          updatedAt: t.updatedAt.toISOString(),
        }))}
        canWrite={can(ctx.role, 'templates:write')}
      />
    </div>
  );
}
