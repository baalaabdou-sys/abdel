import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from './db';
import { sha256, randomToken } from './crypto';

const COOKIE = 'assurlead_session';
const WORKSPACE_COOKIE = 'assurlead_ws';
const SESSION_DAYS = 14;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Error('AUTH_SECRET must be set (>= 24 chars)');
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = { sub: string; sid: string };

export async function createSession(userId: string, meta?: { ip?: string; userAgent?: string }) {
  const raw = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const session = await prisma.session.create({
    data: { userId, tokenHash: sha256(raw), expiresAt, ip: meta?.ip, userAgent: meta?.userAgent },
  });
  const jwt = await new SignJWT({ sub: userId, sid: session.id, k: raw })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt.getTime() / 1000)
    .sign(secret());

  cookies().set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return session;
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      if (payload.sid) await prisma.session.deleteMany({ where: { id: String(payload.sid) } });
    } catch {
      /* invalid token — nothing to revoke */
    }
  }
  cookies().delete(COOKIE);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  locale: string;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = String(payload.sid ?? '');
    const raw = String((payload as Record<string, unknown>).k ?? '');
    if (!sid || !raw) return null;
    const session = await prisma.session.findUnique({ where: { id: sid } });
    if (!session || session.tokenHash !== sha256(raw) || session.expiresAt < new Date()) return null;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, locale: user.locale, avatarUrl: user.avatarUrl };
  } catch {
    return null;
  }
}

export type WorkspaceContext = {
  user: AuthUser;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceLogoUrl: string | null;
  isDemo: boolean;
  onboardingDone: boolean;
  role: Role;
  locale: string;
};

/** Resolves the active workspace, enforcing that the user is a member of it. */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const preferred = cookies().get(WORKSPACE_COOKIE)?.value;
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (memberships.length === 0) return null;

  const membership = memberships.find((m) => m.workspaceId === preferred) ?? memberships[0];
  return {
    user,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
    workspaceSlug: membership.workspace.slug,
    workspaceLogoUrl: membership.workspace.logoUrl,
    isDemo: membership.workspace.isDemo,
    onboardingDone: membership.workspace.onboardingDone,
    role: membership.role,
    locale: user.locale || membership.workspace.locale,
  };
}

export function setActiveWorkspace(workspaceId: string) {
  cookies().set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function listUserWorkspaces(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
}
