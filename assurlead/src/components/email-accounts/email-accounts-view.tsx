'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, AtSign, Send, CircleCheck, CircleX, TriangleAlert, Trash2, Pencil, PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { EMAIL_PROVIDER_FIELDS } from '@/lib/email-provider-fields';
import { dnsStatusLabel, dnsStatusTone } from '@/lib/domain';
import {
  saveEmailAccountAction, testEmailAccountAction, sendTestEmailAction,
  toggleEmailAccountAction, deleteEmailAccountAction,
} from '@/server/actions/email-accounts';
import { formatNumber, pct } from '@/lib/utils';
import type { DnsCheckStatus } from '@prisma/client';

type Account = {
  id: string; label: string; provider: string; fromEmail: string; fromName: string;
  replyTo: string | null; status: string; statusMessage: string | null;
  dailyLimit: number; hourlyLimit: number; warmupEnabled: boolean;
  warmupStartLimit: number; warmupIncrement: number; warmupStartAt: string | null;
  sentToday: number; sentTotal: number; bounceCount: number;
  lastSyncAt: string | null; active: boolean; campaignCount: number;
  domain: { id: string; domain: string; spf: DnsCheckStatus; dkim: DnsCheckStatus; dmarc: DnsCheckStatus } | null;
  credentials: Record<string, unknown>;
};

const PROVIDERS = [
  { value: 'DEMO', label: 'DEMO (aucun envoi réel)' },
  { value: 'SMTP', label: 'SMTP (générique, Microsoft, Google Workspace)' },
  { value: 'BREVO', label: 'Brevo' },
  { value: 'MAILGUN', label: 'Mailgun' },
  { value: 'SES', label: 'Amazon SES' },
  { value: 'POSTMARK', label: 'Postmark' },
];

const EMPTY: Omit<Account, 'id' | 'sentToday' | 'sentTotal' | 'bounceCount' | 'lastSyncAt' | 'campaignCount' | 'domain' | 'status' | 'statusMessage'> = {
  label: '', provider: 'SMTP', fromEmail: '', fromName: '', replyTo: null,
  dailyLimit: 500, hourlyLimit: 100, warmupEnabled: true,
  warmupStartLimit: 50, warmupIncrement: 50, warmupStartAt: null,
  active: true, credentials: {},
};

