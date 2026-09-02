'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Workflow, Trash2, Pencil, Zap, RotateCcw } from 'lucide-react';
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
import { deleteAutomationAction, restoreDefaultAutomationsAction, saveAutomationAction, toggleAutomationAction } from '@/server/actions/automations';

type Rule = {
  id: string; name: string; description: string; trigger: string;
  conditions: { field: string; operator: string; value: unknown }[];
  actions: Record<string, unknown>[];
  enabled: boolean; runCount: number; lastRunAt: string | null; executionCount: number;
};

const TRIGGERS: { value: string; label: string; help: string }[] = [
  { value: 'LEAD_CREATED', label: 'Un lead est créé', help: 'Se déclenche à chaque nouveau lead, quel que soit son score.' },
  { value: 'LEAD_SCORE_ABOVE', label: 'Le score d’un lead dépasse un seuil', help: 'Utilisez une condition « score ≥ … ».' },
  { value: 'LEAD_NOT_CONTACTED', label: 'Un lead n’est pas contacté à temps', help: 'Utilisez une condition « minutes ≥ … ».' },
  { value: 'FORM_SUBMITTED', label: 'Un formulaire est soumis', help: 'Avant même la création du lead.' },
  { value: 'HARD_BOUNCE', label: 'Un rebond définitif est reçu', help: 'Remonté par le webhook du fournisseur d’envoi.' },
  { value: 'UNSUBSCRIBE', label: 'Un contact se désinscrit', help: 'Lien de désinscription ou réponse « stop ».' },
  { value: 'LEAD_WON', label: 'Un lead est gagné', help: 'Le statut du lead passe à « Gagné ».' },
];

const ACTION_TYPES: { value: string; label: string; fields: string[] }[] = [
  { value: 'NOTIFY_TEAM', label: 'Notifier l’équipe', fields: [] },
  { value: 'NOTIFY_OWNER', label: 'Notifier le commercial assigné', fields: [] },
  { value: 'NOTIFY_MANAGERS', label: 'Alerter les managers', fields: [] },
  { value: 'ASSIGN_LEAD', label: 'Assigner le lead', fields: ['strategy'] },
  { value: 'CREATE_TASK', label: 'Créer une tâche', fields: ['title', 'taskType', 'priority', 'dueInMinutes'] },
  { value: 'SUPPRESS_CONTACT', label: 'Ajouter à la liste de suppression', fields: ['reason'] },
  { value: 'SET_LEAD_STATUS', label: 'Changer le statut du lead', fields: ['status'] },
  { value: 'ADD_TAG', label: 'Ajouter un tag', fields: ['tag'] },
  { value: 'CANCEL_SCHEDULED_SENDS', label: 'Annuler les envois programmés', fields: [] },
];

const EMPTY: Omit<Rule, 'id' | 'runCount' | 'lastRunAt' | 'executionCount'> = {
  name: '', description: '', trigger: 'LEAD_CREATED', conditions: [], actions: [{ type: 'NOTIFY_TEAM' }], enabled: true,
};

