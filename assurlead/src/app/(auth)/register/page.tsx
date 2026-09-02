import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { RegisterForm } from './register-form';

export const metadata = { title: 'Créer un compte' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Créer votre espace</h1>
        <p className="text-sm text-muted-foreground">Quelques secondes suffisent pour démarrer.</p>
      </div>
      <RegisterForm />
      <p className="text-xs text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
