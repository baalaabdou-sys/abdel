'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveFormAction } from '@/server/actions/forms';

export type EditableField = {
  id?: string; key: string; label: string; type: string; step: number; order: number;
  required: boolean; placeholder: string; helpText: string;
  options: { value: string; label: string }[];
  conditionField: string | null; conditionValue: string | null;
};

export type EditableForm = {
  id: string; name: string; multiStep: boolean;
  steps: { key: string; title: string; description: string }[];
  consentText: string; successMessage: string; fields: EditableField[];
};

const FIELD_TYPES: { value: string; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Téléphone' },
  { value: 'postal', label: 'Code postal' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'radio', label: 'Choix unique (boutons)' },
  { value: 'checkbox', label: 'Case à cocher / consentement' },
  { value: 'textarea', label: 'Texte long' },
];

export function FormBuilder({ form, onChange, disabled }: { form: EditableForm; onChange: (f: EditableForm) => void; disabled: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const maxStep = Math.max(1, ...form.fields.map((f) => f.step));

  const setField = (index: number, next: EditableField) =>
    onChange({ ...form, fields: form.fields.map((f, i) => (i === index ? next : f)) });

  const move = (index: number, delta: number) => {
    const next = [...form.fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...form, fields: next.map((f, i) => ({ ...f, order: i })) });
  };

  const save = async () => {
    setSaving(true);
    const result = await saveFormAction(form.id, {
      name: form.name,
      multiStep: form.multiStep,
      steps: form.steps,
      consentText: form.consentText,
      successMessage: form.successMessage,
      fields: form.fields.map((f, i) => ({ ...f, order: i })),
    });
    setSaving(false);
    if (result.ok) { toast.success('Formulaire enregistré'); router.refresh(); }
    else toast.error(result.error);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Paramètres du formulaire</CardTitle>
          <CardDescription>Un formulaire court convertit mieux ; un formulaire complet qualifie mieux. Testez les deux.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom interne</Label>
            <Input value={form.name} disabled={disabled} onChange={(e) => onChange({ ...form, name: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-xs font-medium">Formulaire multi-étapes</p>
              <p className="text-[10px] text-muted-foreground">Affiche une barre de progression et découpe les questions.</p>
            </div>
            <Switch checked={form.multiStep} disabled={disabled} onCheckedChange={(v) => onChange({ ...form, multiStep: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Texte de consentement</Label>
            <Textarea rows={3} value={form.consentText} disabled={disabled}
              onChange={(e) => onChange({ ...form, consentText: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">
              Ce texte est archivé avec chaque soumission, comme preuve de ce qui a été présenté au visiteur.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Message de confirmation</Label>
            <Textarea rows={2} value={form.successMessage} disabled={disabled}
              onChange={(e) => onChange({ ...form, successMessage: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {form.multiStep ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Étapes</CardTitle>
            <Button size="sm" variant="outline" disabled={disabled}
              onClick={() => onChange({ ...form, steps: [...form.steps, { key: `etape_${form.steps.length + 1}`, title: `Étape ${form.steps.length + 1}`, description: '' }] })}>
              <Plus /> Étape
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.steps.map((step, i) => (
              <div key={i} className="flex gap-1.5">
                <Input className="h-8 text-xs" value={step.title} disabled={disabled} placeholder="Titre de l’étape"
                  onChange={(e) => onChange({ ...form, steps: form.steps.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)) })} />
                <Input className="h-8 text-xs" value={step.description} disabled={disabled} placeholder="Sous-titre"
                  onChange={(e) => onChange({ ...form, steps: form.steps.map((s, j) => (j === i ? { ...s, description: e.target.value } : s)) })} />
                <Button size="icon-sm" variant="ghost" disabled={disabled}
                  onClick={() => onChange({ ...form, steps: form.steps.filter((_, j) => j !== i) })} aria-label="Retirer">
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Champs ({form.fields.length})</CardTitle>
            <CardDescription>L’ordre d’affichage suit cette liste.</CardDescription>
          </div>
          <Button
            size="sm" variant="outline" disabled={disabled}
            onClick={() => onChange({
              ...form,
              fields: [...form.fields, {
                key: `champ_${form.fields.length + 1}`, label: 'Nouveau champ', type: 'text',
                step: maxStep, order: form.fields.length, required: false,
                placeholder: '', helpText: '', options: [], conditionField: null, conditionValue: null,
              }],
            })}
          >
            <Plus /> Champ
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.fields.map((field, index) => (
            <div key={field.id ?? index} className="space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Badge variant="muted">Étape {field.step}</Badge>
                  <span className="truncate text-xs font-medium">{field.label}</span>
                  {field.required ? <Badge variant="default">obligatoire</Badge> : null}
                </div>
                <div className="flex shrink-0">
                  <Button size="icon-sm" variant="ghost" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label="Monter"><ArrowUp /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={disabled || index === form.fields.length - 1} onClick={() => move(index, 1)} aria-label="Descendre"><ArrowDown /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={disabled}
                    onClick={() => onChange({ ...form, fields: form.fields.filter((_, i) => i !== index) })} aria-label="Retirer">
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Libellé</Label>
                  <Input className="h-8 text-xs" value={field.label} disabled={disabled}
                    onChange={(e) => setField(index, { ...field, label: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Clé technique</Label>
                  <Input className="h-8 font-mono text-xs" value={field.key} disabled={disabled}
                    onChange={(e) => setField(index, { ...field, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Type</Label>
                  <Select value={field.type} disabled={disabled} onValueChange={(v) => setField(index, { ...field, type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Étape</Label>
                  <Input className="h-8 text-xs" type="number" min={1} max={10} value={field.step} disabled={disabled}
                    onChange={(e) => setField(index, { ...field, step: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Placeholder</Label>
                  <Input className="h-8 text-xs" value={field.placeholder} disabled={disabled}
                    onChange={(e) => setField(index, { ...field, placeholder: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Aide affichée</Label>
                  <Input className="h-8 text-xs" value={field.helpText} disabled={disabled}
                    onChange={(e) => setField(index, { ...field, helpText: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Afficher si le champ…</Label>
                  <Select
                    value={field.conditionField ?? 'none'}
                    disabled={disabled}
                    onValueChange={(v) => setField(index, { ...field, conditionField: v === 'none' ? null : v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Toujours afficher</SelectItem>
                      {form.fields.filter((f, i) => i !== index && ['select', 'radio'].includes(f.type)).map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field.conditionField ? (
                  <div className="space-y-1">
                    <Label className="text-[10px]">…vaut</Label>
                    <Input className="h-8 text-xs" value={field.conditionValue ?? ''} disabled={disabled}
                      onChange={(e) => setField(index, { ...field, conditionValue: e.target.value })} />
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2 rounded-md border p-2 sm:col-span-2">
                  <span className="text-[10px] font-medium">Champ obligatoire</span>
                  <Switch checked={field.required} disabled={disabled} onCheckedChange={(v) => setField(index, { ...field, required: v })} />
                </div>
              </div>

              {['select', 'radio'].includes(field.type) ? (
                <div className="space-y-1.5 rounded-md border p-2">
                  <Label className="text-[10px]">Options</Label>
                  {field.options.map((opt, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input className="h-7 font-mono text-[11px]" value={opt.value} disabled={disabled} placeholder="valeur"
                        onChange={(e) => setField(index, { ...field, options: field.options.map((o, j) => (j === i ? { ...o, value: e.target.value } : o)) })} />
                      <Input className="h-7 text-[11px]" value={opt.label} disabled={disabled} placeholder="Libellé affiché"
                        onChange={(e) => setField(index, { ...field, options: field.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)) })} />
                      <Button size="icon-sm" variant="ghost" disabled={disabled}
                        onClick={() => setField(index, { ...field, options: field.options.filter((_, j) => j !== i) })} aria-label="Retirer">
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" disabled={disabled}
                    onClick={() => setField(index, { ...field, options: [...field.options, { value: '', label: '' }] })}>
                    <Plus /> Option
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {!disabled ? (
        <Button className="w-full" onClick={save} loading={saving}><Save /> Enregistrer le formulaire</Button>
      ) : null}
    </div>
  );
}
