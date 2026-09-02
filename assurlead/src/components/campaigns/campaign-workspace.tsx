'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Mail, LayoutTemplate, AtSign, CalendarClock, ShieldCheck, Eye, Rocket,
  BarChart3, Sparkles, Play, Pause, XCircle, Loader2, CheckCircle2, TriangleAlert,
  CircleAlert, Info, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FunnelChart } from '@/components/dashboard/funnel-chart';
import {
  updateCampaignAction, saveVariantsAction, checkReadinessAction, previewRecipientsAction,
  launchCampaignAction, pauseCampaignAction, resumeCampaignAction, cancelCampaignAction,
  tickCampaignAction, generateEmailAction, rewriteEmailAction,
} from '@/server/actions/campaigns';
import { EMAIL_STYLES, type EmailStyle } from '@/lib/email-styles';
import type { ReadinessReport } from '@/server/services/readiness';
import type { Funnel } from '@/server/services/analytics';
import { SUPPORTED_VARIABLES } from '@/server/services/personalization';
import { recipientStatusLabel } from '@/lib/domain';
import { formatNumber, cn } from '@/lib/utils';

type Campaign = {
  id: string; name: string; status: string; product: string; objective: string; locale: string;
  segmentId: string | null; emailAccountId: string | null; landingPageId: string | null;
  externalLandingUrl: string | null;
  scheduledAt: string | null; trackOpens: boolean; trackClicks: boolean;
  batchSize: number; batchIntervalMinutes: number; dailyCap: number;
  abEnabled: boolean; readinessScore: number; recipientCount: number;
};

type Variant = {
  id?: string; label: string; weight: number; subject: string;
  previewText: string; bodyText: string; ctaLabel: string; isControl: boolean;
};

const EDITABLE = ['DRAFT', 'SCHEDULED', 'PAUSED'];

