'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Circle, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { completeOnboardingAction } from '@/server/actions/onboarding';
import { cn, formatNumber } from '@/lib/utils';

type State = {
  workspaceNamed: boolean; logoUploaded: boolean; productsConfigured: boolean;
  senderConnected: boolean; domainVerified: boolean; contactsImported: boolean;
  policyConfigured: boolean; campaignCreated: boolean; landingPublished: boolean;
};

export function OnboardingChecklist({
  state, counts,
}: {
  state: State;
  counts: { contacts: number; campaigns: number; pages: number };
}) {
  const router = useRouter();
  const [finishing, setFinishing] = React.useState(false);

  const steps = [
    {
      key: 'workspaceNamed', done: state.workspaceNamed,
      title: '1. Nommer votre société',
      body: 'Le nom apparaît dans vos emails et sur vos landing pages.',
      href: '/settings', cta: 'Ouvrir les paramètres',
    },
    {
      key: 'logoUploaded', done: state.logoUploaded,
      title: '2. Ajouter votre logo',
      body: 'Renseignez l’URL de votre logo : il sera affiché en en-tête de vos emails et de vos pages.',
      href: '/settings', cta: 'Ajouter le logo', optional: true,
    },
    {
      key: 'productsConfigured', done: state.productsConfigured,
      title: '3. Choisir vos produits d’assurance',
      body: 'Auto, moto, habitation, santé, prévoyance, RC Pro… Les produits actifs orientent les campagnes et le scoring.',
      href: '/settings', cta: 'Configurer les produits',
    },
    {
      key: 'senderConnected', done: state.senderConnected,
      title: '4. Connecter votre expéditeur',
      body: 'SMTP, Brevo, Mailgun, Amazon SES ou Postmark. Sans fournisseur réel, le mode DEMO permet déjà de tester tout le parcours — sans envoi réel.',
      href: '/email-accounts', cta: 'Connecter un compte',
    },
    {
      key: 'domainVerified', done: state.domainVerified,
      title: '5. Authentifier votre domaine',
      body: 'SPF et DKIM sont les deux enregistrements DNS qui prouvent que vous êtes bien l’expéditeur. Ils améliorent nettement vos chances d’acceptation.',
      href: '/deliverability', cta: 'Vérifier le domaine',
    },
    {
      key: 'contactsImported', done: state.contactsImported,
      title: '6. Importer votre base de contacts',
      body: counts.contacts > 0
        ? `${formatNumber(counts.contacts)} contact(s) déjà présents.`
        : 'CSV ou XLSX : les colonnes sont reconnues automatiquement et les doublons signalés avant import.',
      href: '/contacts/import', cta: 'Importer ma base',
    },
    {
      key: 'policyConfigured', done: state.policyConfigured,
      title: '7. Définir votre politique de contact',
      body: 'Qui peut être contacté, quels avertissements bloquent un lancement, quelle mention légale apparaît en pied d’email.',
      href: '/settings', cta: 'Configurer la conformité',
    },
    {
      key: 'landingPublished', done: state.landingPublished,
      title: '8. Publier une landing page',
      body: counts.pages > 0
        ? `${counts.pages} page(s) publiée(s).`
        : 'Partez d’un modèle par produit : hero, bénéfices, formulaire multi-étapes et mentions légales sont prêts.',
      href: '/landing-pages', cta: 'Créer une landing page',
    },
    {
      key: 'campaignCreated', done: state.campaignCreated,
      title: '9. Créer votre première campagne',
      body: counts.campaigns > 0
        ? `${counts.campaigns} campagne(s) créée(s).`
        : 'Objectif, produit, segment, email, landing page. Rien ne part tant que vous n’avez pas cliqué sur « Lancer ».',
      href: '/campaigns/new', cta: 'Créer une campagne',
    },
  ];

  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const progress = Math.round((doneCount / required.length) * 100);
  const allDone = doneCount === required.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Votre progression</CardTitle>
              <CardDescription>{doneCount} étape(s) sur {required.length} terminée(s)</CardDescription>
            </div>
            <Badge variant={allDone ? 'success' : 'default'}>{progress} %</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} indicatorClassName={allDone ? 'bg-success' : undefined} />
          {allDone ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/5 p-3">
              <PartyPopper className="h-5 w-5 shrink-0 text-success" />
              <p className="flex-1 text-xs text-success">
                Tout est en place. Vous pouvez lancer votre première campagne et suivre vos leads
                sur le tableau de bord.
              </p>
              <Button
                loading={finishing}
                onClick={async () => {
                  setFinishing(true);
                  const r = await completeOnboardingAction();
                  setFinishing(false);
                  if (r.ok) { toast.success('Configuration terminée'); router.push('/dashboard'); } else toast.error(r.error);
                }}
              >
                Accéder au tableau de bord <ArrowRight />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="sm"
              onClick={async () => {
                const r = await completeOnboardingAction();
                if (r.ok) router.push('/dashboard');
              }}
            >
              Passer cette étape et aller au tableau de bord
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {steps.map((step) => (
          <Card key={step.key} className={cn(step.done && 'border-success/40 bg-success/[0.03]')}>
            <CardContent className="flex flex-wrap items-start gap-3 p-4">
              <span className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                step.done ? 'border-success bg-success text-success-foreground' : 'text-muted-foreground',
              )}>
                {step.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {step.title}
                  {step.optional ? <Badge variant="muted">facultatif</Badge> : null}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
              <Button variant={step.done ? 'ghost' : 'outline'} size="sm" asChild>
                <Link href={step.href}>{step.done ? 'Revoir' : step.cta} <ArrowRight /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="font-semibold">Un mot sur la délivrabilité :</strong> authentifier votre domaine,
        nettoyer votre base et monter en volume progressivement améliore nettement vos chances d’être accepté
        par les messageries. Aucun outil ne peut cependant garantir l’arrivée en boîte de réception principale.
      </p>
    </div>
  );
}
