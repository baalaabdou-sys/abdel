import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { getFunnel } from '@/server/services/analytics';
import { dnsInstructions } from '@/server/services/deliverability';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliverabilityView } from '@/components/deliverability/deliverability-view';
import { appUrl } from '@/lib/config';
import { daysAgo, pct } from '@/lib/utils';

export const metadata = { title: 'Délivrabilité' };
export const dynamic = 'force-dynamic';

export default async function DeliverabilityPage() {
  const ctx = await requireWorkspace('deliverability:read');
  const ws = ctx.workspaceId;

  const [domains, accounts, contactStats, funnel30, funnelPrev, complaints] = await Promise.all([
    prisma.sendingDomain.findMany({ where: { workspaceId: ws }, orderBy: { domain: 'asc' }, include: { accounts: { select: { id: true, label: true } } } }),
    prisma.emailAccount.findMany({ where: { workspaceId: ws }, select: { id: true, label: true, provider: true, status: true, sentTotal: true, bounceCount: true } }),
    Promise.all([
      prisma.contact.count({ where: { workspaceId: ws } }),
      prisma.contact.count({ where: { workspaceId: ws, verificationStatus: { in: ['VALID', 'LIKELY_VALID'] } } }),
      prisma.contact.count({ where: { workspaceId: ws, verificationStatus: 'INVALID' } }),
      prisma.contact.count({ where: { workspaceId: ws, verificationStatus: 'UNVERIFIED' } }),
    ]),
    getFunnel({ workspaceId: ws, from: daysAgo(29) }),
    getFunnel({ workspaceId: ws, from: daysAgo(59), to: daysAgo(30) }),
    prisma.campaignEvent.count({ where: { workspaceId: ws, type: 'COMPLAINT', occurredAt: { gte: daysAgo(29) } } }),
  ]);

  const [totalContacts, verifiedOk, invalid, unverified] = contactStats;

  const warnings: { level: 'warning' | 'destructive'; title: string; body: string }[] = [];
  if (funnel30.rates.bounceRate > 3) {
    warnings.push({
      level: funnel30.rates.bounceRate > 5 ? 'destructive' : 'warning',
      title: 'Taux de rebond élevé',
      body: `${funnel30.rates.bounceRate} % sur 30 jours. Au-delà de 3 %, la réputation d’envoi se dégrade rapidement. Vérifiez vos adresses avant l’envoi.`,
    });
  }
  if (totalContacts > 0 && pct(unverified, totalContacts) > 30) {
    warnings.push({
      level: 'warning',
      title: 'Beaucoup d’adresses non vérifiées',
      body: `${pct(unverified, totalContacts)} % de votre base n’a jamais été vérifiée. Lancez une vérification avant vos prochaines campagnes.`,
    });
  }
  if (funnelPrev.counts.sent > 0 && funnel30.counts.sent > funnelPrev.counts.sent * 2.5) {
    warnings.push({
      level: 'warning',
      title: 'Augmentation rapide du volume d’envoi',
      body: `Le volume a plus que doublé par rapport aux 30 jours précédents (${funnelPrev.counts.sent} → ${funnel30.counts.sent}). Une montée en charge progressive protège votre réputation.`,
    });
  }
  const incompleteDomains = domains.filter((d) => d.spf !== 'CONFIGURED' || d.dkim !== 'CONFIGURED' || d.dmarc === 'MISSING');
  if (incompleteDomains.length > 0) {
    warnings.push({
      level: 'warning',
      title: 'Authentification de domaine incomplète',
      body: `${incompleteDomains.map((d) => d.domain).join(', ')} : SPF, DKIM ou DMARC n’est pas correctement configuré.`,
    });
  }
  if (complaints > 0) {
    warnings.push({
      level: 'destructive',
      title: 'Plaintes reçues',
      body: `${complaints} signalement(s) « courrier indésirable » sur 30 jours. Ces adresses ont été ajoutées à la liste de suppression.`,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Délivrabilité"
        description="Surveiller et améliorer vos chances d’acceptation par les fournisseurs de messagerie."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Adresses vérifiées valides" value={`${pct(verifiedOk, Math.max(1, totalContacts))} %`} tone="success" hint={`${verifiedOk} contacts`} />
        <StatCard label="Adresses invalides" value={`${pct(invalid, Math.max(1, totalContacts))} %`} tone={invalid > 0 ? 'destructive' : 'default'} hint={`${invalid} contacts, exclus des envois`} />
        <StatCard label="Taux de rebond (30 j)" value={`${funnel30.rates.bounceRate} %`} tone={funnel30.rates.bounceRate > 3 ? 'destructive' : 'success'} />
        <StatCard label="Plaintes (30 j)" value={complaints} tone={complaints > 0 ? 'warning' : 'default'} hint="Signalements « spam » remontés par le fournisseur" />
        <StatCard label="Volume envoyé (30 j)" value={funnel30.counts.sent} hint={`Période précédente : ${funnelPrev.counts.sent}`} />
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className={`flex gap-2.5 rounded-lg border p-3 ${w.level === 'destructive' ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}>
              <TriangleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${w.level === 'destructive' ? 'text-destructive' : 'text-warning'}`} />
              <div>
                <p className={`text-xs font-semibold ${w.level === 'destructive' ? 'text-destructive' : 'text-warning'}`}>{w.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{w.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2.5 rounded-lg border border-success/40 bg-success/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div>
            <p className="text-xs font-semibold text-success">Aucun signal d’alerte détecté</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Continuez à vérifier vos adresses, à surveiller les rebonds et à augmenter progressivement vos volumes.
            </p>
          </div>
        </div>
      )}

      <DeliverabilityView
        domains={domains.map((d) => ({
          id: d.id, domain: d.domain, spf: d.spf, dkim: d.dkim, dmarc: d.dmarc, trackingCname: d.trackingCname,
          spfRecord: d.spfRecord, dmarcRecord: d.dmarcRecord, dkimRecord: d.dkimRecord,
          lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
          notes: d.notes, accounts: d.accounts,
          instructions: dnsInstructions(d.domain),
        }))}
        accounts={accounts}
        webhookBaseUrl={`${appUrl()}/api/webhooks`}
        workspaceId={ws}
        canWrite={can(ctx.role, 'email_accounts:write')}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Ce que fait — et ne fait pas — ASSURLEAD AI</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-semibold text-success">Ce que l’outil fait</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Vérifie l’état SPF, DKIM et DMARC de vos domaines d’envoi.</li>
              <li>• Exclut automatiquement les adresses invalides et supprimées.</li>
              <li>• Limite et lisse le volume d’envoi, avec montée en charge progressive.</li>
              <li>• Surveille rebonds, plaintes et désinscriptions, et agit dessus.</li>
              <li>• Ajoute un lien de désinscription et l’en-tête List-Unsubscribe à chaque envoi.</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-destructive">Ce que l’outil ne fait pas</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Aucune garantie de placement en boîte de réception principale : c’est impossible.</li>
              <li>• Aucun contournement des filtres anti-spam.</li>
              <li>• Aucun réseau de faux échanges destiné à manipuler les filtres.</li>
              <li>• Aucune évaluation de la légalité de vos envois : cela reste votre responsabilité.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
