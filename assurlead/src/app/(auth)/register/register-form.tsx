'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { registerAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" loading={pending}>Créer mon espace</Button>;
}

export function RegisterForm() {
  const [state, action] = useFormState(registerAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.push(state.data.redirect);
    else if (state && !state.ok) toast.error(state.error);
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="workspaceName">Nom de la société</Label>
        <Input id="workspaceName" name="workspaceName" required placeholder="Assurances Dupont" />
        {fe?.workspaceName ? <p className="text-xs text-destructive">{fe.workspaceName[0]}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Votre nom</Label>
        <Input id="name" name="name" required autoComplete="name" placeholder="Jean Dupont" />
        {fe?.name ? <p className="text-xs text-destructive">{fe.name[0]}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="vous@societe.fr" />
        {fe?.email ? <p className="text-xs text-destructive">{fe.email[0]}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe (8 caractères minimum)</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        {fe?.password ? <p className="text-xs text-destructive">{fe.password[0]}</p> : null}
      </div>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
