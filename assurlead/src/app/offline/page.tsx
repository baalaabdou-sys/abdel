export const metadata = { title: 'Hors ligne' };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-lg font-semibold">Vous êtes hors ligne</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Les pages déjà consultées restent accessibles en lecture. La connexion est nécessaire pour
        importer des contacts, modifier des données ou lancer une campagne.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Aucun envoi d’email n’est effectué hors ligne.
      </p>
    </main>
  );
}
