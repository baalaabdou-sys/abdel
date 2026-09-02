'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, CheckCircle2, TriangleAlert, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CONTACT_FIELDS, type ImportPreview } from '@/server/services/import';
import { previewImportAction, runImportAction } from '@/server/actions/import';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';
import { formatNumber, cn } from '@/lib/utils';

type Step = 'upload' | 'mapping' | 'policy' | 'result';

const STRATEGIES = [
  { value: 'SKIP', label: 'Ignorer les doublons', help: 'Les contacts déjà présents sont laissés intacts.' },
  { value: 'MERGE', label: 'Compléter les champs vides', help: 'Ne remplit que les informations manquantes. Aucune donnée existante n’est écrasée.' },
  { value: 'UPDATE', label: 'Mettre à jour les contacts existants', help: 'Les champs du fichier remplacent les valeurs actuelles.' },
  { value: 'NEW_ONLY', label: 'Importer uniquement les nouveaux', help: 'Les contacts existants sont comptés comme ignorés.' },
];

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('upload');
  const [uploading, setUploading] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [strategy, setStrategy] = React.useState('MERGE');
  const [outcome, setOutcome] = React.useState<Record<string, number> | null>(null);

  const [defaults, setDefaults] = React.useState({
    source: '',
    sourceDetail: '',
    consentEmail: 'UNKNOWN' as 'UNKNOWN' | 'GRANTED' | 'DENIED',
    consentPhone: 'UNKNOWN' as 'UNKNOWN' | 'GRANTED' | 'DENIED',
    consentSource: '',
    legalBasisNote: '',
    emailMarketingAllowed: false,
    phoneContactAllowed: false,
    insuranceType: '',
    tags: [] as string[],
    verifyAfterImport: true,
  });

  const upload = async (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/import/upload', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Téléversement impossible'); return; }
      const result = await previewImportAction(json.uploadId, json.filename);
      if (!result.ok) { toast.error(result.error); return; }
      setPreview(result.data);
      setMapping(result.data.mapping as Record<string, string>);
      setDefaults((d) => ({ ...d, source: d.source || `Import ${json.filename}` }));
      setStep('mapping');
    } catch {
      toast.error('Le fichier n’a pas pu être analysé.');
    } finally {
      setUploading(false);
    }
  };

  const run = async () => {
    if (!preview) return;
    if (!defaults.source.trim()) { toast.error('Indiquez la source des contacts.'); return; }
    setRunning(true);
    const result = await runImportAction({
      uploadId: preview.uploadId,
      filename: preview.filename,
      mapping,
      strategy,
      defaults: { ...defaults, insuranceType: defaults.insuranceType || undefined },
    });
    setRunning(false);
    if (!result.ok) { toast.error(result.error); return; }
    if (result.data.mode === 'queued') {
      toast.success('Import lancé en arrière-plan. Les contacts apparaîtront progressivement.');
      router.push('/contacts');
      return;
    }
    setOutcome(result.data.outcome as Record<string, number>);
    setStep('result');
  };

  const emailMapped = Object.values(mapping).includes('email');

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>1. Choisissez votre fichier</CardTitle>
          <CardDescription>Formats acceptés : CSV, XLSX. Taille maximale 50 Mo.</CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void upload(file);
            }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {uploading ? 'Analyse du fichier…' : 'Glissez votre fichier ici ou cliquez pour parcourir'}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Aucun contact n’est importé à cette étape : vous verrez d’abord un aperçu complet.
              </span>
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  if (step === 'mapping' && preview) {
    const issues = preview.issues;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> {preview.filename}
            </CardTitle>
            <CardDescription>{formatNumber(preview.totalRows)} ligne(s) détectée(s).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Emails manquants" value={issues.missingEmails} tone={issues.missingEmails ? 'warning' : 'ok'} />
            <Stat label="Emails invalides" value={issues.invalidEmails} tone={issues.invalidEmails ? 'warning' : 'ok'} />
            <Stat label="Doublons dans le fichier" value={issues.duplicatesInFile} tone={issues.duplicatesInFile ? 'warning' : 'ok'} />
            <Stat label="Déjà dans la base" value={issues.existingContacts} tone="info" />
            <Stat label="Sur liste de suppression" value={issues.suppressedHits} tone={issues.suppressedHits ? 'warning' : 'ok'} />
            <Stat label="Téléphones en double" value={issues.duplicatePhones} tone="info" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>2. Vérifiez la correspondance des colonnes</CardTitle>
            <CardDescription>
              Les colonnes ont été associées automatiquement. Corrigez si nécessaire — seule la colonne
              « Email » est obligatoire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preview.headers.map((header) => (
                <div key={header} className="space-y-1">
                  <Label className="flex items-center gap-1.5">
                    <span className="truncate">{header}</span>
                    {mapping[header] ? <CheckCircle2 className="h-3 w-3 text-success" /> : null}
                  </Label>
                  <Select
                    value={mapping[header] || 'none'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ne pas importer</SelectItem>
                      {CONTACT_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="truncate text-[10px] text-muted-foreground">
                    Ex. : {String(preview.sampleRows[0]?.[header] ?? '—').slice(0, 40)}
                  </p>
                </div>
              ))}
            </div>

            {!emailMapped ? (
              <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" /> Associez une colonne au champ « Email » pour continuer.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Aperçu des données</CardTitle>
            <CardDescription>20 premières lignes du fichier.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap">
                        {h}
                        {mapping[h] ? (
                          <span className="ml-1 text-[10px] text-primary">
                            → {CONTACT_FIELDS.find((f) => f.key === mapping[h])?.label}
                          </span>
                        ) : null}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleRows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.headers.map((h) => (
                        <TableCell key={h} className="max-w-40 truncate whitespace-nowrap text-xs">
                          {String(row[h] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setStep('upload'); setPreview(null); }}>
            <ArrowLeft /> Changer de fichier
          </Button>
          <Button disabled={!emailMapped} onClick={() => setStep('policy')}>
            Continuer <ArrowRight />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'policy' && preview) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>3. Que faire des contacts déjà présents ?</CardTitle>
            <CardDescription>
              {formatNumber(preview.issues.existingContacts)} contact(s) du fichier existent déjà dans votre base.
              Aucune donnée existante n’est écrasée sans votre choix explicite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={strategy} onValueChange={setStrategy} className="gap-2">
              {STRATEGIES.map((s) => (
                <label
                  key={s.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    strategy === s.value ? 'border-primary bg-primary/5' : 'hover:bg-accent/40',
                  )}
                >
                  <RadioGroupItem value={s.value} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.help}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>4. Provenance et consentement</CardTitle>
            <CardDescription>
              Ces informations sont enregistrées pour chaque contact importé. Le consentement n’est
              jamais déduit : indiquez uniquement ce que vous êtes en mesure de justifier.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source">Source des contacts *</Label>
              <Input id="source" value={defaults.source} onChange={(e) => setDefaults((d) => ({ ...d, source: e.target.value }))}
                placeholder="Ex. : Formulaire site web, Salon 2025…" />
              <p className="text-[10px] text-muted-foreground">
                Utilisée par défaut lorsque le fichier ne contient pas de colonne « Source ».
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consentSource">Origine du consentement</Label>
              <Input id="consentSource" value={defaults.consentSource} onChange={(e) => setDefaults((d) => ({ ...d, consentSource: e.target.value }))}
                placeholder="Ex. : Case cochée sur le formulaire d’inscription" />
            </div>

            <div className="space-y-1.5">
              <Label>Consentement email par défaut</Label>
              <Select value={defaults.consentEmail} onValueChange={(v) => setDefaults((d) => ({ ...d, consentEmail: v as 'UNKNOWN' }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">Inconnu (recommandé si vous n’avez pas de preuve)</SelectItem>
                  <SelectItem value="GRANTED">Accordé</SelectItem>
                  <SelectItem value="DENIED">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Consentement téléphone par défaut</Label>
              <Select value={defaults.consentPhone} onValueChange={(v) => setDefaults((d) => ({ ...d, consentPhone: v as 'UNKNOWN' }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">Inconnu</SelectItem>
                  <SelectItem value="GRANTED">Accordé</SelectItem>
                  <SelectItem value="DENIED">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Produit assurance par défaut</Label>
              <Select value={defaults.insuranceType || 'none'} onValueChange={(v) => setDefaults((d) => ({ ...d, insuranceType: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Appliqué si le fichier ne précise pas le produit.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legal">Note de base légale / conformité interne</Label>
              <Input id="legal" value={defaults.legalBasisNote} onChange={(e) => setDefaults((d) => ({ ...d, legalBasisNote: e.target.value }))}
                placeholder="Ex. : clients existants, contrat en cours" />
            </div>

            <div className="sm:col-span-2 space-y-2.5 rounded-lg border p-3">
              <Toggle
                label="Autoriser le marketing email"
                help="Ne s’applique qu’aux contacts dont le consentement est « Accordé »."
                checked={defaults.emailMarketingAllowed}
                onChange={(v) => setDefaults((d) => ({ ...d, emailMarketingAllowed: v }))}
              />
              <Toggle
                label="Autoriser le contact téléphonique"
                help="Ne s’applique qu’aux contacts dont le consentement téléphone est « Accordé »."
                checked={defaults.phoneContactAllowed}
                onChange={(v) => setDefaults((d) => ({ ...d, phoneContactAllowed: v }))}
              />
              <Toggle
                label="Vérifier les adresses après l’import"
                help="Lance une vérification des adresses email importées via le fournisseur configuré."
                checked={defaults.verifyAfterImport}
                onChange={(v) => setDefaults((d) => ({ ...d, verifyAfterImport: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('mapping')}><ArrowLeft /> Retour</Button>
          <Button loading={running} onClick={run}>
            Importer {formatNumber(preview.totalRows)} ligne(s)
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'result' && outcome) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Import terminé
          </CardTitle>
          <CardDescription>Récapitulatif du traitement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Contacts créés" value={outcome.imported} tone="ok" />
            <Stat label="Mis à jour" value={outcome.updated} tone="info" />
            <Stat label="Ignorés" value={outcome.skipped} tone="info" />
            <Stat label="Lignes invalides" value={outcome.invalid} tone={outcome.invalid ? 'warning' : 'ok'} />
            <Stat label="Doublons du fichier" value={outcome.duplicates} tone="info" />
            <Stat label="Sur liste de suppression" value={outcome.suppressedHits} tone={outcome.suppressedHits ? 'warning' : 'ok'} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/contacts')}>Voir les contacts</Button>
            <Button variant="outline" onClick={() => { setStep('upload'); setPreview(null); setOutcome(null); }}>
              Importer un autre fichier
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warning' | 'info' }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn('num mt-0.5 text-lg font-semibold', tone === 'warning' && value > 0 ? 'text-warning' : tone === 'ok' ? 'text-success' : '')}>
        {formatNumber(value)}
      </p>
    </div>
  );
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{help}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
