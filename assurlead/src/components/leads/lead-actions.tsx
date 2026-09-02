'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, UserPlus, CheckSquare, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUS_LIST, leadStatusLabel } from '@/lib/domain';
import { assignLeadAction, scheduleAppointmentAction, updateLeadAction, updateLeadStatusAction } from '@/server/actions/leads';
import { createTaskAction } from '@/server/actions/tasks';

export function LeadActions({
  leadId, status, ownerId, appointmentAt, value, members, canWrite, canAssign, canCreateTask,
}: {
  leadId: string; status: string; ownerId: string | null; appointmentAt: string | null;
  value: number | null; members: { id: string; name: string }[];
  canWrite: boolean; canAssign: boolean; canCreateTask: boolean;
}) {
  const router = useRouter();
  const [appointment, setAppointment] = React.useState(appointmentAt ? appointmentAt.slice(0, 16) : '');
  const [dealValue, setDealValue] = React.useState(value?.toString() ?? '');
  const [busy, setBusy] = React.useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Actions commerciales</CardTitle>
        <CardDescription>Chaque action enregistre la réactivité et alimente la chronologie.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select
            value={status}
            disabled={!canWrite}
            onValueChange={async (v) => {
              const r = await updateLeadStatusAction(leadId, v);
              if (r.ok) { toast.success('Statut mis à jour'); router.refresh(); } else toast.error(r.error);
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{leadStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Commercial assigné</Label>
          <Select
            value={ownerId ?? 'none'}
            disabled={!canAssign}
            onValueChange={async (v) => {
              const r = await assignLeadAction(leadId, v === 'none' ? null : v, 'MANUAL');
              if (r.ok) { toast.success('Lead assigné'); router.refresh(); } else toast.error(r.error);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Rendez-vous</Label>
          <div className="flex gap-1.5">
            <Input type="datetime-local" value={appointment} disabled={!canWrite} onChange={(e) => setAppointment(e.target.value)} />
            <Button
              size="icon" variant="outline" disabled={!canWrite || !appointment} loading={busy}
              aria-label="Planifier"
              onClick={async () => {
                setBusy(true);
                const r = await scheduleAppointmentAction(leadId, new Date(appointment).toISOString());
                setBusy(false);
                if (r.ok) { toast.success('Rendez-vous planifié'); router.refresh(); } else toast.error(r.error);
              }}
            >
              <CalendarCheck />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Valeur estimée (€)</Label>
          <div className="flex gap-1.5">
            <Input type="number" value={dealValue} disabled={!canWrite} onChange={(e) => setDealValue(e.target.value)} placeholder="480" />
            <Button
              size="icon" variant="outline" disabled={!canWrite}
              aria-label="Enregistrer la valeur"
              onClick={async () => {
                const r = await updateLeadAction(leadId, { value: dealValue ? Number(dealValue) : null });
                if (r.ok) { toast.success('Valeur enregistrée'); router.refresh(); } else toast.error(r.error);
              }}
            >
              <Euro />
            </Button>
          </div>
        </div>

        {canCreateTask ? (
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button
              variant="outline" size="sm"
              onClick={async () => {
                const r = await createTaskAction({
                  title: 'Rappeler le lead', type: 'CALL', priority: 'HIGH', leadId,
                  dueAt: new Date(Date.now() + 30 * 60_000).toISOString(),
                });
                if (r.ok) { toast.success('Tâche d’appel créée'); router.refresh(); } else toast.error(r.error);
              }}
            >
              <CheckSquare /> Créer une tâche d’appel
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={async () => {
                const r = await createTaskAction({
                  title: 'Envoyer le devis', type: 'QUOTE', priority: 'NORMAL', leadId,
                  dueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
                });
                if (r.ok) { toast.success('Tâche « devis » créée'); router.refresh(); } else toast.error(r.error);
              }}
            >
              <CheckSquare /> Tâche « envoyer le devis »
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
