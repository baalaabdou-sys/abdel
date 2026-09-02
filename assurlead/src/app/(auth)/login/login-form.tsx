'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { signInAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Se connecter
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(signInAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.push(state.data.redirect);
    else if (state && !state.ok) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@societe.fr" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
