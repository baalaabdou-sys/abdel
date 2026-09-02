'use client';
import * as React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SidebarNav } from './sidebar';
import { GlobalSearch } from './global-search';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { AiAssistant } from '@/components/ai/ai-assistant';

export function Topbar({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const [drawer, setDrawer] = React.useState(false);
  const [ai, setAi] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-4">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Menu">
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex-1">
        <GlobalSearch />
      </div>

      <Button variant="outline" size="sm" onClick={() => setAi(true)} className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Assistant IA</span>
      </Button>
      <NotificationBell />
      <ThemeToggle />
      <UserMenu workspaces={workspaces} />

      <Dialog open={drawer} onOpenChange={setDrawer}>
        <DialogContent className="left-0 top-0 h-full max-w-[17rem] translate-x-0 translate-y-0 rounded-none p-0 sm:rounded-none">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarNav onNavigate={() => setDrawer(false)} />
        </DialogContent>
      </Dialog>

      <AiAssistant open={ai} onOpenChange={setAi} />
    </header>
  );
}
