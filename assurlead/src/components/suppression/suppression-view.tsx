'use client';
import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Search, Upload, Download, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { addSuppressionAction, exportSuppressionAction, importSuppressionAction, removeSuppressionAction } from '@/server/actions/suppression';

type Entry = {
  id: string; email: string | null; phone: string | null; reason: string; reasonLabel: string;
  source: string | null; notes: string | null; campaignId: string | null; createdAt: string;
};

export function SuppressionView({
  entries, total, page, pageSize, reasons, canWrite,
}: {
  entries: Entry[]; total: number; page: number; pageSize: number;
  reasons: { value: string; label: string }[]; canWrite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get('q') ?? '');
  const [addOpen, setAddOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<Entry | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState({ email: '', phone: '', reason: 'MANUAL_BLOCK', notes: '' });
  const [importContent, setImportContent] = React.useState('');
  const [importReason, setImportReason] = React.useState('DO_NOT_CONTACT');

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une adresse…" className="h-8 pl-8 text-xs" />
        </div>
        <Select value={params.get('reason') ?? 'all'} onValueChange={(v) => setParam('reason', v)}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Motif" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les motifs</SelectItem>
            {reasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          size="sm" variant="outline"
          onClick={async () => {
            const r = await exportSuppressionAction();
            if (!r.ok) { toast.error(r.error); return; }
            const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `liste-suppression-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download /> Exporter
        </Button>
        {canWrite ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload /> Importer</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus /> Ajouter</Button>
          </>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Liste de suppression vide"
              description="Les désinscriptions, rebonds définitifs et plaintes viendront s’ajouter ici automatiquement."
              className="border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                    {canWrite ? <TableHead className="w-10"></TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.email ?? entry.phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={['HARD_BOUNCE', 'COMPLAINT', 'INVALID'].includes(entry.reason) ? 'destructive' : 'warning'}>
                          {entry.reasonLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{entry.source ?? '—'}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{entry.notes ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <Button size="icon-sm" variant="ghost" onClick={() => setRemoving(entry)} aria-label="Retirer">
                            <Trash2 className="text-destructive" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} pageSize={pageSize} total={total} onPage={(p) => setParam('page', String(p))} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter à la liste de suppression</DialogTitle>
            <DialogDescription>Ce contact ne recevra plus aucun email marketing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Adresse email</Label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone (facultatif)</Label>
              <Input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Motif</Label>
              <Select value={draft.reason} onValueChange={(v) => setDraft((d) => ({ ...d, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{reasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const r = await addSuppressionAction(draft);
                setBusy(false);
                if (r.ok) { toast.success('Ajouté à la liste'); setAddOpen(false); setDraft({ email: '', phone: '', reason: 'MANUAL_BLOCK', notes: '' }); router.refresh(); }
                else toast.error(r.error);
              }}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer une liste de suppression</DialogTitle>
            <DialogDescription>Une adresse par ligne, ou un CSV dont la première colonne est l’email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motif appliqué à toutes les entrées</Label>
              <Select value={importReason} onValueChange={setImportReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{reasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Adresses</Label>
              <Textarea rows={8} className="font-mono text-xs" value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={'contact1@exemple.fr\ncontact2@exemple.fr'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const r = await importSuppressionAction(importContent, importReason);
                setBusy(false);
                if (r.ok) {
                  toast.success(`${r.data.added} adresse(s) ajoutée(s), ${r.data.skipped} ignorée(s)`);
                  setImportOpen(false); setImportContent(''); router.refresh();
                } else toast.error(r.error);
              }}
            >
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => { if (!v) setRemoving(null); }}
        title="Retirer de la liste de suppression ?"
        description={`${removing?.email ?? removing?.phone} pourra de nouveau recevoir des emails marketing, sous réserve de son consentement. Ne le faites que si vous disposez d’une base valable pour le recontacter.`}
        destructive
        confirmLabel="Retirer de la liste"
        onConfirm={async () => {
          if (!removing) return;
          const r = await removeSuppressionAction(removing.id);
          if (r.ok) { toast.success('Entrée retirée'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </div>
  );
}
