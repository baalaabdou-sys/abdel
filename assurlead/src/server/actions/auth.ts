'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, destroySession, hashPassword, verifyPassword, setActiveWorkspace, getCurrentUser } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { fail, ok, guard, type ActionResult } from '../context';
import { bootstrapWorkspace } from '../services/workspace-bootstrap';
import { checkRateLimit } from '../services/rate-limit';

const credentialsSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2, 'Nom trop court').max(80),
  workspaceName: z.string().min(2, 'Nom de société trop court').max(80),
});

function clientMeta() {
  const h = headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  };
}

export async function signInAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ redirect: string }>> {
  return guard(async () => {
    const parsed = credentialsSchema.safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const meta = clientMeta();
    const limit = await checkRateLimit(`login:${meta.ip ?? 'unknown'}:${parsed.data.email}`, 10, 60_000);
    if (!limit.allowed) return fail('Trop de tentatives. Réessayez dans une minute.');

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return fail('Email ou mot de passe incorrect');
    }
    await createSession(user.id, meta);
    const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
    if (membership) setActiveWorkspace(membership.workspaceId);
    return ok({ redirect: membership ? '/dashboard' : '/onboarding' });
  });
}

export async function registerAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ redirect: string }>> {
  return guard(async () => {
    const parsed = registerSchema.safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: String(formData.get('name') ?? ''),
      workspaceName: String(formData.get('workspaceName') ?? ''),
    });
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail('Un compte existe déjà avec cette adresse email');

    const user = await prisma.user.create({
      data: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) },
    });

    let slug = slugify(parsed.data.workspaceName);
    if (await prisma.workspace.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const workspace = await prisma.workspace.create({
      data: { name: parsed.data.workspaceName, slug, members: { create: { userId: user.id, role: 'OWNER' } } },
    });
    await bootstrapWorkspace(workspace.id);

    await createSession(user.id, clientMeta());
    setActiveWorkspace(workspace.id);
    return ok({ redirect: '/onboarding' });
  });
}

export async function signOutAction() {
  await destroySession();
  redirect('/login');
}

export async function switchWorkspaceAction(workspaceId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const user = await getCurrentUser();
    if (!user) return fail('Session expirée');
    const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id, workspaceId } });
    if (!membership) return fail('Espace de travail introuvable');
    setActiveWorkspace(workspaceId);
    return ok(null);
  });
}

export async function setLocaleAction(locale: 'fr' | 'en'): Promise<ActionResult<null>> {
  return guard(async () => {
    const user = await getCurrentUser();
    if (!user) return fail('Session expirée');
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
    return ok(null);
  });
}
