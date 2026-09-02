import 'server-only';
import type { SuppressionReason } from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeEmail, normalizePhone } from '@/lib/utils';

/**
 * The suppression list is the product's hardest invariant: an address on it
 * must never receive an automated marketing email. It is consulted at send
 * time (not only at campaign build time) — see `sending.ts`.
 */

export async function addSuppression(params: {
  workspaceId: string;
  email?: string | null;
  phone?: string | null;
  reason: SuppressionReason;
  source?: string;
  campaignId?: string | null;
  notes?: string;
  userId?: string | null;
}) {
  const emailNormalized = params.email ? normalizeEmail(params.email) : null;
  if (!emailNormalized && !params.phone) return null;

  const entry = emailNormalized
    ? await prisma.suppressionEntry.upsert({
        where: { workspaceId_emailNormalized: { workspaceId: params.workspaceId, emailNormalized } },
        update: {
          reason: params.reason,
          source: params.source,
          campaignId: params.campaignId ?? null,
          notes: params.notes,
        },
        create: {
          workspaceId: params.workspaceId,
          email: params.email,
          emailNormalized,
          phone: normalizePhone(params.phone),
          reason: params.reason,
          source: params.source,
          campaignId: params.campaignId ?? null,
          notes: params.notes,
          createdById: params.userId ?? null,
        },
      })
    : await prisma.suppressionEntry.create({
        data: {
          workspaceId: params.workspaceId,
          phone: normalizePhone(params.phone),
          reason: params.reason,
          source: params.source,
          notes: params.notes,
          createdById: params.userId ?? null,
        },
      });

  if (emailNormalized) {
    await prisma.contact.updateMany({
      where: { workspaceId: params.workspaceId, emailNormalized },
      data: {
        suppressed: true,
        emailMarketingAllowed: false,
        ...(params.reason === 'UNSUBSCRIBED' ? { unsubscribed: true, unsubscribedAt: new Date() } : {}),
      },
    });
    // Cancel anything still queued for this address across all campaigns.
    await prisma.campaignRecipient.updateMany({
      where: {
        contact: { workspaceId: params.workspaceId, emailNormalized },
        status: { in: ['PENDING', 'QUEUED'] },
      },
      data: { status: 'SUPPRESSED', skipReason: `Suppression: ${params.reason}` },
    });
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      action: 'suppression.add',
      entityType: 'SuppressionEntry',
      entityId: entry.id,
      summary: `${params.email ?? params.phone} — ${params.reason}`,
      after: { reason: params.reason, source: params.source ?? null } as never,
    },
  });

  return entry;
}

export async function removeSuppression(workspaceId: string, id: string, userId?: string) {
  const entry = await prisma.suppressionEntry.findFirst({ where: { id, workspaceId } });
  if (!entry) return false;
  await prisma.suppressionEntry.delete({ where: { id } });
  if (entry.emailNormalized) {
    await prisma.contact.updateMany({
      where: { workspaceId, emailNormalized: entry.emailNormalized },
      data: { suppressed: false },
    });
  }
  await prisma.auditLog.create({
    data: {
      workspaceId,
      userId: userId ?? null,
      action: 'suppression.remove',
      entityType: 'SuppressionEntry',
      entityId: id,
      summary: `${entry.email ?? entry.phone} retiré de la liste de suppression`,
      before: { reason: entry.reason } as never,
    },
  });
  return true;
}

/** Returns the subset of the given normalised emails that are suppressed. */
export async function filterSuppressed(workspaceId: string, emailsNormalized: string[]): Promise<Set<string>> {
  if (emailsNormalized.length === 0) return new Set();
  const rows = await prisma.suppressionEntry.findMany({
    where: { workspaceId, emailNormalized: { in: emailsNormalized } },
    select: { emailNormalized: true },
  });
  return new Set(rows.map((r) => r.emailNormalized).filter((e): e is string => !!e));
}

export async function isSuppressed(workspaceId: string, email: string): Promise<boolean> {
  const emailNormalized = normalizeEmail(email);
  const hit = await prisma.suppressionEntry.findUnique({
    where: { workspaceId_emailNormalized: { workspaceId, emailNormalized } },
    select: { id: true },
  });
  return !!hit;
}
