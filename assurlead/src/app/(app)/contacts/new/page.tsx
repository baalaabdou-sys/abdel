import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireWorkspace } from '@/server/context';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ContactForm, EMPTY_CONTACT } from '@/components/contacts/contact-form';

export const metadata = { title: 'Nouveau contact' };

export default async function NewContactPage() {
  await requireWorkspace('contacts:write');
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/contacts"><ArrowLeft /> Contacts</Link>
      </Button>
      <PageHeader title="Nouveau contact" description="Renseignez les informations et la provenance du contact." />
      <ContactForm initial={EMPTY_CONTACT} />
    </div>
  );
}
