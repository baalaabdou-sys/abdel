import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, Send } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { insuranceLabel, leadStatusLabel, scoreBand, scoreBandLabel } from '@/lib/domain';
import { LeadActions } from '@/components/leads/lead-actions';
import { LeadTimeline } from '@/components/leads/lead-timeline';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('leads:read');
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, workspaceId: ctx.workspaceId },
    include: {
      owner: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      contact: { select: { id: true, email: true, consentEmail: true, source: true } },
      submission: { select: { answers: true, consentText: true, consentGiven: true, createdAt: true } },
      scores: { orderBy: { createdAt: 'desc' }, take: 1 },
      activities: { orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { name: true } } } },
      tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!lead) notFound();

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspaceId, role: { in: ['SALES', 'ADMIN', 'OWNER'] } },
    include: { user: { select: { id: true, name: true } } },
  });

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead';
  const band = scoreBand(lead.score);
  const breakdown = (lead.scores[0]?.breakdown as unknown as { factor: string; label: string; points: number; detail: string }[]) ?? [];
  const answers = (lead.answers as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/leads"><ArrowLeft /> Leads</Link>
      </Button>

      <PageHeader title={name} description={`${insuranceLabel(lead.product)} · reçu le ${lead.createdAt.toLocaleString('fr-FR')}`}>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={band.tone}>{band.emoji} {scoreBandLabel(lead.score)} — {lead.score}/100</Badge>
          <Badge variant="secondary">{leadStatusLabel(lead.status)}</Badge>
          {lead.owner ? <Badge variant="muted">Assigné à {lead.owner.name}</Badge> : <Badge variant="warning">Non assigné</Badge>}
          {lead.responseMinutes !== null ? (
            <Badge variant={lead.responseMinutes <= 10 ? 'success' : lead.responseMinutes <= 60 ? 'default' : 'warning'}>
              Première réponse : {lead.responseMinutes} min
            </Badge>
          ) : <Badge variant="destructive">Aucune action commerciale</Badge>}
          {lead.isDemo ? <Badge variant="warning">Donnée démo</Badge> : null}
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row icon={Phone} label="Téléphone" value={lead.phone ?? '—'} href={lead.phone ? `tel:${lead.phone}` : undefined} />
              <Row icon={Mail} label="Email" value={lead.email ?? '—'} href={lead.email ? `mailto:${lead.email}` : undefined} />
              <Row icon={MapPin} label="Localisation" value={[lead.postalCode, lead.city].filter(Boolean).join(' ') || '—'} />
              <Row icon={Building2} label="Assureur actuel" value={lead.currentInsurer ?? '—'} />
              <Row icon={Calendar} label="Échéance" value={lead.renewalDate?.toLocaleDateString('fr-FR') ?? '—'} />
              {lead.campaign ? (
                <Row icon={Send} label="Campagne source" value={lead.campaign.name} href={`/campaigns/${lead.campaign.id}`} />
              ) : null}
              {lead.contact ? (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  <Link href={`/contacts/${lead.contact.id}`} className="text-primary hover:underline">Voir la fiche contact</Link>
                  {lead.contact.source ? ` · Provenance : ${lead.contact.source}` : ''}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pourquoi ce score ?</CardTitle>
              <CardDescription>
                Score calculé à partir de critères explicites. Aucune caractéristique sensible n’est utilisée.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="num text-3xl font-bold">{lead.score}</span>
                <div className="flex-1">
                  <Progress value={lead.score} indicatorClassName={lead.score >= 80 ? 'bg-success' : lead.score >= 60 ? 'bg-primary' : 'bg-warning'} />
                  <p className="mt-1 text-[11px] text-muted-foreground">{scoreBandLabel(lead.score)}</p>
                </div>
              </div>
              {breakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Détail du score non disponible pour ce lead.</p>
              ) : (
                <ul className="space-y-1.5">
                  {breakdown.map((factor, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 border-b pb-1.5 text-xs last:border-0">
                      <span className="min-w-0">
                        <span className="block font-medium">{factor.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{factor.detail}</span>
                      </span>
                      <span className={`num shrink-0 font-semibold ${factor.points > 0 ? 'text-success' : 'text-destructive'}`}>
                        {factor.points > 0 ? '+' : ''}{factor.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Réponses au formulaire</CardTitle>
              <CardDescription>
                {lead.submission?.consentGiven ? 'Consentement recueilli lors de la soumission.' : 'Aucun consentement explicite enregistré.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(answers).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune réponse enregistrée.</p>
              ) : (
                <dl className="space-y-1.5 text-xs">
                  {Object.entries(answers).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-3 border-b pb-1.5 last:border-0">
                      <dt className="text-muted-foreground">{key.replace(/_/g, ' ')}</dt>
                      <dd className="text-right font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {lead.submission?.consentText ? (
                <p className="mt-3 rounded-md bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
                  Texte présenté au visiteur : « {lead.submission.consentText} »
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <LeadActions
            leadId={lead.id}
            status={lead.status}
            ownerId={lead.ownerId}
            appointmentAt={lead.appointmentAt?.toISOString() ?? null}
            value={lead.value}
            members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
            canWrite={can(ctx.role, 'leads:write')}
            canAssign={can(ctx.role, 'leads:assign')}
            canCreateTask={can(ctx.role, 'tasks:write')}
          />

          <Card>
            <CardHeader className="pb-3"><CardTitle>Tâches</CardTitle></CardHeader>
            <CardContent>
              {lead.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune tâche liée à ce lead.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {lead.tasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3 border-b pb-1.5 last:border-0">
                      <span className={task.status === 'DONE' ? 'line-through text-muted-foreground' : 'font-medium'}>{task.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Badge variant={task.priority === 'URGENT' ? 'destructive' : task.priority === 'HIGH' ? 'warning' : 'muted'}>{task.priority}</Badge>
                        {task.dueAt ? <span className="text-muted-foreground">{task.dueAt.toLocaleDateString('fr-FR')}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <LeadTimeline
            leadId={lead.id}
            activities={lead.activities.map((a) => ({
              id: a.id, type: a.type, title: a.title, body: a.body,
              userName: a.user?.name ?? null, createdAt: a.createdAt.toISOString(),
            }))}
            canWrite={can(ctx.role, 'leads:write')}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }) {
  const content = (
    <>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="block truncate">{value}</span>
      </span>
    </>
  );
  if (href) {
    return <Link href={href} className="flex items-start gap-2.5 hover:text-primary">{content}</Link>;
  }
  return <div className="flex items-start gap-2.5">{content}</div>;
}
