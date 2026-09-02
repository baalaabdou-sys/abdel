'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportContactAction } from '@/server/actions/contacts';

/** Exports every stored field for one contact as JSON (data-access request). */
export function ContactExportButton({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const result = await exportContactAction(contactId);
        setLoading(false);
        if (!result.ok) { toast.error(result.error); return; }
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contact-${contactId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export téléchargé');
      }}
    >
      <Download /> Exporter les données
    </Button>
  );
}
