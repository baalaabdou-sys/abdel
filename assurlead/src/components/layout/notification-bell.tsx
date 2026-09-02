'use client';
import * as React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/server/actions/notifications';

type N = { id: string; title: string; body: string; link: string | null; level: string; read: boolean; createdAt: string };

const LEVEL_DOT: Record<string, string> = {
  INFO: 'bg-primary', SUCCESS: 'bg-success', WARNING: 'bg-warning', CRITICAL: 'bg-destructive',
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<N[]>([]);
  const [unread, setUnread] = React.useState(0);

  const load = React.useCallback(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.notifications ?? []);
        setUnread(d.unread ?? 0);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold">Notifications</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px]"
              onClick={async () => { await markAllNotificationsReadAction(); load(); }}
            >
              <CheckCheck className="h-3 w-3" /> Tout marquer lu
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">Aucune notification.</p>
          ) : (
            items.map((n) => {
              const Wrapper = n.link ? Link : 'div';
              return (
                <Wrapper
                  key={n.id}
                  // @ts-expect-error polymorphic wrapper
                  href={n.link ?? undefined}
                  onClick={async () => {
                    if (!n.read) { await markNotificationReadAction(n.id); load(); }
                    setOpen(false);
                  }}
                  className={cn('flex gap-2.5 border-b px-3 py-2.5 last:border-0', n.link && 'cursor-pointer hover:bg-accent/60', !n.read && 'bg-primary/[0.04]')}
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', LEVEL_DOT[n.level] ?? 'bg-muted-foreground')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{n.title}</span>
                    {n.body ? <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{n.body}</span> : null}
                    <span className="mt-1 block text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </span>
                </Wrapper>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
