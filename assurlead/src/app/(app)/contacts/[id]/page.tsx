import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, Calendar, Download } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  verificationLabel, verificationTone, consentLabel, consentTone,
  insuranceLabel, contactStatusLabel, leadStatusLabel, recipientStatusLabel,
} from '@/lib/domain';
import { ContactExportButton } from '@/components/contacts/contact-export-button';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('contacts:read');
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspaceId },
    include: {
      sources: { orderBy: { recordedAt: 'desc' }, take: 20 },
      consents: { orderBy: { recordedAt: 'desc' }, take: 20 },
      verifications: { orderBy: { createdAt: 'desc' }, take: 5 },
      leads: { orderBy: { createdAt: 'desc' }, take: 10 },
      recipients: { orderBy: { createdAt: 'desc' }, take: 10, include: { campaign: { select: { name: true } } } },
      events: { orderBy: { occurredAt: 'desc' }, take: 30 },
    },
  });
  if (!contact) notFound();

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/contacts"><ArrowLeft /> Contacts</Link>
      </Button>

      <PageHeader
        title={name}
        description={contact.email}
        actions={
          <>
            {can(ctx.role, 'contacts:read') ? <ContactExportButton contactId={contact.id} /> : null}
            {can(ctx.role, 'contacts:write') ? (
              <Button size="sm" asChild><Link href={`/contacts/${contact.id}/edit`}>Modifier</Link></Button>
            ) : null}
          </>
        }
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={verificationTone[contact.verificationStatus]}>{verificationLabel(contact.verificationStatus)}</Badge>
          <Badge variant={consentTone[contact.consentEmail]}>Consentement email : {consentLabel(contact.consentEmail)}</Badge>
          <Badge variant="secondary">{contactStatusLabel(contact.status)}</Badge>
          {contact.suppressed ? <Badge variant="destructive">Liste de suppression</Badge> : null}
          {contact.unsubscribed ? <Badge variant="destructive">Désinscrit</Badge> : null}
          {contact.isDemo ? <Badge variant="warning">Donnée démo</Badge> : null}
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row icon={Mail} label="Email" value={contact.email} />
              <Row icon={Phone} label="Téléphone" value={contact.phone ?? '—'} />
              <Row icon={MapPin} label="Adresse" value={[contact.address, contact.postalCode, contact.city].filter(Boolean).join(', ') || '—'} />
              <Row icon={Briefcase} label="Profession" value={contact.profession ?? '—'} />
              <Row icon={Building2} label="Entreprise" value={contact.company ?? '—'} />
              <Row icon={Calendar} label="Âge" value={contact.age ? `${contact.age} ans` : '—'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Besoins assurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {contact.insuranceInterests.length === 0
                  ? <span className="text-xs text-muted-foreground">Aucun produit renseigné</span>
                  : contact.insuranceInterests.map((t) => <Badge key={t} variant="secondary">{insuranceLabel(t)}</Badge>)}
              </div>
              <Separator />
              <dl className="space-y-2 text-xs">
                <Field label="Assureur actuel" value={contact.currentInsurer ?? '—'} />
                <Field label="Date d’échéance" value={contact.renewalDate ? contact.renewalDate.toLocaleDateString('fr-FR') : '—'} />
                <Field label="Garanties demandées" value={contact.requestedCoverage ?? '—'} />
                <Field label="Budget" value={contact.budgetMin || contact.budgetMax ? `${contact.budgetMin ?? '?'} – ${contact.budgetMax ?? '?'} €` : '—'} />
              </dl>
              {contact.notes ? (
                <>
                  <Separator />
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{contact.notes}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Provenance et conformité</CardTitle>
              <CardDescription>Ces informations déterminent l’éligibilité aux campagnes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Field label="Source" value={contact.source ?? 'Non renseignée'} warn={!contact.source} />
              <Field label="Détail de la source" value={contact.sourceDetail ?? '—'} />
              <Field label="Date d’import" value={contact.importedAt?.toLocaleDateString('fr-FR') ?? '—'} />
              <Field label="Consentement email" value={consentLabel(contact.consentEmail)} warn={contact.consentEmail === 'UNKNOWN'} />
              <Field label="Consentement téléphone" value={consentLabel(contact.consentPhone)} />
              <Field label="Date de consentement" value={contact.consentDate?.toLocaleDateString('fr-FR') ?? '—'} />
              <Field label="Origine du consentement" value={contact.consentSource ?? '—'} />
              <Field label="Marketing email autorisé" value={contact.emailMarketingAllowed ? 'Oui' : 'Non'} />
              <Field label="Contact téléphonique autorisé" value={contact.phoneContactAllowed ? 'Oui' : 'Non'} />
              <Field label="Base légale / note interne" value={contact.legalBasisNote ?? '—'} />
              <Field label="Dernière mise à jour" value={contact.updatedAt.toLocaleString('fr-FR')} />
              <p className="rounded-md bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
                ASSURLEAD AI enregistre ces éléments pour vous aider à documenter vos envois. Il vous
                appartient de déterminer si vous êtes en droit de contacter chaque personne.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Historique de consentement</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.consents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun enregistrement de consentement.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {contact.consents.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                      <span>
                        <span className="font-medium">{c.channel === 'email' ? 'Email' : 'Téléphone'} — {consentLabel(c.state)}</span>
                        {c.source ? <span className="block text-muted-foreground">Source : {c.source}</span> : null}
                        {c.evidence ? <span className="block text-muted-foreground">{c.evidence.slice(0, 140)}</span> : null}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{c.recordedAt.toLocaleDateString('fr-FR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle>Campagnes reçues</CardTitle></CardHeader>
            <CardContent>
              {contact.recipients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ce contact n’a encore reçu aucune campagne.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {contact.recipients.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <span className="min-w-0 truncate font-medium">{r.campaign.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={r.status === 'SENT' ? 'success' : r.status === 'BOUNCED' ? 'destructive' : 'muted'}>
                          {recipientStatusLabel(r.status)}
                        </Badge>
                        <span className="text-muted-foreground">{r.sentAt?.toLocaleDateString('fr-FR') ?? '—'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle>Leads générés</CardTitle></CardHeader>
            <CardContent>
              {contact.leads.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun lead pour ce contact.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {contact.leads.map((lead) => (
                    <li key={lead.id}>
                      <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-accent">
                        <span className="font-medium">{insuranceLabel(lead.product)} · {leadStatusLabel(lead.status)}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant={lead.score >= 80 ? 'success' : lead.score >= 60 ? 'default' : 'muted'}>{lead.score}/100</Badge>
                          <span className="text-muted-foreground">{lead.createdAt.toLocaleDateString('fr-FR')}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Chronologie</CardTitle>
              <CardDescription>Événements enregistrés pour ce contact.</CardDescription>
            </CardHeader>
            <CardContent>
              {contact.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun événement.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {contact.events.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3">
                      <span className="font-medium">{EVENT_LABELS[e.type] ?? e.type}</span>
                      <span className="text-muted-foreground">{e.occurredAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  QUEUED: 'Mis en file', SENT: 'Email envoyé', DELIVERED: 'Email délivré',
  BOUNCED: 'Rebond définitif', SOFT_BOUNCED: 'Rebond temporaire', OPENED: 'Email ouvert',
  CLICKED: 'Clic sur le CTA', COMPLAINT: 'Plainte', UNSUBSCRIBED: 'Désinscription',
  REPLIED: 'Réponse reçue', LANDING_VIEW: 'Visite landing page', FORM_START: 'Formulaire commencé',
  FORM_STEP: 'Étape de formulaire', FORM_SUBMIT: 'Formulaire soumis', FAILED: 'Échec d’envoi',
};

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={warn ? 'text-right font-medium text-warning' : 'text-right font-medium'}>{value}</dd>
    </div>
  );
}
