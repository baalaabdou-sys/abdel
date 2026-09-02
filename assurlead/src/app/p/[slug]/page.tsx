import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import type { LandingSection, LandingTheme } from '@/server/services/landing-templates';
import { DEFAULT_THEME } from '@/server/services/landing-templates';
import { LandingRenderer } from '@/components/landing/landing-renderer';
import { recordLandingView } from '@/server/actions/funnel';

export const dynamic = 'force-dynamic';

async function loadPage(slug: string) {
  return prisma.landingPage.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      form: { include: { fields: { orderBy: [{ step: 'asc' }, { order: 'asc' }] } } },
      workspace: { select: { id: true, name: true, logoUrl: true, policy: { select: { privacyUrl: true, legalNotice: true } } } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!page) return { title: 'Page introuvable' };
  return {
    title: page.seoTitle || page.name,
    description: page.seoDescription,
    robots: { index: !page.noIndex, follow: !page.noIndex },
    openGraph: { title: page.seoTitle || page.name, description: page.seoDescription, type: 'website' },
  };
}

export default async function PublicLandingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { r?: string; v?: string };
}) {
  const page = await loadPage(params.slug);
  if (!page || !page.form) notFound();

  // Funnel event: a landing-page visit is recorded server-side on render.
  await recordLandingView(page.id, searchParams.r ?? null);

  return (
    <LandingRenderer
      sections={(page.sections as unknown as LandingSection[]) ?? []}
      theme={((page.theme as unknown as LandingTheme) ?? DEFAULT_THEME)}
      companyName={page.workspace.name}
      logoUrl={page.workspace.logoUrl}
      privacyUrl={page.workspace.policy?.privacyUrl ?? ''}
      form={{
        id: page.form.id,
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
      }}
      landingPageId={page.id}
      recipientToken={searchParams.r ?? null}
    />
  );
}
