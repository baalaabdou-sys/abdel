import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { SegmentBuilder } from '@/components/segments/segment-builder';

export const metadata = { title: 'Nouveau segment' };

export default async function NewSegmentPage() {
  await requireWorkspace('segments:write');
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/segments"><ArrowLeft /> Segments</Link>
      </Button>
      <PageHeader title="Nouveau segment" description="Décrivez votre audience en français ou construisez les filtres manuellement." />
      <SegmentBuilder />
    </div>
  );
}
