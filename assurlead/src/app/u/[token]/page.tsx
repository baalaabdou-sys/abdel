import { prisma } from '@/lib/db';
import { UnsubscribeForm } from './unsubscribe-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Désinscription', robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { trackingToken: params.token },
    include: { contact: { select: { email: true, suppressed: true, unsubscribed: true } }, campaign: { select: { workspaceId: true, name: true } } },
  });

  if (!recipient) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-lg font-semibold">Lien invalide</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce lien de désinscription n’est plus valide. Contactez l’expéditeur si vous souhaitez ne plus recevoir de messages.
        </p>
      </main>
    );
  }

  const already = recipient.contact.unsubscribed || recipient.contact.suppressed;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Se désinscrire</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {already
            ? `L'adresse ${recipient.contact.email} ne recevra plus d'emails marketing de notre part.`
            : `Confirmez la désinscription de l'adresse ${recipient.contact.email}.`}
        </p>
        {already ? null : <UnsubscribeForm token={params.token} />}
      </div>
    </main>
  );
}
