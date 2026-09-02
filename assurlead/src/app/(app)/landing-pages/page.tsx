import Link from 'next/link';
import { LayoutTemplate, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { insuranceLabel } from '@/lib/domain';
import { LANDING_TEMPLATES } from '@/server/services/landing-templates';
import { NewLandingPageButton } from '@/components/landing-builder/new-landing-page-button';
import { LandingPageActions } from '@/components/landing-builder/landing-page-actions';

export const metadata = { title: 'Landing Pages' };
export const dynamic = 'force-dynamic';

export default async function LandingPagesPage() {
  const ctx = await requireWorkspace('landing:read');
  const pages = await prisma.landingPage.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      form: { select: { id: true, _count: { select: { fields: true } } } },
      _count: { select: { submissions: true, campaigns: true } },
    },
  });
  const canWrite = can(ctx.role, 'landing:write');
  const templates = LANDING_TEMPLATES.map((t) => ({ key: t.key, name: t.name, product: t.product, description: t.description }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Landing Pages"
        description="Les pages qui transforment un clic en demande de devis."
        actions={canWrite ? <NewLandingPageButton templates={templates} /> : null}
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Aucune landing page"
          description="Partez d’un modèle par produit d’assurance : hero, bénéfices, preuves, formulaire multi-étapes et mentions légales sont déjà en place."
          action={canWrite ? <NewLandingPageButton templates={templates} /> : null}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="truncate">
                    <Link href={`/landing-pages/${page.id}`} className="hover:underline">{page.name}</Link>
                  </CardTitle>
                  <CardDescription className="truncate">/{page.slug}</CardDescription>
                </div>
                {canWrite ? <LandingPageActions pageId={page.id} slug={page.slug} published={page.status === 'PUBLISHED'} /> : null}
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={page.status === 'PUBLISHED' ? 'success' : page.status === 'ARCHIVED' ? 'muted' : 'secondary'}>
                    {page.status === 'PUBLISHED' ? 'Publiée' : page.status === 'ARCHIVED' ? 'Archivée' : 'Brouillon'}
                  </Badge>
                  <Badge variant="secondary">{insuranceLabel(page.product)}</Badge>
                  <Badge variant="muted">{page.form?._count.fields ?? 0} champ(s)</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Formulaires reçus</p>
                    <p className="num font-semibold">{page._count.submissions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Campagnes liées</p>
                    <p className="num font-semibold">{page._count.campaigns}</p>
                  </div>
                </div>
                {page.status === 'PUBLISHED' ? (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">Voir la page <ExternalLink /></a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
