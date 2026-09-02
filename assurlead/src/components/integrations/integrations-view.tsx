'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plug, PlugZap, Unplug, CircleCheck, CircleX, Sparkles, ShieldCheck, Mail, Route } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { disconnectIntegrationAction, saveIntegrationAction, testIntegrationAction } from '@/server/actions/integrations';

type CatalogEntry = {
  kind: string; provider: string; label: string; description: string;
  fields: { key: string; label: string; type: 'password' | 'text'; placeholder?: string }[];
};

type Integration = {
  kind: string; provider: string; status: string; statusMessage: string | null;
  lastSyncAt: string | null; config: Record<string, unknown>;
};

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; help: string }> = {
  AI: { label: 'Intelligence artificielle', icon: Sparkles, help: 'Sans clé, le fournisseur DEMO est utilisé : les réponses sont générées localement par des règles et clairement identifiées comme telles.' },
  VERIFICATION: { label: 'Vérification d’adresses', icon: ShieldCheck, help: 'Sans clé, une vérification locale (syntaxe, domaines jetables, enregistrements MX) est utilisée. Elle ne teste pas l’existence réelle de la boîte.' },
  EMAIL: { label: 'Webhooks des fournisseurs d’envoi', icon: Mail, help: 'Nécessaires pour recevoir délivrances, rebonds et plaintes. En production, un événement non signé est refusé.' },
  CRM: { label: 'Routage et CRM', icon: Route, help: 'Table d’affectation utilisée par les stratégies d’assignation par produit ou par région.' },
};

const USAGE_LABELS: Record<string, string> = {
  EMAIL_SEND: 'Emails envoyés', VERIFICATION: 'Vérifications', AI_REQUEST: 'Requêtes IA',
  AI_TOKENS: 'Jetons IA', SMS: 'SMS', STORAGE: 'Stockage',
};

export function IntegrationsView({
  catalog, integrations, activeProviders, usage, canWrite,
}: {
  catalog: CatalogEntry[];
  integrations: Integration[];
  activeProviders: { ai: { name: string; model: string; simulated: boolean }; verification: { name: string; simulated: boolean } };
  usage: { kind: string; quantity: number }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  const grouped = catalog.reduce<Record<string, CatalogEntry[]>>((acc, entry) => {
    (acc[entry.kind] ??= []).push(entry);
    return acc;
  }, {});

  const keyOf = (e: CatalogEntry) => `${e.kind}:${e.provider}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fournisseur IA actif"
          value={activeProviders.ai.simulated ? 'DEMO' : activeProviders.ai.name}
          tone={activeProviders.ai.simulated ? 'warning' : 'success'}
          hint={activeProviders.ai.simulated ? 'Réponses générées localement' : activeProviders.ai.model}
        />
        <StatCard
          label="Vérification active"
          value={activeProviders.verification.simulated ? 'DEMO' : activeProviders.verification.name}
          tone={activeProviders.verification.simulated ? 'warning' : 'success'}
        />
        {usage.slice(0, 2).map((u) => (
          <StatCard key={u.kind} label={`${USAGE_LABELS[u.kind] ?? u.kind} ce mois`} value={u.quantity} />
        ))}
      </div>

      {usage.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Consommation du mois</CardTitle>
            <CardDescription>Suivi des appels externes, pour anticiper les coûts et éviter les dérives.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 sm:grid-cols-3">
              {usage.map((u) => (
                <div key={u.kind} className="rounded-lg border p-2.5">
                  <dt className="text-[11px] text-muted-foreground">{USAGE_LABELS[u.kind] ?? u.kind}</dt>
                  <dd className="num text-lg font-semibold">{u.quantity.toLocaleString('fr-FR')}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {Object.entries(grouped).map(([kind, entries]) => {
        const meta = KIND_META[kind];
        const Icon = meta?.icon ?? Plug;
        return (
          <section key={kind} className="space-y-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-muted-foreground" /> {meta?.label ?? kind}
              </h2>
              {meta?.help ? <p className="mt-0.5 text-xs text-muted-foreground">{meta.help}</p> : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {entries.map((entry) => {
                const key = keyOf(entry);
                const current = integrations.find((i) => i.kind === entry.kind && i.provider === entry.provider);
                const connected = current?.status === 'CONNECTED';
                const draft = drafts[key] ?? {};

                return (
                  <Card key={key}>
                    <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-1.5">
                          {entry.label}
                          <Badge variant={connected ? 'success' : current?.status === 'ERROR' ? 'destructive' : 'muted'}>
                            {connected ? <CircleCheck className="h-2.5 w-2.5" /> : current?.status === 'ERROR' ? <CircleX className="h-2.5 w-2.5" /> : null}
                            {connected ? 'Connecté' : current?.status === 'ERROR' ? 'Erreur' : 'Non connecté'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{entry.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entry.fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <Label>{field.label}</Label>
                          <Input
                            type={field.type === 'password' ? 'password' : 'text'}
                            placeholder={field.placeholder ?? (current?.config[field.key] ? '••••••••' : '')}
                            disabled={!canWrite}
                            value={draft[field.key] ?? ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...d[key], [field.key]: e.target.value } }))}
                          />
                        </div>
                      ))}

                      {current?.statusMessage ? (
                        <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">{current.statusMessage}</p>
                      ) : null}
                      {current?.lastSyncAt ? (
                        <p className="text-[10px] text-muted-foreground">
                          Dernier test : {new Date(current.lastSyncAt).toLocaleString('fr-FR')}
                        </p>
                      ) : null}

                      {canWrite ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm" loading={busy === `save-${key}`}
                            onClick={async () => {
                              setBusy(`save-${key}`);
                              const r = await saveIntegrationAction(entry.kind, entry.provider, draft);
                              setBusy(null);
                              if (r.ok) {
                                toast.success('Intégration enregistrée');
                                setDrafts((d) => ({ ...d, [key]: {} }));
                                router.refresh();
                              } else toast.error(r.error);
                            }}
                          >
                            Enregistrer
                          </Button>
                          {['AI', 'VERIFICATION'].includes(entry.kind) ? (
                            <Button
                              size="sm" variant="outline" loading={busy === `test-${key}`}
                              onClick={async () => {
                                setBusy(`test-${key}`);
                                const r = await testIntegrationAction(entry.kind, entry.provider);
                                setBusy(null);
                                if (r.ok) {
                                  toast[r.data.ok ? 'success' : 'warning'](r.data.message);
                                  router.refresh();
                                } else toast.error(r.error);
                              }}
                            >
                              <PlugZap /> Tester
                            </Button>
                          ) : null}
                          {current ? (
                            <Button
                              size="sm" variant="ghost"
                              onClick={async () => {
                                const r = await disconnectIntegrationAction(entry.kind, entry.provider);
                                if (r.ok) { toast.success('Intégration déconnectée'); router.refresh(); } else toast.error(r.error);
                              }}
                            >
                              <Unplug /> Déconnecter
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Les clés saisies ici sont chiffrées (AES-256-GCM) avec la clé <code className="rounded bg-muted px-1">ENCRYPTION_KEY</code>{' '}
        du serveur et ne transitent jamais vers le navigateur. Elles peuvent aussi être fournies par
        variables d’environnement — voir le README.
      </p>
    </div>
  );
}
