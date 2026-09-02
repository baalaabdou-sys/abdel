import 'server-only';
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/auth';
import { can, type Permission } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export class AuthError extends Error {
  constructor(message = 'Non authentifié') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Permission insuffisante') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Server-side authorisation gate. Every mutation and every data read goes
 * through this: it resolves the caller's workspace membership and verifies the
 * required permission. Frontend checks are convenience only.
 */
export async function requireWorkspace(permission?: Permission): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext();
  if (!ctx) throw new AuthError();
  if (permission && !can(ctx.role, permission)) throw new ForbiddenError();
  return ctx;
}

export async function requireAuth() {
  const ctx = await getWorkspaceContext();
  if (!ctx) throw new AuthError();
  return ctx;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Wraps an action body, converting known errors into user-facing messages. */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) return fail('Session expirée. Reconnectez-vous.');
    if (err instanceof ForbiddenError) return fail("Vous n'avez pas la permission d'effectuer cette action.");
    console.error('[action]', err);
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return fail(message);
  }
}

export async function writeAudit(params: {
  workspaceId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary ?? '',
      before: (params.before ?? undefined) as never,
      after: (params.after ?? undefined) as never,
    },
  });
}
