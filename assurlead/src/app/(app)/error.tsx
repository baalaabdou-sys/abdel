'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-10">
      <ErrorState
        title="Cette page n’a pas pu être chargée"
        description={error.message || 'Une erreur inattendue est survenue.'}
        action={<Button onClick={reset} variant="outline">Réessayer</Button>}
      />
    </div>
  );
}
