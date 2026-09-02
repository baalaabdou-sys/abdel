'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Users, Send, Flame, Filter, LayoutTemplate, CheckSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Hit = { id: string; type: string; title: string; subtitle: string; href: string };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contact: Users, campaign: Send, lead: Flame, segment: Filter, landing: LayoutTemplate, task: CheckSquare,
};

const TYPE_LABEL: Record<string, string> = {
  contact: 'Contact', campaign: 'Campagne', lead: 'Lead',
  segment: 'Segment', landing: 'Landing page', task: 'Tâche',
};

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.results ?? []);
          setCursor(0);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const go = (hit: Hit) => {
    setOpen(false);
    setQuery('');
    router.push(hit.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Rechercher partout…</span>
        <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 p-0" hideClose>
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === 'Enter' && hits[cursor]) { e.preventDefault(); go(hits[cursor]); }
              }}
              placeholder="Contacts, campagnes, leads, segments…"
              className="h-12 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {hits.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                {query.trim().length < 2 ? 'Tapez au moins 2 caractères.' : 'Aucun résultat.'}
              </p>
            ) : (
              hits.map((hit, i) => {
                const Icon = ICONS[hit.type] ?? Search;
                return (
                  <button
                    key={`${hit.type}-${hit.id}`}
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(hit)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      i === cursor ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{hit.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABEL[hit.type] ?? hit.type}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
