'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CopyCheck, Merge, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { mergeContactsAction } from '@/server/actions/contacts';
import type { DuplicateGroup } from '@/server/services/duplicates';
import { cn } from '@/lib/utils';

export function DuplicatesView({ groups, canMerge }: { groups: DuplicateGroup[]; canMerge: boolean }) {
  const router = useRouter();
  // Default primary per group: the record carrying the most information.
  const [primaries, setPrimaries] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [
      g.key,
      [...g.contacts].sort((a, b) => b.filledFields - a.filledFields || a.createdAt.localeCompare(b.createdAt))[0].id,
    ])),
  );
  const [confirming, setConfirming] = React.useState<DuplicateGroup | null>(null);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Aucun doublon détecté"
        description="Aucun numéro de téléphone partagé ni homonyme suspect dans votre base. La détection est refaite à chaque ouverture de cette page."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex gap-2.5 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong className="font-semibold">Rien n’est supprimé sans votre validation.</strong> Lors
          d’une fusion, la fiche principale conserve ses valeurs, ses champs vides sont complétés par
          les doublons, et tout l’historique (leads, formulaires, consentements, campagnes) est
          rattaché à la fiche conservée. L’état le plus restrictif l’emporte toujours : si l’un des
          doublons est désinscrit, la fiche fusionnée l’est aussi.
        </span>
      </p>

      {groups.map((group) => {
        const primaryId = primaries[group.key];
        return (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-1.5">
                    <CopyCheck className="h-3.5 w-3.5" /> {group.reason}
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez la fiche à conserver, puis fusionnez. Vérifiez qu’il ne s’agit pas
                    d’une simple homonymie.
                  </CardDescription>
                </div>
                <Badge variant={group.kind === 'PHONE' ? 'destructive' : group.kind === 'NAME_PHONE' ? 'warning' : 'muted'}>
                  {group.kind === 'PHONE' ? 'Téléphone identique'
                    : group.kind === 'NAME_PHONE' ? 'Nom + téléphone'
                    : 'Nom identique'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup
                value={primaryId}
                onValueChange={(v) => setPrimaries((p) => ({ ...p, [group.key]: v }))}
                className="gap-2"
              >
                {group.contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={cn(
                      'flex cursor-pointer flex-wrap items-start gap-3 rounded-lg border p-3 transition-colors',
                      primaryId === contact.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/40',
                    )}
                  >
                    <RadioGroupItem value={contact.id} className="mt-1" disabled={!canMerge} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/contacts/${contact.id}`} className="text-sm font-medium hover:underline">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email}
                        </Link>
                        {primaryId === contact.id ? <Badge variant="default">à conserver</Badge> : null}
                        {contact.suppressed ? <Badge variant="destructive">supprimé des envois</Badge> : null}
                        {contact.hasLeads ? <Badge variant="success">a généré des leads</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {contact.email}
                        {contact.phone ? ` · ${contact.phone}` : ''}
                        {contact.city ? ` · ${contact.city}` : ''}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {contact.filledFields} champ(s) renseigné(s) · créé le{' '}
                        {new Date(contact.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>

              {canMerge ? (
                <Button size="sm" variant="outline" onClick={() => setConfirming(group)}>
                  <Merge /> Fusionner dans la fiche sélectionnée
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(v) => { if (!v) setConfirming(null); }}
        title="Fusionner ces fiches ?"
        description={
          confirming
            ? `${confirming.contacts.length - 1} fiche(s) seront fusionnée(s) dans celle que vous avez sélectionnée, puis supprimée(s). Leur historique — leads, formulaires, consentements, campagnes — est transféré. Cette action est irréversible.`
            : ''
        }
        destructive
        confirmLabel="Fusionner"
        onConfirm={async () => {
          if (!confirming) return;
          const primaryId = primaries[confirming.key];
          const duplicateIds = confirming.contacts.map((c) => c.id).filter((id) => id !== primaryId);
          const r = await mergeContactsAction(primaryId, duplicateIds);
          if (r.ok) {
            toast.success(`${r.data.mergedCount} fiche(s) fusionnée(s), ${r.data.movedLeads} lead(s) transféré(s)`);
            router.refresh();
          } else toast.error(r.error);
        }}
      />
    </div>
  );
}