export function AutomationsView({
  rules, executions, canWrite,
}: {
  rules: Rule[];
  executions: { id: string; ruleName: string; entityType: string; entityId: string; status: string; createdAt: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Rule | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Rule | null>(null);

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setCreating(true); setEditing(null); }}><Plus /> Nouvelle règle</Button>
          {rules.length === 0 ? (
            <Button
              size="sm" variant="outline"
              onClick={async () => {
                const r = await restoreDefaultAutomationsAction();
                if (r.ok) { toast.success('Règles par défaut restaurées'); router.refresh(); } else toast.error(r.error);
              }}
            >
              <RotateCcw /> Restaurer les règles par défaut
            </Button>
          ) : null}
        </div>
      ) : null}

      {rules.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Aucune automatisation"
          description="Les automatisations font le travail répétitif : assigner les leads, créer les tâches d’appel, alerter en cas de retard, supprimer les adresses en rebond."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rules.map((rule) => {
            const trigger = TRIGGERS.find((t) => t.value === rule.trigger);
            return (
              <Card key={rule.id} className={rule.enabled ? undefined : 'opacity-60'}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{rule.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{rule.description}</CardDescription>
                  </div>
                  {canWrite ? (
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={async (v) => {
                        const r = await toggleAutomationAction(rule.id, v);
                        if (r.ok) { toast.success(v ? 'Règle activée' : 'Règle désactivée'); router.refresh(); } else toast.error(r.error);
                      }}
                      aria-label="Activer la règle"
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5 text-xs">
                    <p><span className="font-semibold text-muted-foreground">QUAND </span>{trigger?.label ?? rule.trigger}</p>
                    {rule.conditions.length > 0 ? (
                      <p>
                        <span className="font-semibold text-muted-foreground">SI </span>
                        {rule.conditions.map((c) => `${c.field} ${OPERATORS[c.operator] ?? c.operator} ${String(c.value)}`).join(' et ')}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-semibold text-muted-foreground">ALORS </span>
                      {rule.actions.map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? String(a.type)).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="muted"><Zap className="h-2.5 w-2.5" /> {rule.runCount} exécution(s)</Badge>
                    {rule.lastRunAt ? <span>Dernière : {new Date(rule.lastRunAt).toLocaleString('fr-FR')}</span> : <span>Jamais exécutée</span>}
                  </div>
                  {canWrite ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(rule); setCreating(false); }}><Pencil /> Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(rule)}><Trash2 className="text-destructive" /></Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {executions.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Exécutions récentes</CardTitle>
            <CardDescription>Journal des déclenchements automatiques.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs">
              {executions.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b pb-1.5 last:border-0">
                  <span className="min-w-0 truncate font-medium">{e.ruleName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={e.status === 'SUCCESS' ? 'success' : 'destructive'}>{e.status}</Badge>
                    <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleString('fr-FR')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <RuleDialog
        key={editing?.id ?? 'new'}
        open={creating || !!editing}
        rule={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null); }}
        title="Supprimer cette règle ?"
        description="Les actions déjà exécutées ne sont pas annulées."
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteAutomationAction(deleting.id);
          if (r.ok) { toast.success('Règle supprimée'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </div>
  );
}

const OPERATORS: Record<string, string> = { gte: '≥', lte: '≤', equals: '=', in: 'parmi' };

function RuleDialog({
  open, rule, onOpenChange, onSaved,
}: {
  open: boolean; rule: Rule | null; onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const [values, setValues] = React.useState(rule ?? EMPTY);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setValues(rule ?? EMPTY), [rule]);
  const trigger = TRIGGERS.find((t) => t.value === values.trigger);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Modifier la règle' : 'Nouvelle automatisation'}</DialogTitle>
          <DialogDescription>Définissez le déclencheur, les conditions et les actions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom de la règle *</Label>
            <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Lead chaud → tâche d’appel urgente" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="space-y-1.5 rounded-lg border p-3">
            <Label className="text-[11px] font-semibold uppercase">Quand</Label>
            <Select value={values.trigger} onValueChange={(v) => setValues((s) => ({ ...s, trigger: v, conditions: [] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            {trigger ? <p className="text-[10px] text-muted-foreground">{trigger.help}</p> : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold uppercase">Si (conditions)</Label>
              <Button size="sm" variant="ghost"
                onClick={() => setValues((v) => ({ ...v, conditions: [...v.conditions, { field: 'score', operator: 'gte', value: 80 }] }))}>
                <Plus /> Condition
              </Button>
            </div>
            {values.conditions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Aucune condition : la règle s’applique à chaque déclenchement.</p>
            ) : (
              values.conditions.map((condition, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <Select value={condition.field}
                    onValueChange={(v) => setValues((s) => ({ ...s, conditions: s.conditions.map((c, j) => (j === i ? { ...c, field: v } : c)) }))}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Score du lead</SelectItem>
                      <SelectItem value="minutes">Minutes écoulées</SelectItem>
                      <SelectItem value="product">Produit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={condition.operator}
                    onValueChange={(v) => setValues((s) => ({ ...s, conditions: s.conditions.map((c, j) => (j === i ? { ...c, operator: v } : c)) }))}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gte">≥</SelectItem>
                      <SelectItem value="lte">≤</SelectItem>
                      <SelectItem value="equals">=</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="h-8 w-24 text-xs" value={String(condition.value ?? '')}
                    onChange={(e) => setValues((s) => ({
                      ...s,
                      conditions: s.conditions.map((c, j) => (j === i ? { ...c, value: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value } : c)),
                    }))} />
                  <Button size="icon-sm" variant="ghost" aria-label="Retirer"
                    onClick={() => setValues((s) => ({ ...s, conditions: s.conditions.filter((_, j) => j !== i) }))}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold uppercase">Alors (actions)</Label>
              <Button size="sm" variant="ghost"
                onClick={() => setValues((v) => ({ ...v, actions: [...v.actions, { type: 'NOTIFY_TEAM' }] }))}>
                <Plus /> Action
              </Button>
            </div>
            {values.actions.map((action, i) => {
              const meta = ACTION_TYPES.find((t) => t.value === action.type);
              return (
                <div key={i} className="space-y-1.5 rounded-md border p-2">
                  <div className="flex gap-1.5">
                    <Select
                      value={String(action.type)}
                      onValueChange={(v) => setValues((s) => ({ ...s, actions: s.actions.map((a, j) => (j === i ? { type: v } : a)) }))}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon-sm" variant="ghost" aria-label="Retirer"
                      onClick={() => setValues((s) => ({ ...s, actions: s.actions.filter((_, j) => j !== i) }))}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                  {meta?.fields.map((field) => (
                    <div key={field} className="flex items-center gap-1.5">
                      <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{FIELD_LABELS[field] ?? field}</span>
                      <Input
                        className="h-7 text-xs"
                        value={String(action[field] ?? '')}
                        placeholder={FIELD_PLACEHOLDERS[field] ?? ''}
                        onChange={(e) => setValues((s) => ({
                          ...s,
                          actions: s.actions.map((a, j) => (j === i ? { ...a, [field]: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value } : a)),
                        }))}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              const r = await saveAutomationAction(rule?.id ?? null, values);
              setSaving(false);
              if (r.ok) { toast.success('Règle enregistrée'); onSaved(); } else toast.error(r.error);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FIELD_LABELS: Record<string, string> = {
  strategy: 'Stratégie', title: 'Titre', taskType: 'Type', priority: 'Priorité',
  dueInMinutes: 'Échéance (min)', reason: 'Motif', status: 'Statut', tag: 'Tag',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  strategy: 'ROUND_ROBIN | PRODUCT | REGION | WORKLOAD',
  title: 'Appeler le lead chaud',
  taskType: 'CALL | QUOTE | FOLLOW_UP',
  priority: 'LOW | NORMAL | HIGH | URGENT',
  dueInMinutes: '15',
  reason: 'UNSUBSCRIBED | HARD_BOUNCE | DO_NOT_CONTACT',
  status: 'QUALIFIE | CONTACTE',
  tag: 'prioritaire',
};
