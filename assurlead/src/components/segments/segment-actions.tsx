'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteSegmentAction, refreshSegmentAction } from '@/server/actions/segments';

export function SegmentActions({ segmentId }: { segmentId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/segments/${segmentId}`)}><Pencil /> Modifier</DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const result = await refreshSegmentAction(segmentId);
              if (result.ok) { toast.success(`${result.data.count} contacts`); router.refresh(); }
              else toast.error(result.error);
            }}
          >
            <RefreshCw /> Recalculer
          </DropdownMenuItem>
          <DropdownMenuItem destructive onClick={() => setConfirm(true)}><Trash2 /> Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Supprimer ce segment ?"
        description="Les contacts ne sont pas supprimés : seul le segment disparaît. Un segment utilisé par une campagne active ne peut pas être supprimé."
        destructive
        onConfirm={async () => {
          const result = await deleteSegmentAction(segmentId);
          if (result.ok) { toast.success('Segment supprimé'); router.refresh(); }
          else toast.error(result.error);
        }}
      />
    </>
  );
}
