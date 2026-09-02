import Link from 'next/link';
import { ShieldCheck, Target, Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Target className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">ASSURLEAD AI</span>
          </Link>
          {children}
        </div>
      </div>
      <div className="relative hidden bg-muted/40 lg:flex lg:flex-col lg:justify-center lg:px-16 border-l">
        <div className="max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Transformez votre base de contacts en leads assurance qualifiés.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Import et nettoyage de base, segmentation, campagnes email, landing pages,
              formulaires multi-étapes, qualification des leads et CRM — dans un seul outil.
            </p>
          </div>
          <ul className="space-y-4 text-sm">
            {[
              { icon: Target, title: 'Objectif quotidien piloté', body: '10 à 20 leads qualifiés par jour, avec estimation du volume nécessaire.' },
              { icon: Zap, title: 'Speed-to-lead mesuré', body: 'Notification immédiate et suivi du temps de première réponse commerciale.' },
              { icon: ShieldCheck, title: 'Conformité paramétrable', body: 'Consentement, provenance, suppression et journal d’audit intégrés.' },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="rounded-lg border bg-background/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            ASSURLEAD AI aide à surveiller et améliorer la délivrabilité. Aucun outil ne peut garantir
            le placement en boîte de réception principale, et la conformité juridique des envois reste
            sous la responsabilité de l’annonceur.
          </p>
        </div>
      </div>
    </div>
  );
}
