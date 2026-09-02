import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LandingEditor } from '@/components/landing-builder/landing-editor';
import type { LandingSection, LandingTheme } from '@/server/services/landing-templates';
import { DEFAULT_THEME } from '@/server/services/landing-templates';
import { appUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function LandingPageEditorPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('landing:read');
  const page = await prisma.landingPage.findFirst({
    where: { id: params.id, workspaceId: ctx.workspaceId },
    include: {
      form: { include: { fields: { orderBy: [{ step: 'asc' }, { order: 'asc' }] } } },
      _count: { select: { submissions: true } },
    },
  });
  if (!page) notFound();

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/landing-pages"><ArrowLeft /> Landing Pages</Link>
      </Button>

      <PageHeader
        title={page.name}
        description={`${appUrl()}/p/${page.slug}`}
        actions={
          page.status === 'PUBLISHED' ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">Voir en ligne <ExternalLink /></a>
            </Button>
          ) : null
        }
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={page.status === 'PUBLISHED' ? 'success' : 'secondary'}>
            {page.status === 'PUBLISHED' ? 'Publiée' : 'Brouillon'}
          </Badge>
          <Badge variant="muted">{page._count.submissions} formulaire(s) reçu(s)</Badge>
        </div>
      </PageHeader>

      <LandingEditor
        page={{
          id: page.id,
          name: page.name,
          slug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          noIndex: page.noIndex,
          customDomain: page.customDomain,
          sections: (page.sections as unknown as LandingSection[]) ?? [],
          theme: (page.theme as unknown as LandingTheme) ?? DEFAULT_THEME,
        }}
        form={page.form ? {
          id: page.form.id,
          name: page.form.name,
          multiStep: page.form.multiStep,
          steps: (page.form.steps as unknown as { key: string; title: string; description: string }[]) ?? [],
          consentText: page.form.consentText,
          successMessage: page.form.successMessage,
          fields: page.form.fields.map((f) => ({
            id: f.id, key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
            required: f.required, placeholder: f.placeholder, helpText: f.helpText,
            options: (f.options as unknown as { value: string; label: string }[]) ?? [],
            conditionField: f.conditionField, conditionValue: f.conditionValue,
          })),
        } : null}
        companyName={ctx.workspaceName}
        logoUrl={ctx.workspaceLogoUrl}
        canWrite={can(ctx.role, 'landing:write')}
        appUrl={appUrl()}
      />
    </div>
  );
}
