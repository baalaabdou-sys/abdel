import Link from 'next/link';
import {
  Users, ShieldCheck, ShieldAlert, Ban, Send, CalendarClock, PauseCircle,
  MailCheck, MousePointerClick, FileText, Flame, CalendarCheck, Trophy, Clock, ArrowRight,
} from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { getDailyGoalStatus, getFunnel, forecastForTarget, getSpeedToLead, getDailySeries } from '@/server/services/analytics';
import { startOfDay, formatNumber } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalCard } from '@/components/dashboard/goal-card';
import { FunnelChart } from '@/components/dashboard/funnel-chart';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { EmptyState } from '@/components/ui/empty-state';
import { QUALIFIED_SCORE_THRESHOLD } from '@/lib/domain';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const ctx = await requireWorkspace('analytics:read');
  const ws = ctx.workspaceId;
  const today = startOfDay();

  const [
    contactStats, campaignStats, goal, todayFunnel, allTimeFunnel, forecast, speed, series,
    todayLeads, appointments, opportunities, recentLeads,
  ] = await Promise.all([
    Promise.all([
      prisma.contact.count({ where: { workspaceId: ws } }),
      prisma.contact.count({ where: { workspaceId: ws, verificationStatus: { in: ['VALID', 'LIKELY_VALID'] } } }),
      prisma.contact.count({ where: { workspaceId: ws, NOT: { verifiedAt: null } } }),
      prisma.contact.count({ where: { workspaceId: ws, verificationStatus: 'INVALID' } }),
      prisma.contact.count({ where: { workspaceId: ws, suppressed: true } }),
    ]),
    Promise.all([
      prisma.campaign.count({ where: { workspaceId: ws, status: 'SENDING' } }),
      prisma.campaign.count({ where: { workspaceId: ws, status: 'SCHEDULED' } }),
      prisma.campaign.count({ where: { workspaceId: ws, status: 'PAUSED' } }),
    ]),
    getDailyGoalStatus(ws),
    getFunnel({ workspaceId: ws, from: today }),
    getFunnel({ workspaceId: ws }),
    forecastForTarget(ws, 15),
    getSpeedToLead(ws),
    getDailySeries(ws, 30),
    prisma.lead.count({ where: { workspaceId: ws, createdAt: { gte: today } } }),
    prisma.lead.count({ where: { workspaceId: ws, appointmentAt: { gte: today } } }),
    prisma.lead.count({ where: { workspaceId: ws, status: { in: ['DEVIS_ENVOYE', 'RENDEZ_VOUS', 'TRES_INTERESSE'] } } }),
    prisma.lead.findMany({
      where: { workspaceId: ws },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, firstName: true, lastName: true, email: true, city: true, product: true, score: true, status: true, createdAt: true },
    }),
  ]);

  const [totalContacts, validContacts, verifiedContacts, invalidContacts, suppressedContacts] = contactStats;
  const [activeCampaigns, scheduledCampaigns, pausedCampaigns] = campaignStats;

  const funnelSteps = [
    { label: 'Emails envoyés', value: allTimeFunnel.counts.sent },
    { label: 'Délivrés', value: allTimeFunnel.counts.delivered, hint: allTimeFunnel.counts.delivered === Math.max(0, allTimeFunnel.counts.sent - allTimeFunnel.counts.bounced) && !allTimeFunnel.counts.bounced ? 'Estimé (envoyés − rebonds) : votre fournisseur n’envoie pas d’événement de délivrance.' : undefined },
    { label: 'Clics uniques', value: allTimeFunnel.counts.uniqueClicks },
    { label: 'Visiteurs landing page', value: allTimeFunnel.counts.landingViews },
    { label: 'Formulaires commencés', value: allTimeFunnel.counts.formStarts },
    { label: 'Leads', value: allTimeFunnel.counts.leads },
    { label: 'Leads qualifiés', value: allTimeFunnel.counts.qualifiedLeads, hint: `Score ≥ ${QUALIFIED_SCORE_THRESHOLD}/100` },
    { label: 'Contactés', value: allTimeFunnel.counts.contacted },
    { label: 'Rendez-vous', value: allTimeFunnel.counts.appointments },
    { label: 'Ventes', value: allTimeFunnel.counts.sales },
  ];

  const hasActivity = allTimeFunnel.counts.sent > 0 || allTimeFunnel.counts.leads > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de votre acquisition de leads assurance."
        actions={
          <>
            <Button variant="outline" asChild size="sm">
              <Link href="/contacts/import">Importer une base</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/campaigns/new">Nouvelle campagne</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <GoalCard goal={goal} />
        <ForecastCard forecast={forecast} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Speed-to-lead
            </CardTitle>
            <CardDescription>Délai entre la soumission du formulaire et la première action commerciale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="num text-3xl font-bold tracking-tight">
                {speed.averageMinutes === null ? '—' : `${speed.averageMinutes}`}
                {speed.averageMinutes !== null ? <span className="ml-1 text-sm font-medium text-muted-foreground">min</span> : null}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {speed.sample > 0 ? `Moyenne du jour sur ${speed.sample} lead(s) · médiane ${speed.median} min` : 'Aucun lead traité aujourd’hui.'}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Leads en attente de contact</p>
              <p className="num mt-0.5 flex items-center gap-2 text-lg font-semibold">
                {speed.pendingUncontacted}
                {speed.pendingUncontacted > 0 ? <Badge variant="warning">à traiter</Badge> : <Badge variant="success">à jour</Badge>}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/leads?filter=uncontacted">Voir les leads non contactés <ArrowRight /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base de contacts</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total base" value={totalContacts} icon={Users} />
          <StatCard label="Contacts valides" value={validContacts} icon={ShieldCheck} tone="success" hint="Statut VALID ou probablement valide" />
          <StatCard label="Vérifiés" value={verifiedContacts} icon={MailCheck} hint="Passés par un fournisseur de vérification" />
          <StatCard label="Invalides" value={invalidContacts} icon={ShieldAlert} tone="destructive" hint="Jamais inclus dans un envoi" />
          <StatCard label="Supprimés" value={suppressedContacts} icon={Ban} tone="warning" hint="Liste de suppression" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campagnes</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Campagnes actives" value={activeCampaigns} icon={Send} tone="success" />
          <StatCard label="Programmées" value={scheduledCampaigns} icon={CalendarClock} />
          <StatCard label="En pause" value={pausedCampaigns} icon={PauseCircle} tone="warning" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aujourd’hui</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <StatCard label="Emails envoyés" value={todayFunnel.counts.sent} icon={Send} />
          <StatCard label="Délivrés" value={todayFunnel.counts.delivered} icon={MailCheck} />
          <StatCard label="Rebonds" value={todayFunnel.counts.bounced} icon={ShieldAlert} tone={todayFunnel.counts.bounced > 0 ? 'warning' : 'default'} />
          <StatCard label="Clics" value={todayFunnel.counts.clicks} icon={MousePointerClick} />
          <StatCard label="Visiteurs LP" value={todayFunnel.counts.landingViews} icon={Users} />
          <StatCard label="Formulaires commencés" value={todayFunnel.counts.formStarts} icon={FileText} />
          <StatCard label="Formulaires soumis" value={todayFunnel.counts.formSubmits} icon={FileText} />
          <StatCard label="Leads" value={todayLeads} icon={Flame} />
          <StatCard label="Leads qualifiés" value={goal.achieved} icon={Flame} tone="success" />
          <StatCard label="Rendez-vous" value={appointments} icon={CalendarCheck} />
          <StatCard label="Opportunités" value={opportunities} icon={Trophy} tone="primary" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Activité sur 30 jours</CardTitle>
            <CardDescription>Chiffres issus des événements réellement enregistrés.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasActivity ? (
              <ActivityChart data={series.series} />
            ) : (
              <EmptyState
                icon={Send}
                title="Aucune activité pour le moment"
                description="Importez votre base, créez un segment puis lancez votre première campagne pour alimenter ce graphique."
                action={<Button size="sm" asChild><Link href="/contacts/import">Importer ma base</Link></Button>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Entonnoir de conversion</CardTitle>
            <CardDescription>Depuis le début, toutes campagnes confondues.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart steps={funnelSteps} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Derniers leads</CardTitle>
            <CardDescription>Les demandes les plus récentes.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/leads">Tout voir <ArrowRight /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <EmptyState icon={Flame} title="Aucun lead pour l’instant" description="Les leads apparaîtront ici dès qu’un formulaire sera soumis." />
          ) : (
            <ul className="divide-y">
              {recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-accent/40">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                      {lead.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead'}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.product} · {lead.city ?? '—'} · {new Date(lead.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </span>
                    <Badge variant={lead.score >= 80 ? 'success' : lead.score >= 60 ? 'default' : 'muted'}>
                      {lead.score >= 80 ? '🔥 Très qualifié' : lead.score >= 60 ? 'Bon lead' : 'À vérifier'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Tous les chiffres de cette page proviennent des événements enregistrés en base
        (envois, clics, visites, formulaires, leads). Les projections sont explicitement identifiées
        comme des estimations. ASSURLEAD AI aide à surveiller et améliorer la délivrabilité, mais aucun
        outil ne peut garantir le placement en boîte de réception principale.
      </p>
    </div>
  );
}
