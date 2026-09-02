'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Sparkles, Users, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEGMENT_FIELDS, type SegmentRules } from '@/lib/segment-rules';
import { createSegmentAction, updateSegmentAction, previewSegmentAction, proposeSegmentAction } from '@/server/actions/segments';
import { INSURANCE_TYPES, insuranceLabel, verificationLabel } from '@/lib/domain';
import { formatNumber } from '@/lib/utils';
import type { VerificationStatus } from '@prisma/client';

type Condition = { field: string; operator: string; value: unknown };

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'est égal à', not_equals: 'est différent de', contains: 'contient',
  starts_with: 'commence par', in: 'fait partie de', not_in: 'ne fait pas partie de',
  has: 'inclut', has_any: 'inclut au moins un de', between: 'est compris entre',
  gte: 'est supérieur ou égal à', lte: 'est inférieur ou égal à',
  within_days: 'dans les N prochains jours', is_true: 'est activé', is_false: 'est désactivé',
  is_set: 'est renseigné', is_empty: 'est vide', never_contacted: 'jamais contacté',
  clicked_campaign: 'a cliqué sur une campagne', submitted_form: 'a soumis un formulaire',
  in_month: 'au mois de',
};

export function SegmentBuilder({
  segmentId, initialName = '', initialDescription = '', initialKind = 'DYNAMIC', initialRules,
}: {
  segmentId?: string;
  initialName?: string;
  initialDescription?: string;
  initialKind?: 'STATIC' | 'DYNAMIC';
  initialRules?: SegmentRules;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [kind, setKind] = React.useState<'STATIC' | 'DYNAMIC'>(initialKind);
  const [match, setMatch] = React.useState<'AND' | 'OR'>(initialRules?.match ?? 'AND');
  const [conditions, setConditions] = React.useState<Condition[]>(
    (initialRules?.conditions as Condition[]) ?? [{ field: 'insuranceInterests', operator: 'has', value: 'AUTO' }],
  );
  const [count, setCount] = React.useState<number | null>(null);
  const [sample, setSample] = React.useState<{ id: string; email: string; firstName: string | null; lastName: string | null; city: string | null }[]>([]);
  const [previewing, setPreviewing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiExplanations, setAiExplanations] = React.useState<string[]>([]);

  const rules: SegmentRules = React.useMemo(() => ({ match, conditions: conditions as SegmentRules['conditions'] }), [match, conditions]);

  const preview = React.useCallback(async () => {
    setPreviewing(true);
    const result = await previewSegmentAction(rules);
    setPreviewing(false);
    if (result.ok) { setCount(result.data.count); setSample(result.data.sample); }
    else toast.error(result.error);
  }, [rules]);

  React.useEffect(() => {
    const timer = setTimeout(() => void preview(), 500);
    return () => clearTimeout(timer);
  }, [preview]);

  const askAi = async () => {
    if (aiPrompt.trim().length < 5) { toast.error('Décrivez le segment en une phrase.'); return; }
    setAiLoading(true);
    const result = await proposeSegmentAction(aiPrompt);
    setAiLoading(false);
    if (!result.ok) { toast.error(result.error); return; }
    setConditions(result.data.rules.conditions as Condition[]);
    setMatch(result.data.rules.match);
    setAiExplanations(result.data.explanations);
    if (!name) setName(result.data.name);
    toast.success('Filtres proposés — vérifiez-les avant d’enregistrer.');
  };

  const save = async () => {
    if (name.trim().length < 2) { toast.error('Donnez un nom au segment.'); return; }
    setSaving(true);
    const payload = { name, description, kind, rules };
    const result = segmentId ? await updateSegmentAction(segmentId, payload) : await createSegmentAction(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(segmentId ? 'Segment mis à jour' : `Segment créé (${formatNumber(result.data.count)} contacts)`);
      router.push('/segments');
      router.refresh();
    } else toast.error(result.error);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Créer avec l’IA</CardTitle>
            <CardDescription>
              Décrivez votre audience en français. Les filtres sont affichés avant enregistrement —
              rien n’est créé automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void askAi(); } }}
                placeholder="Ex : prospects assurance auto à Paris dont l’échéance arrive dans 60 jours"
              />
              <Button onClick={askAi} loading={aiLoading} variant="outline">Proposer</Button>
            </div>
            {aiExplanations.length > 0 ? (
              <ul className="space-y-0.5 rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                {aiExplanations.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nom du segment *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Assurance Auto — Paris — échéance < 60 jours" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type de segment</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as 'DYNAMIC')} disabled={!!segmentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DYNAMIC">Dynamique — se met à jour automatiquement</SelectItem>
                  <SelectItem value="STATIC">Statique — figé à la création</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Combinaison des filtres</Label>
              <Select value={match} onValueChange={(v) => setMatch(v as 'AND')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Toutes les conditions (ET)</SelectItem>
                  <SelectItem value="OR">Au moins une condition (OU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Filtres</CardTitle>
              <CardDescription>Les critères sont évalués côté base de données.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setConditions((c) => [...c, { field: 'city', operator: 'equals', value: '' }])}>
              <Plus /> Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {conditions.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Aucun filtre : le segment contiendra tous vos contacts.
              </p>
            ) : (
              conditions.map((condition, index) => (
                <ConditionRow
                  key={index}
                  condition={condition}
                  onChange={(next) => setConditions((c) => c.map((x, i) => (i === index ? next : x)))}
                  onRemove={() => setConditions((c) => c.filter((_, i) => i !== index))}
                />
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>Annuler</Button>
          <Button onClick={save} loading={saving}>{segmentId ? 'Enregistrer' : 'Créer le segment'}</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Aperçu</CardTitle>
              <CardDescription>Résultat en temps réel.</CardDescription>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={preview} aria-label="Rafraîchir">
              {previewing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="num text-3xl font-bold tracking-tight">
                {count === null ? '—' : formatNumber(count)}
              </p>
              <p className="text-xs text-muted-foreground">contact(s) correspondant aux filtres</p>
            </div>
            {sample.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Exemples</p>
                <ul className="space-y-1 text-xs">
                  {sample.map((c) => (
                    <li key={c.id} className="truncate">
                      <span className="font-medium">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}</span>
                      <span className="text-muted-foreground"> · {c.city ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {count === 0 ? (
              <Badge variant="warning">Aucun contact ne correspond : élargissez vos critères.</Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConditionRow({ condition, onChange, onRemove }: { condition: Condition; onChange: (c: Condition) => void; onRemove: () => void }) {
  const field = SEGMENT_FIELDS.find((f) => f.key === condition.field) ?? SEGMENT_FIELDS[0];
  const operators = field.operators;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
      <Select
        value={condition.field}
        onValueChange={(v) => {
          const next = SEGMENT_FIELDS.find((f) => f.key === v)!;
          onChange({ field: v, operator: next.operators[0], value: '' });
        }}
      >
        <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SEGMENT_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={condition.operator} onValueChange={(v) => onChange({ ...condition, operator: v })}>
        <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {operators.map((op) => <SelectItem key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</SelectItem>)}
        </SelectContent>
      </Select>

      <ValueInput condition={condition} fieldKey={field.key} type={field.type} onChange={onChange} />

      <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label="Retirer ce filtre">
        <Trash2 className="text-destructive" />
      </Button>
    </div>
  );
}

function ValueInput({ condition, fieldKey, type, onChange }: { condition: Condition; fieldKey: string; type: string; onChange: (c: Condition) => void }) {
  const set = (value: unknown) => onChange({ ...condition, value });

  if (['is_true', 'is_false', 'is_set', 'is_empty', 'never_contacted'].includes(condition.operator)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (condition.operator === 'between') {
    const arr = Array.isArray(condition.value) ? (condition.value as unknown[]) : ['', ''];
    return (
      <div className="flex items-center gap-1.5">
        <Input className="h-8 w-20 text-xs" type="number" value={String(arr[0] ?? '')} onChange={(e) => set([Number(e.target.value), Number(arr[1] ?? 0)])} />
        <span className="text-xs text-muted-foreground">et</span>
        <Input className="h-8 w-20 text-xs" type="number" value={String(arr[1] ?? '')} onChange={(e) => set([Number(arr[0] ?? 0), Number(e.target.value)])} />
      </div>
    );
  }

  if (fieldKey === 'insuranceInterests') {
    return (
      <Select value={String(condition.value ?? 'AUTO')} onValueChange={set}>
        <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  if (fieldKey === 'verificationStatus') {
    const statuses: VerificationStatus[] = ['VALID', 'LIKELY_VALID', 'CATCH_ALL', 'RISKY', 'UNKNOWN', 'INVALID', 'UNVERIFIED'];
    if (condition.operator === 'in') {
      const selected = Array.isArray(condition.value) ? (condition.value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s])}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${selected.includes(s) ? 'border-primary bg-primary/10 text-primary' : ''}`}
            >
              {verificationLabel(s)}
            </button>
          ))}
        </div>
      );
    }
    return (
      <Select value={String(condition.value ?? 'VALID')} onValueChange={set}>
        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{verificationLabel(s)}</SelectItem>)}</SelectContent>
      </Select>
    );
  }

  if (fieldKey === 'status') {
    return (
      <Select value={String(condition.value ?? 'PROSPECT')} onValueChange={set}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="PROSPECT">Prospect</SelectItem>
          <SelectItem value="CUSTOMER">Client</SelectItem>
          <SelectItem value="FORMER_CUSTOMER">Ancien client</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (fieldKey === 'consentEmail') {
    return (
      <Select value={String(condition.value ?? 'GRANTED')} onValueChange={set}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="GRANTED">Accordé</SelectItem>
          <SelectItem value="UNKNOWN">Inconnu</SelectItem>
          <SelectItem value="DENIED">Refusé</SelectItem>
          <SelectItem value="WITHDRAWN">Retiré</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="h-8 w-40 text-xs"
      type={type === 'number' || condition.operator === 'within_days' ? 'number' : type === 'date' ? 'date' : 'text'}
      value={String(condition.value ?? '')}
      onChange={(e) => set(type === 'number' || condition.operator === 'within_days' ? Number(e.target.value) : e.target.value)}
      placeholder={condition.operator === 'within_days' ? '60' : ''}
    />
  );
}
