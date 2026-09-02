import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { NewCampaignForm } from '@/components/campaigns/new-campaign-form';

export const metadata = { title: 'Nouvelle campagne' };

export default async function NewCampaignPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await requireWorkspace('campaigns:write');
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/campaigns"><ArrowLeft /> Campagnes</Link>
      </Button>
      <PageHeader
        title="Nouvelle campagne"
        description="Étape 1 sur 11 — donnez un nom, un objectif et un produit. La campagne sera créée en brouillon."
      />
      <NewCampaignForm
        defaultName={searchParams.name ?? ''}
        defaultProduct={searchParams.product ?? 'AUTO'}
        defaultObjective={searchParams.objective ?? 'QUOTE_REQUEST'}
      />
    </div>
  );
}
