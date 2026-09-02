'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Copy, Check, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { addDomainAction, checkDomainAction } from '@/server/actions/email-accounts';
import { dnsStatusLabel, dnsStatusTone } from '@/lib/domain';
import type { DnsCheckStatus } from '@prisma/client';

type Domain = {
  id: string; domain: string;
  spf: DnsCheckStatus; dkim: DnsCheckStatus; dmarc: DnsCheckStatus; trackingCname: DnsCheckStatus;
  spfRecord: string | null; dmarcRecord: string | null; dkimRecord: string | null;
  lastCheckedAt: string | null; notes: string | null;
  accounts: { id: string; label: string }[];
  instructions: { type: string; host: string; value: string; title: string; help: string }[];
};

export function DeliverabilityView({
  domains, accounts, webhookBaseUrl, workspaceId, canWrite,
}: {
  domains: Domain[];
  accounts: { id: string; label: string; provider: string; status: string; sentTotal: number; bounceCount: number }[];
  webhookBaseUrl: string;
  workspaceId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [domainName, setDomainName] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copié');
    setTimeout(() => setCopied(null), 1500);
  };

  const providersWithWebhooks = accounts.filter((a) => ['BREVO', 'MAILGUN', 'POSTMARK', 'SES'].includes(a.provider));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Domaines d’envoi</h2>
        {canWrite ? <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus /> Ajouter un domaine</Button> : null}
      </div>

      {domains.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Aucun domaine enregistré"
          description="Ajoutez le domaine que vous utilisez pour envoyer vos campagnes afin de vérifier son authentification."
        />
      ) : (
        domains.map((domain) => (
          <Card key={domain.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle>{domain.domain}</CardTitle>
                <CardDescription>
                  {domain.accounts.length > 0 ? `Utilisé par : ${domain.accounts.map((a) => a.label).join(', ')}` : 'Aucun compte rattaché'}
                  {domain.lastCheckedAt ? ` · vérifié le ${new Date(domain.lastCheckedAt).toLocaleString('fr-FR')}` : ' · jamais vérifié'}
                </CardDescription>
              </div>
              <Button
                size="sm" variant="outline" loading={busy === domain.id}
                onClick={async () => {
                  setBusy(domain.id);
                  const r = await checkDomainAction(domain.id);
                  setBusy(null);
                  if (r.ok) { toast.success('Vérification DNS effectuée'); router.refresh(); } else toast.error(r.error);
                }}
              >
                <RefreshCw /> Vérifier le DNS
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={dnsStatusTone[domain.spf]}>SPF : {dnsStatusLabel(domain.spf)}</Badge>
                <Badge variant={dnsStatusTone[domain.dkim]}>DKIM : {dnsStatusLabel(domain.dkim)}</Badge>
                <Badge variant={dnsStatusTone[domain.dmarc]}>DMARC : {dnsStatusLabel(domain.dmarc)}</Badge>
                <Badge variant={dnsStatusTone[domain.trackingCname]}>Domaine de tracking : {dnsStatusLabel(domain.trackingCname)}</Badge>
              </div>

              {domain.notes ? (
                <ul className="space-y-0.5 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                  {domain.notes.split('\n').filter(Boolean).map((note, i) => <li key={i}>• {note}</li>)}
                </ul>
              ) : null}

              <details className="rounded-lg border">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
                  Enregistrements DNS à créer chez votre hébergeur
                </summary>
                <div className="border-t p-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Nom / Hôte</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domain.instructions.map((rec) => (
                        <TableRow key={rec.title}>
                          <TableCell className="font-mono text-[11px]">{rec.type}</TableCell>
                          <TableCell className="break-all font-mono text-[11px]">{rec.host}</TableCell>
                          <TableCell className="max-w-md">
                            <p className="break-all font-mono text-[11px]">{rec.value}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{rec.help}</p>
                          </TableCell>
                          <TableCell>
                            <Button size="icon-sm" variant="ghost" onClick={() => copy(rec.value, `${domain.id}-${rec.title}`)} aria-label="Copier">
                              {copied === `${domain.id}-${rec.title}` ? <Check className="text-success" /> : <Copy />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Les valeurs exactes (include SPF, clé DKIM) sont fournies par votre fournisseur d’envoi.
                    Après modification, la propagation DNS peut prendre plusieurs heures.
                  </p>
                </div>
              </details>
            </CardContent>
          </Card>
        ))
      )}

      {providersWithWebhooks.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhooks fournisseur</CardTitle>
            <CardDescription>
              Configurez ces URL chez votre fournisseur pour recevoir les événements de délivrance, rebond,
              plainte et désinscription. Les événements dupliqués sont ignorés automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {providersWithWebhooks.map((account) => {
              const url = `${webhookBaseUrl}/${account.provider.toLowerCase()}?ws=${workspaceId}`;
              return (
                <div key={account.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{account.label} · {account.provider}</span>
                    <span className="block break-all font-mono text-[10px] text-muted-foreground">{url}</span>
                  </span>
                  <Button size="icon-sm" variant="ghost" onClick={() => copy(url, account.id)} aria-label="Copier l’URL">
                    {copied === account.id ? <Check className="text-success" /> : <Copy />}
                  </Button>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground">
              Renseignez également le secret de webhook du fournisseur dans « Intégrations » : en production,
              les événements non signés sont refusés.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un domaine d’envoi</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Nom de domaine</Label>
            <Input value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="votredomaine.fr" />
            <p className="text-[10px] text-muted-foreground">Le DNS est vérifié immédiatement après l’ajout.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              loading={busy === 'add'}
              onClick={async () => {
                setBusy('add');
                const r = await addDomainAction(domainName);
                setBusy(null);
                if (r.ok) { toast.success('Domaine ajouté et vérifié'); setOpen(false); setDomainName(''); router.refresh(); }
                else toast.error(r.error);
              }}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