export function EmailAccountsView({ accounts, canWrite }: { accounts: Account[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Account | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Account | null>(null);
  const [testTarget, setTestTarget] = React.useState<Account | null>(null);
  const [testEmail, setTestEmail] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);

  const open = creating || !!editing;
  const initial = editing ?? ({ ...EMPTY } as Account);

  return (
    <div className="space-y-4">
      {canWrite ? (
        <Button size="sm" onClick={() => { setCreating(true); setEditing(null); }}>
          <Plus /> Ajouter un compte d’envoi
        </Button>
      ) : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={AtSign}
          title="Aucun compte d’envoi"
          description="Connectez un fournisseur (SMTP, Brevo, Mailgun, SES, Postmark) pour envoyer réellement vos campagnes."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {accounts.map((account) => {
            const usage = pct(account.sentToday, account.dailyLimit, 0);
            const bounceRate = pct(account.bounceCount, Math.max(1, account.sentTotal));
            return (
              <Card key={account.id} className={!account.active ? 'opacity-60' : undefined}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate">{account.label}</span>
                      {account.provider === 'DEMO' ? <Badge variant="warning">DEMO</Badge> : <Badge variant="secondary">{account.provider}</Badge>}
                    </CardTitle>
                    <CardDescription className="truncate">{account.fromName} &lt;{account.fromEmail}&gt;</CardDescription>
                  </div>
                  {canWrite ? (
                    <Switch
                      checked={account.active}
                      onCheckedChange={async (v) => {
                        const r = await toggleEmailAccountAction(account.id, v);
                        if (r.ok) router.refresh(); else toast.error(r.error);
                      }}
                      aria-label="Activer le compte"
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={account.status === 'CONNECTED' ? 'success' : account.status === 'ERROR' ? 'destructive' : 'muted'}>
                      {account.status === 'CONNECTED' ? <CircleCheck className="h-2.5 w-2.5" /> : account.status === 'ERROR' ? <CircleX className="h-2.5 w-2.5" /> : null}
                      {account.status === 'CONNECTED' ? 'Connecté' : account.status === 'ERROR' ? 'Erreur' : 'Non testé'}
                    </Badge>
                    {account.domain ? (
                      <>
                        <Badge variant={dnsStatusTone[account.domain.spf]}>SPF : {dnsStatusLabel(account.domain.spf)}</Badge>
                        <Badge variant={dnsStatusTone[account.domain.dkim]}>DKIM : {dnsStatusLabel(account.domain.dkim)}</Badge>
                        <Badge variant={dnsStatusTone[account.domain.dmarc]}>DMARC : {dnsStatusLabel(account.domain.dmarc)}</Badge>
                      </>
                    ) : null}
                  </div>

                  {account.statusMessage ? (
                    <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">{account.statusMessage}</p>
                  ) : null}

                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>Envoyés aujourd’hui</span>
                      <span className="num">{formatNumber(account.sentToday)} / {formatNumber(account.dailyLimit)}</span>
                    </div>
                    <Progress value={Math.min(100, usage)} indicatorClassName={usage > 90 ? 'bg-warning' : undefined} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total envoyé</p>
                      <p className="num font-semibold">{formatNumber(account.sentTotal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taux de rebond</p>
                      <p className={`num font-semibold ${bounceRate > 3 ? 'text-warning' : ''}`}>{bounceRate} %</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Campagnes</p>
                      <p className="num font-semibold">{account.campaignCount}</p>
                    </div>
                  </div>

                  {account.warmupEnabled ? (
                    <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-muted-foreground">
                      Montée en charge progressive activée : démarrage à {account.warmupStartLimit} envois/jour,
                      +{account.warmupIncrement} par jour jusqu’à {formatNumber(account.dailyLimit)}.
                    </p>
                  ) : null}

                  <p className="text-[10px] text-muted-foreground">
                    Dernière synchronisation : {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString('fr-FR') : 'jamais'}
                  </p>

                  {canWrite ? (
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(account); setCreating(false); }}>
                        <Pencil /> Modifier
                      </Button>
                      <Button
                        size="sm" variant="outline" loading={busy === `test-${account.id}`}
                        onClick={async () => {
                          setBusy(`test-${account.id}`);
                          const r = await testEmailAccountAction(account.id);
                          setBusy(null);
                          if (r.ok) {
                            if (r.data.simulated) toast.warning(r.data.message);
                            else if (r.data.ok) toast.success(r.data.message);
                            else toast.error(r.data.message);
                            router.refresh();
                          } else toast.error(r.error);
                        }}
                      >
                        <PlugZap /> Tester la connexion
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setTestTarget(account); setTestEmail(''); }}>
                        <Send /> Email de test
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(account)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Authentifier votre domaine et surveiller votre réputation améliore la délivrabilité. Aucun outil,
        y compris celui-ci, ne peut garantir l’arrivée en boîte de réception principale.
        Consultez <Link href="/deliverability" className="text-primary hover:underline">Délivrabilité</Link> pour la configuration DNS.
      </p>

      <AccountDialog
        key={editing?.id ?? 'new'}
        open={open}
        initial={initial}
        isEdit={!!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />

      <Dialog open={!!testTarget} onOpenChange={(v) => { if (!v) setTestTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un email de test</DialogTitle>
            <DialogDescription>
              {testTarget?.provider === 'DEMO'
                ? 'Ce compte utilise le fournisseur DEMO : aucun email ne sera réellement transmis.'
                : 'Un message de vérification sera envoyé via ce compte.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Adresse de destination</Label>
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="vous@societe.fr" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestTarget(null)}>Annuler</Button>
            <Button
              loading={busy === 'send-test'}
              onClick={async () => {
                if (!testTarget) return;
                setBusy('send-test');
                const r = await sendTestEmailAction(testTarget.id, testEmail);
                setBusy(null);
                if (r.ok) {
                  toast[r.data.simulated ? 'warning' : 'success'](
                    r.data.simulated ? 'Envoi simulé (DEMO) — aucun email réel transmis.' : 'Email de test envoyé.',
                  );
                  setTestTarget(null);
                } else toast.error(r.error);
              }}
            >
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null); }}
        title="Supprimer ce compte d’envoi ?"
        description="Les campagnes passées conservent leur historique, mais ce compte ne pourra plus être utilisé."
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteEmailAccountAction(deleting.id);
          if (r.ok) { toast.success('Compte supprimé'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </div>
  );
}

function AccountDialog({
  open, initial, isEdit, onOpenChange, onSaved,
}: {
  open: boolean; initial: Account; isEdit: boolean;
  onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const [values, setValues] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const fields = EMAIL_PROVIDER_FIELDS[values.provider] ?? [];

  React.useEffect(() => setValues(initial), [initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le compte' : 'Nouveau compte d’envoi'}</DialogTitle>
          <DialogDescription>Les identifiants sont chiffrés avant stockage et ne sont jamais renvoyés au navigateur.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nom interne *</Label>
            <Input value={values.label} onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))} placeholder="Expéditeur principal" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Fournisseur</Label>
            <Select value={values.provider} onValueChange={(p) => setValues((v) => ({ ...v, provider: p, credentials: {} }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nom expéditeur *</Label>
            <Input value={values.fromName} onChange={(e) => setValues((v) => ({ ...v, fromName: e.target.value }))} placeholder="Cabinet Dupont" />
          </div>
          <div className="space-y-1.5">
            <Label>Adresse expéditrice *</Label>
            <Input type="email" value={values.fromEmail} onChange={(e) => setValues((v) => ({ ...v, fromEmail: e.target.value }))} placeholder="contact@votredomaine.fr" />
          </div>
          <div className="space-y-1.5">
            <Label>Adresse de réponse</Label>
            <Input type="email" value={values.replyTo ?? ''} onChange={(e) => setValues((v) => ({ ...v, replyTo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Limite quotidienne</Label>
            <Input type="number" value={values.dailyLimit} onChange={(e) => setValues((v) => ({ ...v, dailyLimit: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Limite horaire</Label>
            <Input type="number" value={values.hourlyLimit} onChange={(e) => setValues((v) => ({ ...v, hourlyLimit: Number(e.target.value) }))} />
          </div>

          {fields.length > 0 ? (
            <div className="sm:col-span-2 space-y-3 rounded-lg border p-3">
              <p className="text-xs font-semibold">Identifiants {values.provider}</p>
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={Boolean(values.credentials[field.key])}
                      onCheckedChange={(checked) => setValues((v) => ({ ...v, credentials: { ...v.credentials, [field.key]: checked } }))}
                    />
                  ) : (
                    <Input
                      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                      placeholder={field.placeholder}
                      value={String(values.credentials[field.key] ?? '')}
                      onChange={(e) => setValues((v) => ({ ...v, credentials: { ...v.credentials, [field.key]: e.target.value } }))}
                    />
                  )}
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">
                Laissez « •••••••• » pour conserver la valeur existante.
              </p>
            </div>
          ) : (
            <p className="sm:col-span-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[11px] text-warning">
              Le fournisseur DEMO n’envoie aucun email réel. Il permet de tester l’intégralité du parcours
              (file d’envoi, liens de suivi, landing page, création de leads) sans configuration externe.
            </p>
          )}

          <div className="sm:col-span-2 space-y-2.5 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">Montée en charge progressive</p>
                <p className="text-[10px] text-muted-foreground">
                  Augmente le volume quotidien jour après jour, plutôt que d’envoyer un gros volume d’un coup.
                </p>
              </div>
              <Switch checked={values.warmupEnabled} onCheckedChange={(v) => setValues((s) => ({ ...s, warmupEnabled: v }))} />
            </div>
            {values.warmupEnabled ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Volume initial / jour</Label>
                  <Input type="number" className="h-8" value={values.warmupStartLimit}
                    onChange={(e) => setValues((v) => ({ ...v, warmupStartLimit: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Incrément quotidien</Label>
                  <Input type="number" className="h-8" value={values.warmupIncrement}
                    onChange={(e) => setValues((v) => ({ ...v, warmupIncrement: Number(e.target.value) }))} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              const r = await saveEmailAccountAction(isEdit ? initial.id : null, {
                label: values.label, provider: values.provider, fromEmail: values.fromEmail,
                fromName: values.fromName, replyTo: values.replyTo ?? '',
                dailyLimit: values.dailyLimit, hourlyLimit: values.hourlyLimit,
                warmupEnabled: values.warmupEnabled, warmupStartLimit: values.warmupStartLimit,
                warmupIncrement: values.warmupIncrement, credentials: values.credentials,
              });
              setSaving(false);
              if (r.ok) { toast.success('Compte enregistré'); onSaved(); } else toast.error(r.error);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
