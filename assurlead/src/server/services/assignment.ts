import 'server-only';
import type { InsuranceType, Role } from '@prisma/client';
import { prisma } from '@/lib/db';

export type AssignmentStrategy = 'MANUAL' | 'ROUND_ROBIN' | 'PRODUCT' | 'REGION' | 'WORKLOAD';

const SALES_ROLES: Role[] = ['SALES', 'ADMIN', 'OWNER'];

/**
 * Picks the sales owner for a lead.
 * PRODUCT and REGION strategies read their routing table from the workspace's
 * `Integration` config (kind CRM, provider "routing"), falling back to workload.
 */
export async function pickAssignee(
  workspaceId: string,
  strategy: AssignmentStrategy,
  context: { product?: InsuranceType; postalCode?: string | null },
): Promise<string | null> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: SALES_ROLES } },
    orderBy: { createdAt: 'asc' },
    select: { userId: true, role: true },
  });
  if (members.length === 0) return null;
  const salesFirst = members.filter((m) => m.role === 'SALES');
  const pool = (salesFirst.length ? salesFirst : members).map((m) => m.userId);

  if (strategy === 'PRODUCT' || strategy === 'REGION') {
    const routing = await prisma.integration.findFirst({
      where: { workspaceId, kind: 'CRM', provider: 'routing' },
    });
    const cfg = (routing?.config ?? {}) as Record<string, Record<string, string>>;
    const key = strategy === 'PRODUCT' ? context.product ?? '' : (context.postalCode ?? '').slice(0, 2);
    const table = strategy === 'PRODUCT' ? cfg.byProduct : cfg.byDepartment;
    const candidate = table?.[key];
    if (candidate && pool.includes(candidate)) return candidate;
  }

  if (strategy === 'WORKLOAD') {
    const counts = await prisma.lead.groupBy({
      by: ['ownerId'],
      where: {
        workspaceId,
        ownerId: { in: pool },
        status: { in: ['NOUVEAU', 'A_CONTACTER', 'CONTACTE', 'QUALIFIE', 'TRES_INTERESSE', 'RENDEZ_VOUS', 'DEVIS_ENVOYE'] },
      },
      _count: { _all: true },
    });
    const load = new Map(pool.map((id) => [id, 0]));
    for (const c of counts) if (c.ownerId) load.set(c.ownerId, c._count._all);
    return [...load.entries()].sort((a, b) => a[1] - b[1])[0][0];
  }

  // ROUND_ROBIN (and fallback): next in line after the most recent assignment.
  const last = await prisma.leadAssignment.findFirst({
    where: { lead: { workspaceId }, userId: { in: pool } },
    orderBy: { assignedAt: 'desc' },
    select: { userId: true },
  });
  const idx = last?.userId ? pool.indexOf(last.userId) : -1;
  return pool[(idx + 1) % pool.length];
}

export async function assignLead(params: {
  leadId: string;
  userId: string | null;
  strategy: AssignmentStrategy;
  actorId?: string | null;
  note?: string;
}) {
  const lead = await prisma.lead.update({
    where: { id: params.leadId },
    data: { ownerId: params.userId, assignedAt: new Date() },
  });
  await prisma.leadAssignment.create({
    data: { leadId: params.leadId, userId: params.userId, strategy: params.strategy, note: params.note },
  });
  await prisma.leadActivity.create({
    data: {
      leadId: params.leadId,
      userId: params.actorId ?? null,
      type: 'ASSIGNMENT',
      title: params.userId ? 'Lead assigné' : 'Assignation retirée',
      metadata: { strategy: params.strategy, userId: params.userId } as never,
    },
  });
  return lead;
}
