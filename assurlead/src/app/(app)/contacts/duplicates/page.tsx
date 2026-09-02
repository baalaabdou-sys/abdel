import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { findDuplicates } from '@/server/services/duplicates';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DuplicatesView } from '@/components/contacts/duplicates-view';

export const metadata = { title: 'Doublons' };
export const dynamic = 'force-dynamic';

export default async function DuplicatesPage() {
  const ctx = await requireWorkspace('contacts:read');
  const groups = await findDuplicates(ctx.workspaceId);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/contacts"><ArrowLeft /> Contacts</Link>
      </Button>
      <PageHeader
        title="Doublons détectés"
        description="Numéro de téléphone partagé, ou nom identique avec des coordonnées proches. Aucune fusion n’est effectuée automatiquement."
      />
      <DuplicatesView groups={groups} canMerge={can(ctx.role, 'contacts:write')} />
    </div>
  );
}
