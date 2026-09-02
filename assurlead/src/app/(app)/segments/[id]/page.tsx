import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { SegmentBuilder } from '@/components/segments/segment-builder';
import type { SegmentRules } from '@/server/services/segments';

export const dynamic = 'force-dynamic';

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('segments:read');
  const segment = await prisma.segment.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } });
  if (!segment) notFound();

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/segments"><ArrowLeft /> Segments</Link>
      </Button>
      <PageHeader title={segment.name} description="Modifier les critères du segment." />
      <SegmentBuilder
        segmentId={segment.id}
        initialName={segment.name}
        initialDescription={segment.description}
        initialKind={segment.kind}
        initialRules={segment.rules as unknown as SegmentRules}
      />
    </div>
  );
}
