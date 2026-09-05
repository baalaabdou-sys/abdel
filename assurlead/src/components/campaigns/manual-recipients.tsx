'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
  addManualRecipientsAction, listManualRecipientsAction, removeManualRecipientAction,
} from '@/server/actions/campaigns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type ManualRecipient = {
  id: string;
  email: string;
  name: string;
  status: string;
  consentEmail: string;
  verificationStatus: string;
  removable: boolean;
};

type Outcome = { email: string; outcome: string; warnings: string[] };

/** Why an address was refused, in the words the user needs to act on. */
const OUTCOME_LABELS: Record<string, string> = {
  ADDED: 'Ajouté',
  CONTACT_CREATED: 'Ajouté — nouveau contact créé',
  ALREADY_PRESENT: 'Déjà destinataire de cette campagne',
  INVALID_SYNTAX: 'Adresse mal formée',
  SUPPRESSED: 'Sur la liste de suppression — jamais contactée',
  UNSUBSCRIBED: 'Désinscrit — jamais contacté',
  INVALID_EMAIL: 'Adresse vérifiée comme invalide',
};

const REFUSED = new Set(['INVALID_SYNTAX', 'SUPPRESSED', 'UNSUBSCRIBED', 'INVALID_EMAIL']);

export function ManualRecipients({ campaignId, editable }: { campaignId: string; editable: boolean }) {
  const [input, setInput] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [recipients, setRecipients] = React.useState<ManualRecipient[]>([]);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);

  const refresh = React.useCallback(async () => {
    const res = await listManualRecipientsAction(campaignId);
    if (res.ok) setRecipients(res.data.recipients);
  }, [campaignId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    if (!input.trim()) return;
    setPending(true);
    try {
      const res = await addManualRecipientsAction(campaignId, { emails: input });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOutcomes(res.data.results);
      if (res.data.added > 0) {
        toast.success(`${res.data.added} destinataire(s) ajouté(s).`);
        setInput('');
      } else {
        toast.error('Aucune adresse ajoutée. Voir le détail ci-dessous.');
      }
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    const res = await removeManualRecipientAction(campaignId, id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Destinataire retiré.');
    await refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Destinataires ajoutés à la main</CardTitle>
        <CardDescription>
          Une adresse ou plusieurs, séparées par une virgule, un point-virgule, un espace ou un retour
          à la ligne. Utile pour un envoi de test à votre propre adresse, ou pour une campagne adressée
          à quelques personnes sans passer par un segment. Une adresse supprimée, désinscrite ou
          invalide est toujours refusée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'vous@societe.fr\nprospect@exemple.fr'}
          rows={3}
          disabled={!editable || pending}
        />
        <Button onClick={add} loading={pending} disabled={!editable || !input.trim()} size="sm">
          <Plus /> Ajouter
        </Button>

        {outcomes.length > 0 ? (
          <ul className="space-y-1 rounded-lg border p-3 text-xs">
            {outcomes.map((o) => (
              <li key={o.email} className={REFUSED.has(o.outcome) ? 'text-destructive' : 'text-muted-foreground'}>
                <span className="font-medium">{o.email}</span> — {OUTCOME_LABELS[o.outcome] ?? o.outcome}
                {o.warnings.map((w) => (
                  <span key={w} className="mt-0.5 flex items-start gap-1 text-amber-600 dark:text-amber-500">
                    <TriangleAlert className="mt-0.5 size-3 shrink-0" /> {w}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : null}

        {recipients.length > 0 ? (
          <div className="rounded-lg border">
            <p className="border-b px-3 py-2 text-xs font-semibold">
              {recipients.length} destinataire(s) ajouté(s) manuellement
            </p>
            <ul className="divide-y">
              {recipients.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.email}</span>
                    {r.name ? <span className="text-muted-foreground">{r.name}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.consentEmail !== 'GRANTED' ? (
                      <Badge variant="outline" className="text-[10px]">Consentement {r.consentEmail.toLowerCase()}</Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                    {r.removable && editable ? (
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label={`Retirer ${r.email}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
