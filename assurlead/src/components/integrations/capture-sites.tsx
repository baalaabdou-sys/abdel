'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Globe, Copy, Check, Trash2, Pencil, KeyRound, Code2, TriangleAlert, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';
import { formatNumber, pct } from '@/lib/utils';
import {
  saveCaptureSiteAction, deleteCaptureSiteAction, toggleCaptureSiteAction,
  rotateCaptureSecretAction, createCaptureFormAction,
} from '@/server/actions/capture';
import type { InsuranceType } from '@prisma/client';

export type CaptureSiteRow = {
  id: string; name: string; url: string; publicKey: string;
  allowedOrigins: string[]; formId: string | null; formName: string | null;
  product: InsuranceType; fieldMapping: Record<string, string>;
  consentText: string; requireConsentField: boolean; active: boolean;
  viewCount: number; leadCount: number; lastEventAt: string | null;
};

const EMPTY = {
  name: '', url: '', allowedOrigins: '', formId: '', product: 'AUTRE' as InsuranceType,
  fieldMapping: '', consentText: '', requireConsentField: true,
};

export function CaptureSites({
  sites, forms, appUrl, canWrite,
}: {
  sites: CaptureSiteRow[];
  forms: { id: string; name: string }[];
  appUrl: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CaptureSiteRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CaptureSiteRow | null>(null);
  const [secret, setSecret] = React.useState<{ name: string; key: string } | null>(null);
  const [snippetFor, setSnippetFor] = React.useState<CaptureSiteRow | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copié');
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 text-muted-foreground" /> Pages externes (capture)
          </h2>
          <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
            Si vous avez déjà vos propres landing pages, vous n’avez pas à les refaire ici. Déclarez
            le domaine, collez une ligne de script sur la page, et les visites comme les demandes
            remontent dans ASSURLEAD AI — avec le même scoring, les mêmes notifications et la même
            attribution de campagne qu’une page hébergée.
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" onClick={() => { setCreating(true); setEditing(null); }}>
            <Plus /> Déclarer une page externe
          </Button>
        ) : null}
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Aucune page externe déclarée"
          description="Déclarez la page que vos campagnes utilisent déjà : c’est ce qui permet de relier un clic dans l’email à un lead qualifié."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sites.map((site) => {
            const conversion = pct(site.leadCount, Math.max(1, site.viewCount));
            return (
              <Card key={site.id} className={site.active ? undefined : 'opacity-60'}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{site.name}</CardTitle>
                    <CardDescription className="truncate">
                      {site.allowedOrigins.join(', ')}
                    </CardDescription>
                  </div>
                  {canWrite ? (
                    <Switch
                      checked={site.active}
                      onCheckedChange={async (v) => {
                        const r = await toggleCaptureSiteAction(site.id, v);
                        if (r.ok) router.refresh(); else toast.error(r.error);
                      }}
                      aria-label="Activer la capture"
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{insuranceLabel(site.product)}</Badge>
                    {site.formName
                      ? <Badge variant="success">Formulaire : {site.formName}</Badge>
                      : <Badge variant="destructive">Aucun formulaire rattaché</Badge>}
                    {site.requireConsentField ? null : <Badge variant="warning">Consentement non exigé</Badge>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Visites</p>
                      <p className="num font-semibold">{formatNumber(site.viewCount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Leads</p>
                      <p className="num font-semibold">{formatNumber(site.leadCount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversion</p>
                      <p className="num font-semibold">{conversion} %</p>
                    </div>
                  </div>

                  {!site.formName ? (
                    <p className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Sans formulaire rattaché, les soumissions de cette page ne peuvent pas devenir
                      des leads. Modifiez le site et choisissez ou créez un formulaire.
                    </p>
                  ) : null}

                  <p className="text-[10px] text-muted-foreground">
                    Dernier événement : {site.lastEventAt ? new Date(site.lastEventAt).toLocaleString('fr-FR') : 'aucun'}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setSnippetFor(site)}>
                      <Code2 /> Script à coller
                    </Button>
                    {site.url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={site.url} target="_blank" rel="noreferrer">Ouvrir <ExternalLink /></a>
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditing(site); setCreating(false); }}>
                          <Pencil /> Modifier
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={async () => {
                            const r = await rotateCaptureSecretAction(site.id);
                            if (r.ok) setSecret({ name: site.name, key: r.data.secretKey });
                            else toast.error(r.error);
                          }}
                        >
                          <KeyRound /> Nouvelle clé serveur
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(site)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SiteDialog
        key={editing?.id ?? 'new'}
        open={creating || !!editing}
        site={editing}
        forms={forms}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        onSaved={(newSecret, name) => {
          setCreating(false);
          setEditing(null);
          if (newSecret) setSecret({ name, key: newSecret });
          router.refresh();
        }}
      />

      <SnippetDialog
        site={snippetFor}
        appUrl={appUrl}
        onOpenChange={(v) => { if (!v) setSnippetFor(null); }}
        onCopy={copy}
        copied={copied}
      />

      <Dialog open={!!secret} onOpenChange={(v) => { if (!v) setSecret(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clé secrète — affichée une seule fois</DialogTitle>
            <DialogDescription>
              Pour {secret?.name}. Elle sert uniquement aux envois depuis votre propre serveur.
              Conservez-la maintenant : elle est stockée hachée et ne pourra pas être réaffichée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{secret?.key}</code>
            <Button size="icon-sm" variant="ghost" aria-label="Copier"
              onClick={() => secret && copy(secret.key, 'secret')}>
              {copied === 'secret' ? <Check className="text-success" /> : <Copy />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecret(null)}>J’ai copié la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null); }}
        title="Supprimer ce site de capture ?"
        description="La page cessera immédiatement de remonter visites et leads. Les leads déjà créés sont conservés."
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteCaptureSiteAction(deleting.id);
          if (r.ok) { toast.success('Site supprimé'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </section>
  );
}

function SiteDialog({
  open, site, forms, onOpenChange, onSaved,
}: {
  open: boolean;
  site: CaptureSiteRow | null;
  forms: { id: string; name: string }[];
  onOpenChange: (v: boolean) => void;
  onSaved: (secretKey: string | undefined, name: string) => void;
}) {
  const [values, setValues] = React.useState(
    site
      ? {
          name: site.name, url: site.url, allowedOrigins: site.allowedOrigins.join('\n'),
          formId: site.formId ?? '', product: site.product,
          fieldMapping: Object.entries(site.fieldMapping).map(([k, v]) => `${k} = ${v}`).join('\n'),
          consentText: site.consentText, requireConsentField: site.requireConsentField,
        }
      : EMPTY,
  );
  const [saving, setSaving] = React.useState(false);
  const [creatingForm, setCreatingForm] = React.useState(false);
  const [localForms, setLocalForms] = React.useState(forms);

  React.useEffect(() => {
    setValues(
      site
        ? {
            name: site.name, url: site.url, allowedOrigins: site.allowedOrigins.join('\n'),
            formId: site.formId ?? '', product: site.product,
            fieldMapping: Object.entries(site.fieldMapping).map(([k, v]) => `${k} = ${v}`).join('\n'),
            consentText: site.consentText, requireConsentField: site.requireConsentField,
          }
        : EMPTY,
    );
  }, [site]);

  const parseMapping = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of values.fieldMapping.split('\n')) {
      const [from, to] = line.split('=').map((p) => p.trim());
      if (from && to) out[from] = to;
    }
    return out;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{site ? 'Modifier la page externe' : 'Déclarer une page externe'}</DialogTitle>
          <DialogDescription>
            Seuls les domaines listés ici pourront envoyer des données à votre espace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nom interne *</Label>
            <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Étude comparative sénior" />
          </div>
          <div className="space-y-1.5">
            <Label>URL de la page</Label>
            <Input value={values.url} onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
              placeholder="https://exemple.fr/etude-comparative" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Domaines autorisés * (un par ligne)</Label>
            <Textarea rows={3} className="font-mono text-xs"
              value={values.allowedOrigins}
              onChange={(e) => setValues((v) => ({ ...v, allowedOrigins: e.target.value }))}
              placeholder={'exemple.fr\nwww.exemple.fr'} />
            <p className="text-[10px] text-muted-foreground">
              Une requête venant d’un autre domaine est refusée. Ajoutez la version avec et sans
              « www » si les deux sont utilisées.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Produit d’assurance</Label>
            <Select value={values.product} onValueChange={(v) => setValues((s) => ({ ...s, product: v as InsuranceType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Appliqué si la page n’indique pas le produit.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Formulaire de rattachement *</Label>
            <div className="flex gap-1.5">
              <Select value={values.formId || 'none'} onValueChange={(v) => setValues((s) => ({ ...s, formId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {localForms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="icon" aria-label="Créer un formulaire de capture"
                loading={creatingForm}
                onClick={async () => {
                  setCreatingForm(true);
                  const r = await createCaptureFormAction(
                    `Capture — ${values.name || 'page externe'}`,
                    values.product,
                  );
                  setCreatingForm(false);
                  if (r.ok) {
                    const name = `Capture — ${values.name || 'page externe'}`;
                    setLocalForms((f) => [...f, { id: r.data.id, name }]);
                    setValues((s) => ({ ...s, formId: r.data.id }));
                    toast.success('Formulaire de capture créé');
                  } else toast.error(r.error);
                }}
              >
                <Plus />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nécessaire pour transformer une soumission en lead. Le bouton en crée un adapté.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Correspondance des champs (facultatif)</Label>
            <Textarea rows={3} className="font-mono text-xs"
              value={values.fieldMapping}
              onChange={(e) => setValues((v) => ({ ...v, fieldMapping: e.target.value }))}
              placeholder={'votre_email = email\nnum_tel = telephone'} />
            <p className="text-[10px] text-muted-foreground">
              Un champ par ligne, au format <code className="rounded bg-muted px-1">nom_sur_votre_page = champ_assurlead</code>.
              Les noms courants (email, nom, prénom, téléphone, code postal, ville…) sont reconnus
              automatiquement : ne remplissez ceci que pour les cas particuliers.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Texte de consentement affiché sur votre page</Label>
            <Textarea rows={2} value={values.consentText}
              onChange={(e) => setValues((v) => ({ ...v, consentText: e.target.value }))}
              placeholder="Recopiez ici la mention affichée à côté de la case à cocher." />
            <p className="text-[10px] text-muted-foreground">
              Archivé avec chaque lead, comme preuve de ce qui a été présenté au visiteur.
            </p>
          </div>

          <div className="sm:col-span-2 flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-xs font-medium">Exiger une case de consentement sur la page</p>
              <p className="text-[10px] text-muted-foreground">
                Recommandé. Si la page n’en comporte pas, les leads sont tout de même créés mais
                enregistrés avec un consentement « inconnu » — jamais présumé accordé.
              </p>
            </div>
            <Switch checked={values.requireConsentField}
              onCheckedChange={(v) => setValues((s) => ({ ...s, requireConsentField: v }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              const r = await saveCaptureSiteAction(site?.id ?? null, {
                name: values.name,
                url: values.url,
                allowedOrigins: values.allowedOrigins.split('\n').map((s) => s.trim()).filter(Boolean),
                formId: values.formId || null,
                product: values.product,
                fieldMapping: parseMapping(),
                consentText: values.consentText,
                requireConsentField: values.requireConsentField,
              });
              setSaving(false);
              if (r.ok) {
                toast.success(site ? 'Site mis à jour' : 'Site de capture créé');
                onSaved(r.data.secretKey, values.name);
              } else toast.error(r.error);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnippetDialog({
  site, appUrl, onOpenChange, onCopy, copied,
}: {
  site: CaptureSiteRow | null;
  appUrl: string;
  onOpenChange: (v: boolean) => void;
  onCopy: (text: string, key: string) => void;
  copied: string | null;
}) {
  if (!site) return null;

  const snippet = `<script src="${appUrl}/api/embed" data-assurlead-key="${site.publicKey}" defer></script>`;
  const serverExample = `curl -X POST ${appUrl}/api/capture/lead \\
  -H "Authorization: Bearer <VOTRE_CLÉ_SECRÈTE>" \\
  -H "content-type: application/json" \\
  -d '{
    "token": "<valeur du paramètre alid, si présent>",
    "fields": {
      "prenom": "Marie", "nom": "Durand",
      "email": "marie.durand@exemple.fr",
      "telephone": "0612345678",
      "code_postal": "69003",
      "consentement": true
    }
  }'`;

  return (
    <Dialog open={!!site} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Installer la capture sur {site.name}</DialogTitle>
          <DialogDescription>
            Une seule ligne à coller. Elle ne modifie pas votre page et n’interfère pas avec vos
            formulaires existants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>1. Collez ceci avant la balise &lt;/body&gt; de votre page</Label>
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{snippet}</code>
              <Button size="icon-sm" variant="ghost" aria-label="Copier le script"
                onClick={() => onCopy(snippet, 'snippet')}>
                {copied === 'snippet' ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold">Ce que fait le script, automatiquement</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>• Il conserve le jeton <code className="rounded bg-muted px-1">?alid</code> du lien de campagne pendant toute la visite, pour attribuer le lead à la bonne campagne.</li>
              <li>• Il enregistre la visite de la page et le début de saisie du formulaire.</li>
              <li>• À l’envoi du formulaire, il transmet les champs et crée un lead scoré, notifié et assigné.</li>
              <li>• En cas de problème, il n’empêche jamais l’envoi de votre propre formulaire.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold">Cas particuliers</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>• Formulaire à ignorer : ajoutez <code className="rounded bg-muted px-1">data-assurlead-ignore</code> sur la balise <code className="rounded bg-muted px-1">&lt;form&gt;</code>.</li>
              <li>• Parcours sur mesure : appelez <code className="rounded bg-muted px-1">assurlead.submit({'{'} email, telephone {'}'})</code> vous-même.</li>
              <li>• Formulaire multi-étapes : <code className="rounded bg-muted px-1">assurlead.step(2)</code> à chaque étape validée.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label>2. Alternative : envoi depuis votre serveur</Label>
            <p className="text-[11px] text-muted-foreground">
              Plus fiable qu’une capture navigateur, car l’appel ne peut pas être falsifié depuis la
              page. Utilisez la clé secrète affichée à la création du site.
            </p>
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3">
              <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px]">{serverExample}</pre>
              <Button size="icon-sm" variant="ghost" aria-label="Copier l’exemple"
                onClick={() => onCopy(serverExample, 'server')}>
                {copied === 'server' ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Clé publique de ce site</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
              <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{site.publicKey}</code>
              <Button size="icon-sm" variant="ghost" aria-label="Copier la clé"
                onClick={() => onCopy(site.publicKey, 'public')}>
                {copied === 'public' ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Cette clé est visible dans le code source de votre page : ce n’est pas un secret. La
              protection vient de la liste des domaines autorisés ({site.allowedOrigins.join(', ')}).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
