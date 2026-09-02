'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Copy, Trash2, Globe, EyeOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteLandingPageAction, duplicateLandingPageAction, publishLandingPageAction } from '@/server/actions/landing-pages';

export function LandingPageActions({ pageId, slug, published }: { pageId: string; slug: string; published: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/landing-pages/${pageId}`)}><Pencil /> Modifier</DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const r = await publishLandingPageAction(pageId, !published);
              if (r.ok) { toast.success(published ? 'Page dépubliée' : `Page publiée : ${r.data.url}`); router.refresh(); }
              else toast.error(r.error);
            }}
          >
            {published ? <><EyeOff /> Dépublier</> : <><Globe /> Publier</>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const r = await duplicateLandingPageAction(pageId);
              if (r.ok) { toast.success('Page dupliquée'); router.push(`/landing-pages/${r.data.id}`); }
              else toast.error(r.error);
            }}
          >
            <Copy /> Dupliquer
          </DropdownMenuItem>
          <DropdownMenuItem destructive onClick={() => setConfirm(true)}><Trash2 /> Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Supprimer cette landing page ?"
        description={`La page /${slug} et son formulaire seront supprimés. Les leads déjà générés sont conservés.`}
        destructive
        onConfirm={async () => {
          const r = await deleteLandingPageAction(pageId);
          if (r.ok) { toast.success('Page supprimée'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </>
  );
}
