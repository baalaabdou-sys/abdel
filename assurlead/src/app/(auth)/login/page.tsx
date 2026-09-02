import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">Accédez à votre espace de génération de leads.</p>
      </div>
      <LoginForm />
      <p className="text-xs text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Créer un espace de travail
        </Link>
      </p>
    </div>
  );
}
