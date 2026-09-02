import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ImportWizard } from '@/components/contacts/import-wizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Importer des contacts' };
export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const ctx = await requireWorkspace('contacts:import');
  const recent = await prisma.importBatch.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/contacts"><ArrowLeft /> Contacts</Link>
      </Button>

      <PageHeader
        title="Importer votre base de contacts"
        description="CSV ou XLSX. Les colonnes sont détectées automatiquement, les doublons repérés, et la provenance de chaque contact enregistrée."
      />

      <ImportWizard />

      {recent.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Imports récents</CardTitle>
            <CardDescription>Historique des fichiers traités.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {recent.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{b.filename}</span>
                    <span className="block text-muted-foreground">
                      {b.createdAt.toLocaleString('fr-FR')} · stratégie {b.strategy}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="success">{b.imported} créés</Badge>
                    <Badge variant="secondary">{b.updated} mis à jour</Badge>
                    <Badge variant="muted">{b.skipped} ignorés</Badge>
                    {b.invalid > 0 ? <Badge variant="destructive">{b.invalid} invalides</Badge> : null}
                    {b.duplicates > 0 ? <Badge variant="warning">{b.duplicates} doublons</Badge> : null}
                    <Badge variant={b.status === 'DONE' ? 'success' : 'default'}>{b.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
