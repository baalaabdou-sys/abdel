'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronsUpDown, LogOut, Settings, Languages, Check, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/utils';
import { signOutAction, setLocaleAction, switchWorkspaceAction } from '@/server/actions/auth';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { ROLE_LABELS } from '@/lib/rbac';
import { useWorkspace } from '@/providers/workspace-provider';
import { useI18n } from '@/providers/i18n-provider';

export function UserMenu({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const { userName, userEmail, role, workspaceId, workspaceName } = useWorkspace();
  const { locale } = useI18n();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{initials(userName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-xs font-medium sm:inline">{userName}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs font-semibold text-foreground">{userName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {ROLE_LABELS[role][locale as 'fr' | 'en'] ?? ROLE_LABELS[role].fr} · {workspaceName}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.length > 1 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-sm"><Building2 className="h-4 w-4" /> Espace de travail</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {workspaces.map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    onClick={async () => { await switchWorkspaceAction(w.id); router.refresh(); }}
                  >
                    {w.id === workspaceId ? <Check /> : <span className="w-4" />} {w.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ) : null}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-sm"><Languages className="h-4 w-4" /> Langue</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {LOCALES.map((l: Locale) => (
                <DropdownMenuItem key={l} onClick={async () => { await setLocaleAction(l); router.refresh(); }}>
                  {l === locale ? <Check /> : <span className="w-4" />} {LOCALE_LABELS[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings /> Paramètres</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={() => signOutAction()}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
