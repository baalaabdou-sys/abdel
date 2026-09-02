'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { buildSegmentWhere, countSegment, refreshSegmentCount, segmentRulesSchema } from '../services/segments';
import { proposeSegment } from '../ai/segment-builder';

const segmentSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(90),
  description: z.string().max(400).default(''),
  kind: z.enum(['STATIC', 'DYNAMIC']).default('DYNAMIC'),
  rules: segmentRulesSchema,
});

export async function createSegmentAction(raw: unknown): Promise<ActionResult<{ id: string; count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('segments:write');
    const parsed = segmentSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const count = await countSegment(ctx.workspaceId, parsed.data.rules);
    const segment = await prisma.segment.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description,
        kind: parsed.data.kind,
        rules: parsed.data.rules as never,
        cachedCount: count,
        countedAt: new Date(),
        createdById: ctx.user.id,
      },
    });

    // A static segment freezes its membership at creation time.
    if (parsed.data.kind === 'STATIC') {
      const where = buildSegmentWhere(ctx.workspaceId, parsed.data.rules);
      let cursor: string | undefined;
      for (;;) {
        const batch = await prisma.contact.findMany({
          where, select: { id: true }, orderBy: { id: 'asc' }, take: 1000,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (batch.length === 0) break;
        cursor = batch[batch.length - 1].id;
        await prisma.segmentContact.createMany({
          data: batch.map((c) => ({ segmentId: segment.id, contactId: c.id })),
          skipDuplicates: true,
        });
        if (batch.length < 1000) break;
      }
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'segment.create',
      entityType: 'Segment', entityId: segment.id, summary: `${segment.name} (${count} contacts)`,
    });
    revalidatePath('/segments');
    return ok({ id: segment.id, count });
  });
}

export async function updateSegmentAction(id: string, raw: unknown): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('segments:write');
    const parsed = segmentSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const existing = await prisma.segment.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return fail('Segment introuvable');

    const count = await countSegment(ctx.workspaceId, parsed.data.rules);
    await prisma.segment.update({
      where: { id },
      data: {
        name: parsed.data.name, description: parsed.data.description,
        rules: parsed.data.rules as never, cachedCount: count, countedAt: new Date(),
      },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'segment.update',
      entityType: 'Segment', entityId: id, summary: parsed.data.name,
      before: { rules: existing.rules }, after: { rules: parsed.data.rules },
    });
    revalidatePath('/segments');
    return ok({ count });
  });
}

export async function deleteSegmentAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('segments:write');
    const segment = await prisma.segment.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!segment) return fail('Segment introuvable');
    const used = await prisma.campaign.count({ where: { segmentId: id, status: { in: ['SCHEDULED', 'SENDING'] } } });
    if (used > 0) return fail('Ce segment est utilisé par une campagne programmée ou en cours.');
    await prisma.segment.delete({ where: { id } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'segment.delete',
      entityType: 'Segment', entityId: id, summary: segment.name,
    });
    revalidatePath('/segments');
    return ok(null);
  });
}

export async function previewSegmentAction(rules: unknown): Promise<ActionResult<{ count: number; sample: { id: string; email: string; firstName: string | null; lastName: string | null; city: string | null }[] }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('segments:read');
    const parsed = segmentRulesSchema.safeParse(rules);
    if (!parsed.success) return fail('Filtres invalides');
    const where = buildSegmentWhere(ctx.workspaceId, parsed.data);
    const [count, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({ where, take: 10, select: { id: true, email: true, firstName: true, lastName: true, city: true } }),
    ]);
    return ok({ count, sample });
  });
}

export async function refreshSegmentAction(id: string): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('segments:read');
    const count = await refreshSegmentCount(ctx.workspaceId, id);
    revalidatePath('/segments');
    return ok({ count });
  });
}

/** AI proposal only — nothing is written until the user saves the segment. */
export async function proposeSegmentAction(prompt: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('ai:use');
    if (prompt.trim().length < 5) return fail('Décrivez le segment souhaité en une phrase.');
    const proposal = await proposeSegment(ctx.workspaceId, prompt.trim());
    const count = await countSegment(ctx.workspaceId, proposal.rules);
    return ok({ ...proposal, count });
  });
}
