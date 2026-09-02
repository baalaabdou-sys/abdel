'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { seedDefaultAutomations } from '../services/workspace-bootstrap';

const TRIGGERS = [
  'LEAD_CREATED', 'LEAD_SCORE_ABOVE', 'LEAD_NOT_CONTACTED',
  'FORM_SUBMITTED', 'HARD_BOUNCE', 'UNSUBSCRIBE', 'LEAD_WON',
] as const;

const ruleSchema = z.object({
  name: z.string().min(2).max(140),
  description: z.string().max(400).default(''),
  trigger: z.enum(TRIGGERS),
  conditions: z.array(z.object({
    field: z.string().max(40),
    operator: z.enum(['gte', 'lte', 'equals', 'in']),
    value: z.unknown(),
  })).max(10).default([]),
  actions: z.array(z.record(z.unknown())).min(1, 'Ajoutez au moins une action').max(10),
  enabled: z.boolean().default(true),
});

export async function saveAutomationAction(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('automations:write');
    const parsed = ruleSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return fail(first ? first.message : 'Règle invalide');
    }

    const data = {
      name: parsed.data.name,
      description: parsed.data.description,
      trigger: parsed.data.trigger,
      conditions: parsed.data.conditions as never,
      actions: parsed.data.actions as never,
      enabled: parsed.data.enabled,
    };

    const rule = id
      ? await (async () => {
          const existing = await prisma.automationRule.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
          if (!existing) throw new Error('Règle introuvable');
          return prisma.automationRule.update({ where: { id }, data });
        })()
      : await prisma.automationRule.create({ data: { ...data, workspaceId: ctx.workspaceId } });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id,
      action: id ? 'automation.update' : 'automation.create',
      entityType: 'AutomationRule', entityId: rule.id, summary: rule.name,
    });
    revalidatePath('/automations');
    return ok({ id: rule.id });
  });
}

export async function toggleAutomationAction(id: string, enabled: boolean): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('automations:write');
    const rule = await prisma.automationRule.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!rule) return fail('Règle introuvable');
    await prisma.automationRule.update({ where: { id }, data: { enabled } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id,
      action: enabled ? 'automation.enable' : 'automation.disable',
      entityType: 'AutomationRule', entityId: id, summary: rule.name,
    });
    revalidatePath('/automations');
    return ok(null);
  });
}

export async function deleteAutomationAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('automations:write');
    const rule = await prisma.automationRule.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!rule) return fail('Règle introuvable');
    await prisma.automationRule.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'automation.delete', entityType: 'AutomationRule', entityId: id, summary: rule.name });
    revalidatePath('/automations');
    return ok(null);
  });
}

export async function restoreDefaultAutomationsAction(): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('automations:write');
    const count = await prisma.automationRule.count({ where: { workspaceId: ctx.workspaceId } });
    if (count > 0) return fail('Supprimez d’abord les règles existantes pour restaurer les règles par défaut.');
    await seedDefaultAutomations(ctx.workspaceId);
    revalidatePath('/automations');
    return ok(null);
  });
}
