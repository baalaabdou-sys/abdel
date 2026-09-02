export const metadata = { title: 'Lien invalide', robots: { index: false, follow: false } };

export default function InvalidLinkPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-lg font-semibold">Ce lien n’est plus valide</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La page demandée n’existe plus ou la campagne associée a été retirée.
      </p>
    </main>
  );
}