export function CampaignWorkspace({
  campaign, variants: initialVariants, segments, accounts, pages, funnel, recipientStats,
  canWrite, canLaunch, canUseAi,
}: {
  campaign: Campaign;
  variants: Variant[];
  segments: { id: string; name: string; cachedCount: number }[];
  accounts: { id: string; label: string; fromEmail: string; fromName: string; provider: string; dailyLimit: number }[];
  pages: { id: string; name: string; slug: string; status: string; product: string }[];
  funnel: Funnel | null;
  recipientStats: { status: string; count: number }[];
  canWrite: boolean;
  canLaunch: boolean;
  canUseAi: boolean;
}) {
  const router = useRouter();
  const editable = canWrite && EDITABLE.includes(campaign.status);

  const [tab, setTab] = React.useState(campaign.status === 'DRAFT' ? 'audience' : 'suivi');
  const [saving, setSaving] = React.useState(false);
  const [variants, setVariants] = React.useState<Variant[]>(
    initialVariants.length ? initialVariants : [{ label: 'A', weight: 100, subject: '', previewText: '', bodyText: '', ctaLabel: 'Demander mon devis', isControl: true }],
  );
  const [settings, setSettings] = React.useState(campaign);
  const [report, setReport] = React.useState<ReadinessReport | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [previews, setPreviews] = React.useState<{ email: string; name: string; subject: string; previewText: string; bodyText: string }[] | null>(null);
  const [aiStyle, setAiStyle] = React.useState<EmailStyle>('PROFESSIONAL');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiSimulated, setAiSimulated] = React.useState(false);
  const [aiNotes, setAiNotes] = React.useState<string[]>([]);
  const [confirmLaunch, setConfirmLaunch] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [ticking, setTicking] = React.useState(false);

  const patch = async (data: Partial<Campaign>) => {
    setSettings((s) => ({ ...s, ...data }));
    const result = await updateCampaignAction(campaign.id, data);
    if (!result.ok) { toast.error(result.error); return false; }
    router.refresh();
    return true;
  };

  const saveContent = async () => {
    setSaving(true);
    const result = await saveVariantsAction(campaign.id, variants);
    setSaving(false);
    if (result.ok) { toast.success('Contenu enregistré'); router.refresh(); }
    else toast.error(result.error);
  };

  const runCheck = async () => {
    setChecking(true);
    const result = await checkReadinessAction(campaign.id);
    setChecking(false);
    if (result.ok) { setReport(result.data); setTab('verification'); }
    else toast.error(result.error);
  };

  const loadPreviews = async () => {
    const result = await previewRecipientsAction(campaign.id);
    if (result.ok) setPreviews(result.data.previews);
    else toast.error(result.error);
  };

  const generate = async () => {
    setAiLoading(true);
    const result = await generateEmailAction({ campaignId: campaign.id, style: aiStyle });
    setAiLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    const g = result.data;
    setVariants([
      { label: 'A', weight: 100, subject: g.subject, previewText: g.previewText, bodyText: g.bodyText, ctaLabel: g.ctaLabel, isControl: true, id: variants[0]?.id },
    ]);
    setAiSimulated(g.simulated);
    setAiNotes(g.notes ?? []);
    toast.success('Proposition générée — relisez-la avant de l’enregistrer.');
  };

  const addVariantB = () => {
    if (variants.length >= 2) return;
    const a = variants[0];
    setVariants([
      { ...a, weight: 50 },
      { label: 'B', weight: 50, subject: a.subject, previewText: a.previewText, bodyText: a.bodyText, ctaLabel: a.ctaLabel, isControl: false },
    ]);
  };

  const sentCount = recipientStats.find((r) => r.status === 'SENT')?.count ?? 0;
  const totalRecipients = recipientStats.reduce((s, r) => s + r.count, 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canLaunch && ['DRAFT', 'SCHEDULED'].includes(campaign.status) ? (
          <Button onClick={() => { void runCheck(); setConfirmLaunch(true); }}>
            <Rocket /> Lancer la campagne
          </Button>
        ) : null}
        {canLaunch && campaign.status === 'SENDING' ? (
          <>
            <Button variant="outline" onClick={async () => {
              const r = await pauseCampaignAction(campaign.id);
              if (r.ok) { toast.success('Campagne mise en pause'); router.refresh(); } else toast.error(r.error);
            }}><Pause /> Mettre en pause</Button>
            <Button variant="outline" loading={ticking} onClick={async () => {
              setTicking(true);
              const r = await tickCampaignAction(campaign.id);
              setTicking(false);
              if (r.ok) { toast.success(r.data.done ? 'Envoi terminé' : `${r.data.queued} email(s) mis en file`); router.refresh(); }
              else toast.error(r.error);
            }}><Play /> Traiter un lot maintenant</Button>
          </>
        ) : null}
        {canLaunch && campaign.status === 'PAUSED' ? (
          <Button onClick={async () => {
            const r = await resumeCampaignAction(campaign.id);
            if (r.ok) { toast.success('Campagne reprise'); router.refresh(); } else toast.error(r.error);
          }}><Play /> Reprendre</Button>
        ) : null}
        {canLaunch && ['SENDING', 'PAUSED', 'SCHEDULED'].includes(campaign.status) ? (
          <Button variant="outline" onClick={() => setConfirmCancel(true)}><XCircle /> Annuler</Button>
        ) : null}
        <Button variant="outline" onClick={runCheck} loading={checking}><ShieldCheck /> Vérifier la campagne</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="audience"><Users /> Audience</TabsTrigger>
          <TabsTrigger value="contenu"><Mail /> Email</TabsTrigger>
          <TabsTrigger value="landing"><LayoutTemplate /> Landing</TabsTrigger>
          <TabsTrigger value="expediteur"><AtSign /> Expéditeur</TabsTrigger>
          <TabsTrigger value="planification"><CalendarClock /> Planification</TabsTrigger>
          <TabsTrigger value="verification"><ShieldCheck /> Vérification</TabsTrigger>
          <TabsTrigger value="apercu"><Eye /> Aperçu</TabsTrigger>
          <TabsTrigger value="suivi"><BarChart3 /> Suivi</TabsTrigger>
        </TabsList>

        {/* ── Audience ── */}
        <TabsContent value="audience">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Segment ciblé</CardTitle>
              <CardDescription>
                Les contacts supprimés, désinscrits ou invalides sont exclus automatiquement, quel que
                soit le segment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={settings.segmentId ?? 'none'}
                onValueChange={(v) => patch({ segmentId: v === 'none' ? null : v })}
                disabled={!editable}
              >
                <SelectTrigger className="max-w-lg"><SelectValue placeholder="Sélectionner un segment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun segment</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {formatNumber(s.cachedCount)} contacts</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {segments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun segment disponible. <Link href="/segments/new" className="text-primary hover:underline">Créez-en un</Link>.
                </p>
              ) : null}
              {report?.audience ? (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold">
                    {formatNumber(report.audience.eligible)} destinataire(s) éligible(s) sur {formatNumber(report.audience.total)}
                  </p>
                  <ul className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    {Object.entries(report.audience.issues).filter(([, v]) => v > 0).map(([k, v]) => (
                      <li key={k}>{ISSUE_LABELS[k] ?? k} : {formatNumber(v)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contenu ── */}
        <TabsContent value="contenu" className="space-y-4">
          {canUseAi && editable ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Rédaction assistée</CardTitle>
                <CardDescription>
                  L’IA ne peut inventer ni tarif, ni économie chiffrée, ni garantie. Relisez toujours la
                  proposition avant de l’enregistrer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Style</Label>
                    <Select value={aiStyle} onValueChange={(v) => setAiStyle(v as EmailStyle)}>
                      <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMAIL_STYLES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={generate} loading={aiLoading} variant="outline"><Sparkles /> Générer une proposition</Button>
                  {variants[0]?.bodyText ? (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const instruction = window.prompt('Comment souhaitez-vous réécrire cet email ?');
                        if (!instruction) return;
                        setAiLoading(true);
                        const r = await rewriteEmailAction({ campaignId: campaign.id, instruction });
                        setAiLoading(false);
                        if (!r.ok) { toast.error(r.error); return; }
                        setVariants((vs) => [{ ...vs[0], subject: r.data.subject, previewText: r.data.previewText, bodyText: r.data.bodyText, ctaLabel: r.data.ctaLabel }, ...vs.slice(1)]);
                        setAiSimulated(r.data.simulated);
                        toast.success('Nouvelle version proposée');
                      }}
                    >
                      Réécrire
                    </Button>
                  ) : null}
                </div>
                {aiSimulated ? <Badge variant="warning">Fournisseur IA DEMO — texte généré localement par des règles, sans modèle externe</Badge> : null}
                {aiNotes.length > 0 ? (
                  <ul className="space-y-0.5 rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                    {aiNotes.map((n, i) => <li key={i}>• {n}</li>)}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {variants.map((variant, index) => (
            <Card key={index}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle>Version {variant.label}{variant.isControl ? ' (référence)' : ''}</CardTitle>
                  <CardDescription>Variables disponibles : {SUPPORTED_VARIABLES.slice(0, 6).map((v) => `{{${v.key}}}`).join(', ')}</CardDescription>
                </div>
                {variants.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px]">Répartition</Label>
                    <Input
                      type="number" min={0} max={100} className="h-8 w-20"
                      value={variant.weight}
                      disabled={!editable}
                      onChange={(e) => setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, weight: Number(e.target.value) } : v)))}
                    />
                    <span className="text-[11px] text-muted-foreground">%</span>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Objet *</Label>
                    <Input
                      value={variant.subject}
                      disabled={!editable}
                      onChange={(e) => setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, subject: e.target.value } : v)))}
                      placeholder="Votre contrat arrive à échéance le {{renewal_date}}"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Texte de prévisualisation</Label>
                    <Input
                      value={variant.previewText}
                      disabled={!editable}
                      onChange={(e) => setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, previewText: e.target.value } : v)))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Corps du message * — placez <code className="rounded bg-muted px-1">[[CTA]]</code> à l’endroit du bouton</Label>
                  <Textarea
                    rows={14}
                    className="font-mono text-xs"
                    value={variant.bodyText}
                    disabled={!editable}
                    onChange={(e) => setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, bodyText: e.target.value } : v)))}
                  />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <Label>Libellé du bouton</Label>
                  <Input
                    value={variant.ctaLabel}
                    disabled={!editable}
                    onChange={(e) => setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, ctaLabel: e.target.value } : v)))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {editable ? (
            <div className="flex flex-wrap justify-between gap-2">
              {variants.length === 1 ? (
                <Button variant="outline" onClick={addVariantB}>Ajouter une version B (test A/B)</Button>
              ) : (
                <Button variant="ghost" onClick={() => setVariants((vs) => [{ ...vs[0], weight: 100 }])}>Retirer la version B</Button>
              )}
              <Button onClick={saveContent} loading={saving}>Enregistrer le contenu</Button>
            </div>
          ) : null}
        </TabsContent>

        {/* ── Landing ── */}
        <TabsContent value="landing">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Page de destination</CardTitle>
              <CardDescription>
                Le bouton de l’email y redirige avec un jeton de suivi unique par destinataire, que la
                page soit hébergée ici ou chez vous.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => patch({ externalLandingUrl: null })}
                  className={cn(
                    'flex-1 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-60',
                    !settings.externalLandingUrl ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <span className="block font-medium">Page hébergée ici</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Construite dans ASSURLEAD AI : suivi et formulaire déjà branchés.
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => patch({ landingPageId: null, externalLandingUrl: settings.externalLandingUrl || 'https://' })}
                  className={cn(
                    'flex-1 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-60',
                    settings.externalLandingUrl ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <span className="block font-medium">Votre page existante</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Gardez votre page actuelle : un script y remonte visites et leads.
                  </span>
                </button>
              </div>

              {settings.externalLandingUrl !== null ? (
                <div className="space-y-2">
                  <Label>URL de votre page</Label>
                  <Input
                    value={settings.externalLandingUrl}
                    disabled={!editable}
                    placeholder="https://exemple.fr/etude-comparative"
                    onChange={(e) => setSettings((s) => ({ ...s, externalLandingUrl: e.target.value }))}
                    onBlur={(e) => patch({ externalLandingUrl: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Le lien du CTA deviendra{' '}
                    <code className="rounded bg-muted px-1">
                      {settings.externalLandingUrl.split('?')[0] || 'https://votre-page'}?alid=&lt;jeton&gt;
                    </code>{' '}
                    — le jeton permet de rattacher le lead à cette campagne.
                  </p>
                  <p className="rounded-lg border border-warning/40 bg-warning/5 p-2.5 text-[11px] text-warning">
                    Pour que les visites et les demandes remontent, déclarez ce domaine dans{' '}
                    <Link href="/integrations" className="underline">Intégrations → Pages externes</Link>{' '}
                    et collez le script fourni sur la page. Sans cela, le clic est suivi mais aucun lead
                    n’est créé.
                  </p>
                </div>
              ) : null}

              <Select
                value={settings.landingPageId ?? 'none'}
                onValueChange={(v) => patch({ landingPageId: v === 'none' ? null : v, externalLandingUrl: null })}
                disabled={!editable || settings.externalLandingUrl !== null}
              >
                <SelectTrigger className="max-w-lg"><SelectValue placeholder="Sélectionner une landing page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {pages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.status === 'PUBLISHED' ? '· publiée' : '· brouillon'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settings.landingPageId && settings.externalLandingUrl === null ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/landing-pages/${settings.landingPageId}`}>Modifier la page</Link>
                  </Button>
                  {pages.find((p) => p.id === settings.landingPageId)?.status === 'PUBLISHED' ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/p/${pages.find((p) => p.id === settings.landingPageId)?.slug}`} target="_blank" rel="noreferrer">
                        Voir la page <ExternalLink />
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="warning">Cette page est en brouillon : publiez-la avant le lancement.</Badge>
                  )}
                </div>
              ) : settings.externalLandingUrl === null ? (
                <p className="text-xs text-muted-foreground">
                  Aucune page sélectionnée. <Link href="/landing-pages" className="text-primary hover:underline">Créer une landing page</Link>.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expéditeur ── */}
        <TabsContent value="expediteur">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Compte d’envoi</CardTitle>
              <CardDescription>Détermine l’adresse expéditrice, les limites d’envoi et la réputation utilisée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={settings.emailAccountId ?? 'none'}
                onValueChange={(v) => patch({ emailAccountId: v === 'none' ? null : v })}
                disabled={!editable}
              >
                <SelectTrigger className="max-w-lg"><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fromName} &lt;{a.fromEmail}&gt; · {a.provider} · {formatNumber(a.dailyLimit)}/j
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accounts.find((a) => a.id === settings.emailAccountId)?.provider === 'DEMO' ? (
                <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                  Ce compte utilise le fournisseur DEMO : le parcours complet fonctionne (file d’envoi,
                  liens de suivi, landing page, leads) mais aucun email n’est réellement transmis.
                  Connectez un fournisseur réel dans « Comptes Email » pour une campagne de production.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Planification ── */}
        <TabsContent value="planification">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Planification et cadence</CardTitle>
              <CardDescription>
                L’envoi est progressif par lots. Une campagne programmée ne part qu’après avoir été
                lancée explicitement.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date et heure d’envoi (facultatif)</Label>
                <Input
                  type="datetime-local"
                  disabled={!editable}
                  value={settings.scheduledAt ? settings.scheduledAt.slice(0, 16) : ''}
                  onChange={(e) => patch({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <p className="text-[10px] text-muted-foreground">Vide = envoi dès le lancement.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Taille des lots</Label>
                <Input type="number" min={10} max={5000} disabled={!editable} value={settings.batchSize}
                  onChange={(e) => patch({ batchSize: Number(e.target.value) })} />
                <p className="text-[10px] text-muted-foreground">Nombre d’emails traités à chaque cycle.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Intervalle entre les lots (minutes)</Label>
                <Input type="number" min={1} max={1440} disabled={!editable} value={settings.batchIntervalMinutes}
                  onChange={(e) => patch({ batchIntervalMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Plafond quotidien</Label>
                <Input type="number" min={10} disabled={!editable} value={settings.dailyCap}
                  onChange={(e) => patch({ dailyCap: Number(e.target.value) })} />
                <p className="text-[10px] text-muted-foreground">Toujours limité par le plafond du compte d’envoi.</p>
              </div>
              <div className="sm:col-span-2 space-y-2.5 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">Suivi des clics</p>
                    <p className="text-[10px] text-muted-foreground">Nécessaire pour mesurer l’entonnoir.</p>
                  </div>
                  <Switch checked={settings.trackClicks} disabled={!editable} onCheckedChange={(v) => patch({ trackClicks: v })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">Suivi des ouvertures (optionnel)</p>
                    <p className="text-[10px] text-muted-foreground">
                      Désactivé par défaut : les protections anti-pistage rendent cette mesure peu fiable.
                    </p>
                  </div>
                  <Switch checked={settings.trackOpens} disabled={!editable} onCheckedChange={(v) => patch({ trackOpens: v })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Vérification ── */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Score de préparation</CardTitle>
                <CardDescription>Contrôles techniques, conformité et délivrabilité.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={runCheck} loading={checking}>Relancer le contrôle</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {report ? (
                <>
                  <div className="flex items-center gap-4">
                    <span className={cn('num text-4xl font-bold', report.score >= 80 ? 'text-success' : report.score >= 60 ? 'text-warning' : 'text-destructive')}>
                      {report.score}
                    </span>
                    <div className="flex-1">
                      <Progress value={report.score} indicatorClassName={report.score >= 80 ? 'bg-success' : report.score >= 60 ? 'bg-warning' : 'bg-destructive'} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {report.blocking.length === 0
                          ? 'Aucun point bloquant détecté.'
                          : `${report.blocking.length} point(s) bloquant(s) selon votre politique.`}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {report.checks.map((check) => (
                      <li key={check.key} className="flex gap-2.5 rounded-lg border p-2.5">
                        <span className="mt-0.5 shrink-0">
                          {check.status === 'PASS' ? <CheckCircle2 className="h-4 w-4 text-success" />
                            : check.status === 'WARN' ? <TriangleAlert className="h-4 w-4 text-warning" />
                            : check.status === 'FAIL' ? <CircleAlert className="h-4 w-4 text-destructive" />
                            : <Info className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium">{check.label}</span>
                            {check.blocking ? <Badge variant="destructive">bloquant</Badge> : null}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{check.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Lancez le contrôle pour obtenir le score de préparation et la liste des points à corriger.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aperçu ── */}
        <TabsContent value="apercu" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Aperçu avec de vrais destinataires</CardTitle>
                <CardDescription>Le message est rendu avec les données réelles de trois contacts du segment.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={loadPreviews}>Charger l’aperçu</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {previews === null ? (
                <p className="text-xs text-muted-foreground">Cliquez sur « Charger l’aperçu ».</p>
              ) : previews.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun contact dans le segment sélectionné.</p>
              ) : (
                previews.map((p, i) => (
                  <div key={i} className="rounded-lg border">
                    <div className="border-b bg-muted/40 px-3 py-2 text-xs">
                      <p className="font-medium">Pour : {p.name} &lt;{p.email}&gt;</p>
                      <p className="mt-0.5 font-semibold">{p.subject}</p>
                      {p.previewText ? <p className="text-muted-foreground">{p.previewText}</p> : null}
                    </div>
                    <pre className="whitespace-pre-wrap p-3 text-xs leading-relaxed">{p.bodyText}</pre>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Suivi ── */}
        <TabsContent value="suivi" className="space-y-4">
          {campaign.status === 'DRAFT' ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              La campagne est en brouillon : aucune statistique n’est disponible.
            </CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Progression de l’envoi</CardTitle>
                  <CardDescription>{formatNumber(sentCount)} envoyé(s) sur {formatNumber(totalRecipients)} destinataire(s).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={totalRecipients ? (sentCount / totalRecipients) * 100 : 0} />
                  <div className="flex flex-wrap gap-1.5">
                    {recipientStats.map((s) => (
                      <Badge key={s.status} variant={s.status === 'SENT' ? 'success' : s.status === 'BOUNCED' || s.status === 'FAILED' ? 'destructive' : s.status === 'SUPPRESSED' || s.status === 'SKIPPED' ? 'warning' : 'muted'}>
                        {recipientStatusLabel(s.status as 'SENT')} : {formatNumber(s.count)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {funnel ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle>Entonnoir de la campagne</CardTitle></CardHeader>
                    <CardContent>
                      <FunnelChart steps={[
                        { label: 'Envoyés', value: funnel.counts.sent },
                        { label: 'Délivrés', value: funnel.counts.delivered },
                        { label: 'Clics uniques', value: funnel.counts.uniqueClicks },
                        { label: 'Visiteurs landing', value: funnel.counts.landingViews },
                        { label: 'Formulaires', value: funnel.counts.formSubmits },
                        { label: 'Leads qualifiés', value: funnel.counts.qualifiedLeads },
                        { label: 'Rendez-vous', value: funnel.counts.appointments },
                        { label: 'Ventes', value: funnel.counts.sales },
                      ]} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3"><CardTitle>Taux mesurés</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="space-y-2 text-xs">
                        <Rate label="Taux de délivrabilité" value={`${funnel.rates.deliveryRate} %`} />
                        <Rate label="Taux de rebond" value={`${funnel.rates.bounceRate} %`} warn={funnel.rates.bounceRate > 3} />
                        <Rate label="Taux de clic (clics uniques / délivrés)" value={`${funnel.rates.clickRate} %`} />
                        <Rate label="Conversion landing page" value={`${funnel.rates.landingConversionRate} %`} />
                        <Rate label="Complétion du formulaire" value={`${funnel.rates.formCompletionRate} %`} />
                        <Rate label="Part de leads qualifiés" value={`${funnel.rates.qualifiedRate} %`} />
                        <Rate label="Taux de rendez-vous" value={`${funnel.rates.appointmentRate} %`} />
                        <Rate label="Taux de vente" value={`${funnel.rates.salesRate} %`} />
                      </dl>
                      <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                        <Link href={`/analytics?campaign=${campaign.id}`}>Analyser avec l’IA</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmLaunch}
        onOpenChange={setConfirmLaunch}
        title="Lancer la campagne ?"
        description={
          report
            ? `Score de préparation : ${report.score}/100. ${report.blocking.length > 0 ? `Points bloquants : ${report.blocking.map((b) => b.label).join(', ')}.` : 'Aucun point bloquant.'} Les emails partiront progressivement vers les destinataires éligibles.`
            : 'Les emails partiront progressivement vers les destinataires éligibles.'
        }
        confirmLabel="Lancer la campagne"
        requireTyping="LANCER"
        onConfirm={async () => {
          const result = await launchCampaignAction(campaign.id);
          if (result.ok) {
            toast.success(result.data.scheduled ? `Campagne programmée — ${formatNumber(result.data.recipients)} destinataire(s)` : `Campagne lancée — ${formatNumber(result.data.recipients)} destinataire(s)`);
            router.refresh();
          } else toast.error(result.error);
        }}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Annuler la campagne ?"
        description="Les envois restants sont annulés définitivement. Les emails déjà partis ne peuvent pas être rappelés."
        destructive
        confirmLabel="Annuler la campagne"
        onConfirm={async () => {
          const result = await cancelCampaignAction(campaign.id);
          if (result.ok) { toast.success('Campagne annulée'); router.refresh(); } else toast.error(result.error);
        }}
      />
    </>
  );
}

const ISSUE_LABELS: Record<string, string> = {
  SUPPRESSED: 'Sur liste de suppression', UNSUBSCRIBED: 'Désinscrits', INVALID_EMAIL: 'Adresses invalides',
  VERIFICATION_BLOCKED: 'Statut de vérification exclu', CONSENT_UNKNOWN: 'Consentement inconnu',
  CONSENT_DENIED: 'Consentement refusé', MISSING_SOURCE: 'Source non renseignée',
  MARKETING_NOT_ALLOWED: 'Marketing email non autorisé',
};

function Rate({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('num font-semibold', warn && 'text-warning')}>{value}</dd>
    </div>
  );
}
