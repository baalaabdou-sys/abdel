'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { unsubscribeAction } from '@/server/actions/public';

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (state === 'done') {
    return (
      <p className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
        C’est fait. Vous ne recevrez plus d’emails marketing de notre part.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <Button
        className="w-full"
        loading={state === 'loading'}
        onClick={async () => {
          setState('loading');
          const result = await unsubscribeAction(token);
          if (result.ok) setState('done');
          else { setState('error'); setMessage(result.error); }
        }}
      >
        Confirmer ma désinscription
      </Button>
      {state === 'error' ? <p className="text-xs text-destructive">{message}</p> : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        La désinscription est immédiate : votre adresse est ajoutée à notre liste de suppression et
        exclue de tous les envois programmés.
      </p>
    </div>
  );
}
