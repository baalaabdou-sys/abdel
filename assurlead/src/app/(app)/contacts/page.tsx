import Link from 'next/link';
import { Upload, Plus, Users } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { contactWhere, type ContactFilters } from '@/server/actions/contacts';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Contacts' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function ContactsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const ctx = await requireWorkspace('contacts:read');
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const filters: ContactFilters = {
    q: searchParams.q, verification: searchParams.verification, consent: searchParams.consent,
    product: searchParams.product, city: searchParams.city, status: searchParams.status,
    suppressed: searchParams.suppressed, tag: searchParams.tag,
  };
  const where = contactWhere(ctx.workspaceId, filters);

  // Server-side pagination: the browser never receives the whole database.
  const [rows, total, totalAll] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, city: true,
        postalCode: true, insuranceInterests: true, currentInsurer: true, renewalDate: true,
        verificationStatus: true, consentEmail: true, suppressed: true, status: true,
        source: true, tags: true, createdAt: true,
      },
    }),
    prisma.contact.count({ where }),
    prisma.contact.count({ where: { workspaceId: ctx.workspaceId } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        description={`${totalAll.toLocaleString('fr-FR')} contact(s) dans votre base.`}
        actions={
          can(ctx.role, 'contacts:import') ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/contacts/import"><Upload /> Importer</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/contacts/new"><Plus /> Nouveau contact</Link>
              </Button>
            </>
          ) : null
        }
      />

      {totalAll === 0 ? (
        <EmptyState
          icon={Users}
          title="Votre base est vide"
          description="Importez votre fichier CSV ou XLSX existant : ASSURLEAD AI détecte automatiquement les colonnes, repère les doublons et enregistre la provenance de chaque contact."
          action={
            <Button asChild>
              <Link href="/contacts/import"><Upload /> Importer ma base</Link>
            </Button>
          }
        />
      ) : (
        <ContactsTable
          rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), renewalDate: r.renewalDate?.toISOString() ?? null }))}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          filters={filters}
          canWrite={can(ctx.role, 'contacts:write')}
          canDelete={can(ctx.role, 'contacts:delete')}
          canSuppress={can(ctx.role, 'suppression:write')}
        />
      )}
    </div>
  );
}
