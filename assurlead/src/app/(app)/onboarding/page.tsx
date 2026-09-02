import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist';

export const metadata = { title: 'Démarrage' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const ctx = await requireWorkspace('settings:read');
  const ws = ctx.workspaceId;

  // Each step's completion is derived from real data, not from a stored flag.
  const [workspace, contacts, accounts, domains, campaigns, pages, policy, products] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: ws } }),
    prisma.contact.count({ where: { workspaceId: ws } }),
    prisma.emailAccount.count({ where: { workspaceId: ws, provider: { not: 'DEMO' }, status: 'CONNECTED' } }),
    prisma.sendingDomain.count({ where: { workspaceId: ws, spf: 'CONFIGURED', dkim: 'CONFIGURED' } }),
    prisma.campaign.count({ where: { workspaceId: ws } }),
    prisma.landingPage.count({ where: { workspaceId: ws, status: 'PUBLISHED' } }),
    prisma.compliancePolicy.findUnique({ where: { workspaceId: ws } }),
    prisma.insuranceProduct.count({ where: { workspaceId: ws, active: true } }),
  ]);

  if (workspace.onboardingDone) redirect('/dashboard');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bienvenue dans ASSURLEAD AI"
        description="Dix étapes pour transformer votre base de contacts en machine à leads. Vous pouvez avancer dans l’ordre que vous voulez."
      />
      <OnboardingChecklist
        state={{
          workspaceNamed: workspace.name.trim().length > 2,
          logoUploaded: !!workspace.logoUrl,
          productsConfigured: products > 0,
          senderConnected: accounts > 0,
          domainVerified: domains > 0,
          contactsImported: contacts > 0,
          policyConfigured: !!policy && policy.legalNotice.trim().length > 10,
          campaignCreated: campaigns > 0,
          landingPublished: pages > 0,
        }}
        counts={{ contacts, campaigns, pages }}
      />
    </div>
  );
}
