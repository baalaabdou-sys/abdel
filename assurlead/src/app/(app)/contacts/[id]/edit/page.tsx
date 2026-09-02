import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ContactForm, EMPTY_CONTACT } from '@/components/contacts/contact-form';

export const dynamic = 'force-dynamic';

const toInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const ctx = await requireWorkspace('contacts:write');
  const contact = await prisma.contact.findFirst({ where: { id: params.id, workspaceId: ctx.workspaceId } });
  if (!contact) notFound();

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/contacts/${contact.id}`}><ArrowLeft /> Fiche contact</Link>
      </Button>
      <PageHeader title="Modifier le contact" description={contact.email} />
      <ContactForm
        contactId={contact.id}
        initial={{
          ...EMPTY_CONTACT,
          email: contact.email,
          firstName: contact.firstName ?? '',
          lastName: contact.lastName ?? '',
          phone: contact.phone ?? '',
          address: contact.address ?? '',
          city: contact.city ?? '',
          postalCode: contact.postalCode ?? '',
          country: contact.country,
          birthDate: toInput(contact.birthDate),
          profession: contact.profession ?? '',
          company: contact.company ?? '',
          status: contact.status,
          insuranceInterests: contact.insuranceInterests,
          currentInsurer: contact.currentInsurer ?? '',
          renewalDate: toInput(contact.renewalDate),
          requestedCoverage: contact.requestedCoverage ?? '',
          budgetMin: contact.budgetMin?.toString() ?? '',
          budgetMax: contact.budgetMax?.toString() ?? '',
          notes: contact.notes ?? '',
          tags: contact.tags.join(', '),
          source: contact.source ?? '',
          sourceDetail: contact.sourceDetail ?? '',
          consentEmail: contact.consentEmail,
          consentPhone: contact.consentPhone,
          consentDate: toInput(contact.consentDate),
          consentSource: contact.consentSource ?? '',
          legalBasisNote: contact.legalBasisNote ?? '',
          emailMarketingAllowed: contact.emailMarketingAllowed,
          phoneContactAllowed: contact.phoneContactAllowed,
        }}
      />
    </div>
  );
}
