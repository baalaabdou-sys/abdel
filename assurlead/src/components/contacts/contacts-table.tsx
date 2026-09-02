'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, ShieldCheck, Ban, Tag, Trash2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  verificationLabel, verificationTone, consentLabel, consentTone,
  insuranceLabel, INSURANCE_TYPES, contactStatusLabel,
} from '@/lib/domain';
import type { ContactFilters } from '@/server/actions/contacts';
import { deleteContactsAction, suppressContactsAction, verifyContactsAction, bulkTagAction } from '@/server/actions/contacts';
import type { ConsentState, InsuranceType, VerificationStatus, ContactStatus } from '@prisma/client';

export type ContactRow = {
  id: string; email: string; firstName: string | null; lastName: string | null;
  phone: string | null; city: string | null; postalCode: string | null;
  insuranceInterests: InsuranceType[]; currentInsurer: string | null; renewalDate: string | null;
  verificationStatus: VerificationStatus; consentEmail: ConsentState; suppressed: boolean;
  status: ContactStatus; source: string | null; tags: string[]; createdAt: string;
};

export function ContactsTable({
  rows, total, page, pageSize, filters, canWrite, canDelete, canSuppress,
}: {
  rows: ContactRow[]; total: number; page: number; pageSize: number;
  filters: ContactFilters; canWrite: boolean; canDelete: boolean; canSuppress: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState(filters.q ?? '');
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmSuppress, setConfirmSuppress] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      if (key !== 'page') next.delete('page');
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.q ?? '') !== query) setParam('q', query || null);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, filters.q, setParam]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const ids = [...selected];

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        setSelected(new Set());
        router.refresh();
      } else toast.error(result.error ?? 'Erreur');
    });
  };

  const activeFilters = [
    filters.verification && filters.verification !== 'all',
    filters.consent && filters.consent !== 'all',
    filters.product && filters.product !== 'all',
    filters.status && filters.status !== 'all',
    filters.suppressed,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, email, téléphone, ville…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Select value={filters.verification ?? 'all'} onValueChange={(v) => setParam('verification', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Vérification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute vérification</SelectItem>
            {(['VALID', 'LIKELY_VALID', 'CATCH_ALL', 'RISKY', 'INVALID', 'UNVERIFIED'] as VerificationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{verificationLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.consent ?? 'all'} onValueChange={(v) => setParam('consent', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Consentement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout consentement</SelectItem>
            {(['GRANTED', 'UNKNOWN', 'DENIED', 'WITHDRAWN'] as ConsentState[]).map((s) => (
              <SelectItem key={s} value={s}>{consentLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.product ?? 'all'} onValueChange={(v) => setParam('product', v)}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.suppressed ?? 'all'} onValueChange={(v) => setParam('suppressed', v)}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Suppression" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="no">Non supprimés</SelectItem>
            <SelectItem value="yes">Supprimés</SelectItem>
          </SelectContent>
        </Select>

        {activeFilters > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            <X /> Réinitialiser
          </Button>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2">
          <span className="text-xs font-medium">{selected.size} sélectionné(s)</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {canWrite ? (
              <Button size="sm" variant="outline" disabled={pending}
                onClick={() => run(() => verifyContactsAction(ids), 'Vérification lancée')}>
                {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Vérifier
              </Button>
            ) : null}
            {canWrite ? (
              <Button size="sm" variant="outline" disabled={pending}
                onClick={() => {
                  const tag = window.prompt('Tag à ajouter aux contacts sélectionnés :');
                  if (tag) run(() => bulkTagAction(ids, tag.trim(), 'add'), 'Tag ajouté');
                }}>
                <Tag /> Ajouter un tag
              </Button>
            ) : null}
            {canSuppress ? (
              <Button size="sm" variant="outline" onClick={() => setConfirmSuppress(true)}>
                <Ban /> Supprimer des envois
              </Button>
            ) : null}
            {canDelete ? (
              <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Supprimer définitivement
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Désélectionner</Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border">
        {rows.length === 0 ? (
          <EmptyState icon={Search} title="Aucun contact ne correspond" description="Modifiez vos filtres ou votre recherche." className="border-0" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Vérification</TableHead>
                  <TableHead>Consentement</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-state={selected.has(row.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(row.id); else next.delete(row.id);
                          setSelected(next);
                        }}
                        aria-label={`Sélectionner ${row.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/contacts/${row.id}`} className="block min-w-0">
                        <span className="flex items-center gap-1.5 font-medium hover:underline">
                          {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                          {row.suppressed ? <Badge variant="destructive">supprimé</Badge> : null}
                          {row.status === 'CUSTOMER' ? <Badge variant="secondary">{contactStatusLabel(row.status)}</Badge> : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{row.email}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.city ?? '—'}
                      {row.postalCode ? <span className="block">{row.postalCode}</span> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.insuranceInterests.slice(0, 2).map((t) => (
                          <Badge key={t} variant="secondary">{insuranceLabel(t)}</Badge>
                        ))}
                        {row.insuranceInterests.length > 2 ? <Badge variant="muted">+{row.insuranceInterests.length - 2}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.renewalDate ? new Date(row.renewalDate).toLocaleDateString('fr-FR') : '—'}
                      {row.currentInsurer ? <span className="block">{row.currentInsurer}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={verificationTone[row.verificationStatus]}>{verificationLabel(row.verificationStatus)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={consentTone[row.consentEmail]}>{consentLabel(row.consentEmail)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-36 truncate text-xs text-muted-foreground">{row.source ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={total} onPage={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer définitivement ${selected.size} contact(s) ?`}
        description="Cette action est irréversible : les contacts, leur historique de consentement et leurs événements associés seront effacés. Pour simplement les exclure des envois, utilisez « Supprimer des envois »."
        destructive
        requireTyping="SUPPRIMER"
        confirmLabel="Supprimer définitivement"
        onConfirm={() => run(() => deleteContactsAction(ids), 'Contacts supprimés')}
      />

      <ConfirmDialog
        open={confirmSuppress}
        onOpenChange={setConfirmSuppress}
        title={`Ajouter ${selected.size} contact(s) à la liste de suppression ?`}
        description="Ces contacts ne recevront plus aucun email marketing. Leurs données sont conservées et l’action est réversible depuis l’écran Suppression."
        confirmLabel="Ajouter à la liste"
        onConfirm={() => run(() => suppressContactsAction(ids, 'MANUAL_BLOCK', 'Ajout manuel depuis la liste des contacts'), 'Contacts ajoutés à la liste de suppression')}
      />
    </div>
  );
}
