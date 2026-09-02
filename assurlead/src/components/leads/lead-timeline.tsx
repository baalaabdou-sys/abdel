'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Mail, StickyNote, ArrowRightLeft, UserPlus, CalendarCheck, FileText, Cog } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addLeadNoteAction } from '@/server/actions/leads';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  NOTE: StickyNote, CALL: Phone, EMAIL: Mail, STATUS_CHANGE: ArrowRightLeft,
  ASSIGNMENT: UserPlus, APPOINTMENT: CalendarCheck, FORM: FileText, SYSTEM: Cog, TASK: FileText,
};

export function LeadTimeline({
  leadId, activities, canWrite,
}: {
  leadId: string;
  activities: { id: string; type: string; title: string; body: string | null; userName: string | null; createdAt: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [type, setType] = React.useState('NOTE');
  const [saving, setSaving] = React.useState(false);

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>Chronologie</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {canWrite ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">Note</SelectItem>
                  <SelectItem value="CALL">Appel</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Compte rendu de l’échange…"
            />
            <Button
              size="sm" loading={saving} disabled={!body.trim()}
              onClick={async () => {
                setSaving(true);
                const r = await addLeadNoteAction(leadId, body, type);
                setSaving(false);
                if (r.ok) { setBody(''); toast.success('Ajouté à la chronologie'); router.refresh(); }
                else toast.error(r.error);
              }}
            >
              Ajouter
            </Button>
          </div>
        ) : null}

        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune activité.</p>
        ) : (
          <ol className="space-y-3">
            {activities.map((activity) => {
              const Icon = ICONS[activity.type] ?? StickyNote;
              return (
                <li key={activity.id} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1 border-b pb-3 last:border-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-medium">{activity.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        {activity.userName ? ` · ${activity.userName}` : ''}
                      </span>
                    </p>
                    {activity.body ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{activity.body}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
