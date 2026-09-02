'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { GripVertical, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CRM_PIPELINE, insuranceLabel, leadStatusLabel, scoreBand } from '@/lib/domain';
import { updateLeadStatusAction } from '@/server/actions/leads';
import { cn, formatNumber } from '@/lib/utils';
import type { InsuranceType, LeadStatus } from '@prisma/client';

type Lead = {
  id: string; name: string; email: string | null; phone: string | null; city: string | null;
  product: InsuranceType; status: LeadStatus; score: number; value: number | null;
  ownerName: string | null; createdAt: string;
};

const COLUMN_TONE: Partial<Record<LeadStatus, string>> = {
  NOUVEAU: 'border-t-primary',
  CONTACTE: 'border-t-sky-500',
  QUALIFIE: 'border-t-violet-500',
  RENDEZ_VOUS: 'border-t-amber-500',
  DEVIS_ENVOYE: 'border-t-orange-500',
  GAGNE: 'border-t-emerald-500',
  PERDU: 'border-t-rose-500',
};

export function CrmBoard({
  leads: initialLeads, members, canWrite,
}: {
  leads: Lead[]; members: { id: string; name: string }[]; canWrite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [leads, setLeads] = React.useState(initialLeads);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<LeadStatus | null>(null);

  React.useEffect(() => setLeads(initialLeads), [initialLeads]);

  const move = async (leadId: string, status: LeadStatus) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    // Optimistic move, reverted if the server rejects it.
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, status } : l)));
    const result = await updateLeadStatusAction(leadId, status);
    if (!result.ok) {
      setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l)));
      toast.error(result.error);
    } else {
      toast.success(`Déplacé vers « ${leadStatusLabel(status)} »`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={params.get('owner') ?? 'all'}
          onValueChange={(v) => {
            const next = new URLSearchParams(params.toString());
            if (v === 'all') next.delete('owner'); else next.set('owner', v);
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Commercial" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les commerciaux</SelectItem>
            <SelectItem value="unassigned">Non assignés</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {CRM_PIPELINE.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status);
          const totalValue = columnLeads.reduce((s, l) => s + (l.value ?? 0), 0);
          return (
            <div
              key={status}
              onDragOver={(e) => { if (canWrite) { e.preventDefault(); setOver(status); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) void move(id, status);
              }}
              className={cn(
                'flex w-64 shrink-0 flex-col rounded-xl border border-t-2 bg-card transition-colors',
                COLUMN_TONE[status] ?? 'border-t-muted',
                over === status && 'bg-accent/50 ring-2 ring-primary/40',
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                <span className="text-xs font-semibold">{leadStatusLabel(status)}</span>
                <span className="flex items-center gap-1.5">
                  {totalValue > 0 ? (
                    <span className="num text-[10px] text-muted-foreground">{formatNumber(totalValue)} €</span>
                  ) : null}
                  <Badge variant="muted">{columnLeads.length}</Badge>
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: '68vh' }}>
                {columnLeads.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-muted-foreground">Aucun lead</p>
                ) : (
                  columnLeads.map((lead) => {
                    const band = scoreBand(lead.score);
                    return (
                      <div
                        key={lead.id}
                        draggable={canWrite}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', lead.id); setDragging(lead.id); }}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          'rounded-lg border bg-background p-2.5 shadow-sm transition-opacity',
                          canWrite && 'cursor-grab active:cursor-grabbing',
                          dragging === lead.id && 'opacity-40',
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium hover:underline">{lead.name}</span>
                          </Link>
                          {canWrite ? <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {[lead.phone, lead.city].filter(Boolean).join(' · ') || lead.email || '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <Badge variant={band.tone}>{band.emoji} {lead.score}</Badge>
                          <Badge variant="secondary">{insuranceLabel(lead.product)}</Badge>
                          {lead.value ? (
                            <Badge variant="muted"><Euro className="h-2.5 w-2.5" /> {formatNumber(lead.value)}</Badge>
                          ) : null}
                        </div>
                        {lead.ownerName ? (
                          <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{lead.ownerName}</p>
                        ) : (
                          <p className="mt-1.5 text-[10px] text-warning">Non assigné</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
