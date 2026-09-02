'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { INSURANCE_TYPES } from '@/lib/domain';

const templateSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().max(60).default('AUTRE'),
  product: z.enum(INSURANCE_TYPES as [string, ...string[]]).default('AUTRE'),
  locale: z.enum(['fr', 'en']).default('fr'),
  subject: z.string().min(2).max(200),
  previewText: z.string().max(200).default(''),
  bodyText: z.string().min(10),
});

export async function saveTemplateAction(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('templates:write');
    const parsed = templateSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    if (id) {
      const existing = await prisma.template.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return fail('Template introuvable');
      const updated = await prisma.template.update({
        where: { id },
        data: { ...parsed.data, product: parsed.data.product as 'AUTO', version: { increment: 1 } },
      });
      await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'template.update', entityType: 'Template', entityId: id, summary: updated.name });
      revalidatePath('/templates');
      return ok({ id: updated.id });
    }

    const created = await prisma.template.create({
      data: { ...parsed.data, product: parsed.data.product as 'AUTO', workspaceId: ctx.workspaceId },
    });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'template.create', entityType: 'Template', entityId: created.id, summary: created.name });
    revalidatePath('/templates');
    return ok({ id: created.id });
  });
}

export async function duplicateTemplateAction(id: string): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('templates:write');
    const source = await prisma.template.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!source) return fail('Template introuvable');
    const copy = await prisma.template.create({
      data: {
        workspaceId: ctx.workspaceId, name: `${source.name} (copie)`, category: source.category,
        product: source.product, locale: source.locale, subject: source.subject,
        previewText: source.previewText, bodyHtml: source.bodyHtml, bodyText: source.bodyText,
      },
    });
    revalidatePath('/templates');
    return ok({ id: copy.id });
  });
}

export async function archiveTemplateAction(id: string, archived: boolean): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('templates:write');
    const t = await prisma.template.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!t) return fail('Template introuvable');
    await prisma.template.update({ where: { id }, data: { archived } });
    revalidatePath('/templates');
    return ok(null);
  });
}

export async function deleteTemplateAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('templates:write');
    const t = await prisma.template.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!t) return fail('Template introuvable');
    await prisma.template.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'template.delete', entityType: 'Template', entityId: id, summary: t.name });
    revalidatePath('/templates');
    return ok(null);
  });
}
