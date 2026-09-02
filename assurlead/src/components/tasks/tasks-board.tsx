'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Check, Trash2, Phone, FileText, Clock, CalendarCheck, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { createTaskAction, deleteTaskAction, updateTaskStatusAction } from '@/server/actions/tasks';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/domain';
import { cn } from '@/lib/utils';

type Task = {
  id: string; title: string; description: string; type: string;
  status: string; priority: string; dueAt: string | null;
  assigneeId: string | null; assigneeName: string | null;
  leadId: string | null; leadName: string | null; leadScore: number | null;
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone, QUOTE: FileText, FOLLOW_UP: Clock, DOCUMENT: FolderOpen, APPOINTMENT: CalendarCheck, OTHER: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  CALL: 'Appeler le client', QUOTE: 'Envoyer un devis', FOLLOW_UP: 'Relancer',
  DOCUMENT: 'Demander un document', APPOINTMENT: 'Rendez-vous', OTHER: 'Autre',
};

export function TasksBoard({
  tasks, members, leads, canWrite, currentUserId,
}: {
  tasks: Task[]; members: { id: string; name: string }[]; leads: { id: string; name: string }[];
  canWrite: boolean; currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title: '', description: '', type: 'CALL', priority: 'NORMAL',
    leadId: '', assigneeId: currentUserId, dueAt: '',
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === 'all') next.delete(key); else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const overdue = tasks.filter((t) => t.status !== 'DONE' && t.dueAt && new Date(t.dueAt) < new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={params.get('scope') ?? 'mine'} onValueChange={(v) => setParam('scope', v)}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">Mes tâches</SelectItem>
            <SelectItem value="all">Toutes les tâches</SelectItem>
          </SelectContent>
        </Select>
        <Select value={params.get('status') ?? 'all'} onValueChange={(v) => setParam('status', v)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="TODO">À faire</SelectItem>
            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
            <SelectItem value="DONE">Terminées</SelectItem>
          </SelectContent>
        </Select>
        {overdue.length > 0 ? <Badge variant="destructive">{overdue.length} en retard</Badge> : null}
        {canWrite ? (
          <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><Plus /> Nouvelle tâche</Button>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Aucune tâche"
          description="Les tâches sont créées manuellement ou automatiquement par vos règles d’automatisation (par exemple : rappeler un lead chaud dans les 15 minutes)."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {tasks.map((task) => {
              const Icon = TYPE_ICONS[task.type] ?? FileText;
              const isOverdue = task.status !== 'DONE' && task.dueAt && new Date(task.dueAt) < new Date();
              return (
                <div key={task.id} className="flex items-start gap-3 p-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={task.status === 'DONE'}
                    disabled={!canWrite}
                    onCheckedChange={async (v) => {
                      const r = await updateTaskStatusAction(task.id, v ? 'DONE' : 'TODO');
                      if (r.ok) router.refresh(); else toast.error(r.error);
                    }}
                    aria-label="Marquer comme terminée"
                  />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', task.status === 'DONE' && 'text-muted-foreground line-through')}>
                      {task.title}
                    </p>
                    {task.description ? <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p> : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={task.priority === 'URGENT' ? 'destructive' : task.priority === 'HIGH' ? 'warning' : 'muted'}>
                        {taskPriorityLabel(task.priority as 'NORMAL')}
                      </Badge>
                      <Badge variant="secondary">{TYPE_LABELS[task.type] ?? task.type}</Badge>
                      {task.dueAt ? (
                        <span className={cn('text-[11px]', isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                          {isOverdue ? 'En retard — ' : 'Échéance '}
                          {new Date(task.dueAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      ) : null}
                      {task.leadName ? (
                        <Link href={`/leads/${task.leadId}`} className="text-[11px] text-primary hover:underline">
                          {task.leadName}{task.leadScore !== null ? ` · ${task.leadScore}/100` : ''}
                        </Link>
                      ) : null}
                      {task.assigneeName ? <span className="text-[11px] text-muted-foreground">{task.assigneeName}</span> : null}
                    </div>
                  </div>
                  {canWrite ? (
                    <Button
                      size="icon-sm" variant="ghost" aria-label="Supprimer"
                      onClick={async () => {
                        const r = await deleteTaskAction(task.id);
                        if (r.ok) { toast.success('Tâche supprimée'); router.refresh(); } else toast.error(r.error);
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Rappeler Jean Dupont" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                      <SelectItem key={p} value={p}>{taskPriorityLabel(p as 'NORMAL')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lead associé</Label>
                <Select value={draft.leadId || 'none'} onValueChange={(v) => setDraft((d) => ({ ...d, leadId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigné à</Label>
                <Select value={draft.assigneeId} onValueChange={(v) => setDraft((d) => ({ ...d, assigneeId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Échéance</Label>
                <Input type="datetime-local" value={draft.dueAt} onChange={(e) => setDraft((d) => ({ ...d, dueAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              loading={saving}
              onClick={async () => {
                if (draft.title.trim().length < 2) { toast.error('Donnez un titre à la tâche.'); return; }
                setSaving(true);
                const r = await createTaskAction({
                  ...draft,
                  leadId: draft.leadId || null,
                  dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
                });
                setSaving(false);
                if (r.ok) {
                  toast.success('Tâche créée');
                  setOpen(false);
                  setDraft({ title: '', description: '', type: 'CALL', priority: 'NORMAL', leadId: '', assigneeId: currentUserId, dueAt: '' });
                  router.refresh();
                } else toast.error(r.error);
              }}
            >
              Créer la tâche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
