'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, TriangleAlert, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { askAssistantAction } from '@/server/actions/ai';
import { createSegmentAction } from '@/server/actions/segments';
import type { AssistantResponse } from '@/server/ai/assistant';

const SUGGESTIONS = [
  'Crée un segment de prospects Auto à Lyon dont l’échéance arrive dans 60 jours.',
  'Pourquoi les conversions ont baissé ?',
  'Montre-moi les campagnes qui génèrent le plus de leads.',
  'Montre les leads non contactés depuis plus de 20 minutes.',
];

export function AiAssistant({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<AssistantResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setResponse(null);
    const result = await askAssistantAction(text);
    setLoading(false);
    if (result.ok) setResponse(result.data);
    else toast.error(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Assistant IA
          </DialogTitle>
          <DialogDescription>
            Demandez une analyse, un segment ou une campagne. Aucune action sensible n’est exécutée
            sans votre confirmation explicite.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); void ask(prompt); }}
          className="flex gap-2"
        >
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex : crée une campagne assurance auto pour septembre…"
            autoFocus
          />
          <Button type="submit" size="icon" loading={loading} aria-label="Envoyer">
            {loading ? null : <Send />}
          </Button>
        </form>

        {!response && !loading ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Suggestions</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setPrompt(s); void ask(s); }}
                className="block w-full rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
          </div>
        ) : null}

        {response ? (
          <div className="space-y-3">
            {response.simulated ? (
              <Badge variant="warning">Fournisseur IA DEMO — réponse générée localement, sans appel externe</Badge>
            ) : null}

            <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">{response.answer}</p>

            {response.data ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      {response.data.columns.map((c) => (
                        <th key={c} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {response.data.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2.5 py-1.5">{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {response.confirmation ? (
              <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="text-xs">
                  <p className="font-semibold text-warning">Action sensible détectée — non exécutée</p>
                  <p className="mt-0.5 text-muted-foreground">{response.confirmation.description}</p>
                  <p className="mt-1 text-muted-foreground">
                    Réalisez cette action depuis l’écran concerné, où une confirmation explicite vous sera demandée.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {response.actions.map((action, i) => {
                if (action.kind === 'NAVIGATE') {
                  return (
                    <Button key={i} size="sm" variant="outline" onClick={() => { onOpenChange(false); router.push(action.href); }}>
                      {action.label} <ArrowRight />
                    </Button>
                  );
                }
                if (action.kind === 'CREATE_SEGMENT') {
                  return (
                    <div key={i} className="w-full space-y-2 rounded-lg border p-3">
                      <p className="text-xs font-semibold">Filtres proposés — à vérifier avant enregistrement</p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                        {action.explanations.map((e, j) => <li key={j}>• {e}</li>)}
                      </ul>
                      <pre className="max-h-32 overflow-auto rounded bg-muted/60 p-2 text-[10px]">
                        {JSON.stringify(action.rules, null, 2)}
                      </pre>
                      <Button
                        size="sm"
                        loading={saving}
                        onClick={async () => {
                          setSaving(true);
                          const result = await createSegmentAction({
                            name: action.name, description: 'Créé via l’assistant IA',
                            kind: 'DYNAMIC', rules: action.rules,
                          });
                          setSaving(false);
                          if (result.ok) {
                            toast.success(`Segment créé (${result.data.count} contacts)`);
                            onOpenChange(false);
                            router.push('/segments');
                          } else toast.error(result.error);
                        }}
                      >
                        Enregistrer ce segment
                      </Button>
                    </div>
                  );
                }
                if (action.kind === 'DRAFT_CAMPAIGN') {
                  return (
                    <Button key={i} size="sm" onClick={() => {
                      onOpenChange(false);
                      router.push(`/campaigns/new?name=${encodeURIComponent(action.name)}&product=${action.product}&objective=${action.objective}`);
                    }}>
                      Préparer la campagne (brouillon)
                    </Button>
                  );
                }
                if (action.kind === 'DRAFT_LANDING') {
                  return (
                    <Button key={i} size="sm" onClick={() => {
                      onOpenChange(false);
                      router.push(`/landing-pages?new=1&product=${action.product}`);
                    }}>
                      Créer la landing page
                    </Button>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
