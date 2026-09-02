'use client';
import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, TrendingDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { FunnelChart } from '@/components/dashboard/funnel-chart';
import { ActivityChart, type SeriesPoint } from '@/components/dashboard/activity-chart';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import { StatCard } from '@/components/ui/stat-card';
import { analyseCampaignAction } from '@/server/actions/ai';
import type { Funnel, Forecast } from '@/server/services/analytics';
import type { AnalysisResult } from '@/server/ai/analyst';
import { insuranceLabel } from '@/lib/domain';
import { formatNumber } from '@/lib/utils';
import type { InsuranceType } from '@prisma/client';

type Comparison = {
  id: string; name: string; product: InsuranceType; status: string;
  sent: number; clicks: number; visits: number; submits: number;
  leads: number; qualified: number; appointments: number; sales: number;
  clickRate: number; landingConversionRate: number; qualifiedRate: number;
};

export function AnalyticsView({
  funnel, series, comparison, speed, forecast, campaigns, selectedCampaign, days, canUseAi,
}: {
  funnel: Funnel;
  series: SeriesPoint[];
  comparison: Comparison[];
  speed: { averageMinutes: number | null; median: number | null; sample: number; pendingUncontacted: number };
  forecast: Forecast;
  campaigns: { id: string; name: string }[];
  selectedCampaign: string | null;
  days: number;
  canUseAi: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
  const [question, setQuestion] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === 'all') next.delete(key); else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const analyse = async () => {
    setLoading(true);
    const result = await analyseCampaignAction(selectedCampaign ?? undefined, question || undefined);
    setLoading(false);
    if (result.ok) setAnalysis(result.data);
    else toast.error(result.error);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedCampaign ?? 'all'} onValueChange={(v) => setParam('campaign', v)}>
          <SelectTrigger className="h-8 w-64 text-xs"><SelectValue placeholder="Toutes les campagnes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les campagnes</SelectItem>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setParam('days', v)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emails envoyés" value={funnel.counts.sent} hint={`Taux de délivrabilité ${funnel.rates.deliveryRate} %`} />
        <StatCard label="Clics uniques" value={funnel.counts.uniqueClicks} hint={`Taux de clic ${funnel.rates.clickRate} %`} />
        <StatCard label="Formulaires soumis" value={funnel.counts.formSubmits} hint={`Conversion LP ${funnel.rates.landingConversionRate} %`} />
        <StatCard label="Leads qualifiés" value={funnel.counts.qualifiedLeads} tone="success" hint={`${funnel.rates.qualifiedRate} % des leads`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Activité</CardTitle>
            <CardDescription>Sur {days} jours, à partir des événements enregistrés.</CardDescription>
          </CardHeader>
          <CardContent><ActivityChart data={series} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Entonnoir</CardTitle>
            <CardDescription>Le pourcentage indique la conversion depuis l’étape précédente.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart steps={[
              { label: 'Destinataires', value: funnel.counts.recipients },
              { label: 'Envoyés', value: funnel.counts.sent },
              { label: 'Délivrés', value: funnel.counts.delivered },
              { label: 'Rebonds', value: funnel.counts.bounced },
              { label: 'Clics uniques', value: funnel.counts.uniqueClicks },
              { label: 'Sessions landing page', value: funnel.counts.landingViews },
              { label: 'Formulaires commencés', value: funnel.counts.formStarts },
              { label: 'Formulaires complétés', value: funnel.counts.formSubmits },
              { label: 'Leads qualifiés', value: funnel.counts.qualifiedLeads },
              { label: 'Rendez-vous', value: funnel.counts.appointments },
              { label: 'Ventes', value: funnel.counts.sales },
            ]} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ForecastCard forecast={forecast} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Speed-to-lead</CardTitle>
            <CardDescription>Délai moyen avant la première action commerciale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="num text-3xl font-bold">{speed.averageMinutes === null ? '—' : `${speed.averageMinutes} min`}</p>
            <p className="text-xs text-muted-foreground">
              {speed.sample > 0 ? `Moyenne sur ${speed.sample} lead(s) · médiane ${speed.median} min` : 'Pas encore de données.'}
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">En attente de contact : </span>
              <span className={speed.pendingUncontacted > 0 ? 'font-semibold text-warning' : 'font-semibold text-success'}>
                {speed.pendingUncontacted}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle>Taux mesurés</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-xs">
              {[
                ['Délivrabilité', `${funnel.rates.deliveryRate} %`],
                ['Rebonds', `${funnel.rates.bounceRate} %`],
                ['Clic', `${funnel.rates.clickRate} %`],
                ['Conversion landing page', `${funnel.rates.landingConversionRate} %`],
                ['Complétion formulaire', `${funnel.rates.formCompletionRate} %`],
                ['Leads qualifiés', `${funnel.rates.qualifiedRate} %`],
                ['Rendez-vous', `${funnel.rates.appointmentRate} %`],
                ['Ventes', `${funnel.rates.salesRate} %`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-1 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="num font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Le taux d’ouverture n’est pas affiché ici : il est désactivé par défaut et peu fiable.
              Nous privilégions les clics, les formulaires et les leads.
            </p>
          </CardContent>
        </Card>
      </div>

      {canUseAi ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Analyser avec l’IA</CardTitle>
            <CardDescription>
              L’analyse porte uniquement sur les métriques réelles de votre base. Aucun chiffre n’est inventé.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex : pourquoi cette campagne génère-t-elle moins de leads ?"
                className="flex-1"
              />
              <Button onClick={analyse} loading={loading} className="sm:self-end">Analyser</Button>
            </div>

            {analysis ? (
              <div className="space-y-3 rounded-lg border p-4">
                {analysis.simulated ? (
                  <Badge variant="warning">Fournisseur IA DEMO — analyse produite localement à partir de vos métriques réelles</Badge>
                ) : null}
                <p className="flex items-start gap-2 text-sm font-medium">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  {analysis.summary}
                </p>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Constats</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {analysis.findings.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recommandations</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {analysis.recommendations.map((r, i) => <li key={i}>→ {r}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Comparaison des campagnes</CardTitle>
          <CardDescription>Classées par leads qualifiés générés — la métrique qui compte.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {comparison.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">Aucune campagne lancée sur la période.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Envoyés</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Visites</TableHead>
                  <TableHead className="text-right">Formulaires</TableHead>
                  <TableHead className="text-right">Qualifiés</TableHead>
                  <TableHead className="text-right">RDV</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Conv. LP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...comparison].sort((a, b) => b.qualified - a.qualified).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/campaigns/${c.id}`} className="block min-w-0">
                        <span className="block truncate font-medium hover:underline">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{insuranceLabel(c.product)}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="num text-right">{formatNumber(c.sent)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(c.clicks)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(c.visits)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(c.submits)}</TableCell>
                    <TableCell className="num text-right font-semibold">{formatNumber(c.qualified)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(c.appointments)}</TableCell>
                    <TableCell className="num text-right">{formatNumber(c.sales)}</TableCell>
                    <TableCell className="num text-right">{c.landingConversionRate} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
