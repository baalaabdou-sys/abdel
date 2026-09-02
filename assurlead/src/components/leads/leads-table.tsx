'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { LEAD_STATUS_LIST, leadStatusLabel, INSURANCE_TYPES, insuranceLabel, scoreBand } from '@/lib/domain';
import { assignLeadAction, updateLeadStatusAction } from '@/server/actions/leads';
import { cn } from '@/lib/utils';
import type { InsuranceType, LeadStatus } from '@prisma/client';

export type LeadRow = {
  id: string; firstName: string | null; lastName: string | null; email: string | null;
  phone: string | null; city: string | null; product: InsuranceType; status: LeadStatus;
  score: number; ownerId: string | null; ownerName: string | null; campaignName: string | null;
  createdAt: string; responseMinutes: number | null; firstActionAt: string | null;
};

export function LeadsTable({
  rows, total, page, pageSize, members, canAssign, canWrite,
}: {
  rows: LeadRow[]; total: number; page: number; pageSize: number;
  members: { id: string; name: string }[]; canAssign: boolean; canWrite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get('q') ?? '');

  const setParam = React.useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }, [params, pathname, router]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if ((params.get('q') ?? '') !== query) setParam('q', query || null);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, params, setParam]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, email, téléphone…" className="h-8 pl-8 text-xs" />
        </div>
        <Select value={params.get('status') ?? 'all'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {LEAD_STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{leadStatusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.get('product') ?? 'all'} onValueChange={(v) => setParam('product', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.get('owner') ?? 'all'} onValueChange={(v) => setParam('owner', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Commercial" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les commerciaux</SelectItem>
            <SelectItem value="unassigned">Non assignés</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.get('band') ?? 'all'} onValueChange={(v) => setParam('band', v)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les scores</SelectItem>
            <SelectItem value="qualified">Qualifiés (≥ 60)</SelectItem>
            <SelectItem value="hot">Chauds (≥ 80)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={params.get('filter') === 'uncontacted' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setParam('filter', params.get('filter') === 'uncontacted' ? null : 'uncontacted')}
        >
          <Clock /> Non contactés
        </Button>
        {params.toString() ? <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}><X /> Réinitialiser</Button> : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Score</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Commercial</TableHead>
            <TableHead>Réactivité</TableHead>
            <TableHead>Campagne</TableHead>
            <TableHead>Reçu le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const band = scoreBand(row.score);
            const waiting = !row.firstActionAt ? Math.round((Date.now() - new Date(row.createdAt).getTime()) / 60_000) : null;
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant={band.tone}>{band.emoji} {row.score}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/leads/${row.id}`} className="block min-w-0">
                    <span className="block truncate font-medium hover:underline">
                      {[row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || 'Lead'}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[row.phone, row.city].filter(Boolean).join(' · ') || row.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{insuranceLabel(row.product)}</TableCell>
                <TableCell>
                  {canWrite ? (
                    <Select
                      value={row.status}
                      onValueChange={async (v) => {
                        const r = await updateLeadStatusAction(row.id, v);
                        if (r.ok) { toast.success('Statut mis à jour'); router.refresh(); } else toast.error(r.error);
                      }}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{leadStatusLabel(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <Badge variant="secondary">{leadStatusLabel(row.status)}</Badge>}
                </TableCell>
                <TableCell>
                  {canAssign ? (
                    <Select
                      value={row.ownerId ?? 'none'}
                      onValueChange={async (v) => {
                        const r = await assignLeadAction(row.id, v === 'none' ? null : v, 'MANUAL');
                        if (r.ok) { toast.success('Lead assigné'); router.refresh(); } else toast.error(r.error);
                      }}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <span className="text-xs">{row.ownerName ?? '—'}</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {row.responseMinutes !== null ? (
                    <span className={cn(row.responseMinutes > 30 ? 'text-warning' : 'text-success')}>{row.responseMinutes} min</span>
                  ) : waiting !== null ? (
                    <span className={cn(waiting > 10 ? 'text-destructive' : 'text-muted-foreground')}>en attente {waiting} min</span>
                  ) : '—'}
                </TableCell>
                <TableCell className="max-w-36 truncate text-xs text-muted-foreground">{row.campaignName ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pagination page={page} pageSize={pageSize} total={total} onPage={(p) => setParam('page', String(p))} />
    </div>
  );
}
