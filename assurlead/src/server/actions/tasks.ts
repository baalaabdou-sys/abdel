'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, type ActionResult } from '../context';

const taskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).default(''),
  type: z.enum(['CALL', 'QUOTE', 'FOLLOW_UP', 'DOCUMENT', 'APPOINTMENT', 'OTHER']).default('CALL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  leadId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
});

export async function createTaskAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('tasks:write');
    const parsed = taskSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides');

    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: parsed.data.leadId, workspaceId: ctx.workspaceId } });
      if (!lead) return fail('Lead introuvable');
    }
    if (parsed.data.assigneeId) {
      const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: ctx.workspaceId, userId: parsed.data.assigneeId } });
      if (!member) return fail('Utilisateur introuvable');
    }

    const task = await prisma.task.create({
      data: {
        workspaceId: ctx.workspaceId,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        priority: parsed.data.priority,
        leadId: parsed.data.leadId || null,
        assigneeId: parsed.data.assigneeId || ctx.user.id,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
    });
    revalidatePath('/tasks');
    return ok({ id: task.id });
  });
}

export async function updateTaskStatusAction(taskId: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('tasks:write');
    const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: ctx.workspaceId } });
    if (!task) return fail('Tâche introuvable');
    await prisma.task.update({
      where: { id: taskId },
      data: { status, completedAt: status === 'DONE' ? new Date() : null },
    });
    revalidatePath('/tasks');
    if (task.leadId) revalidatePath(`/leads/${task.leadId}`);
    return ok(null);
  });
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('tasks:write');
    const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: ctx.workspaceId } });
    if (!task) return fail('Tâche introuvable');
    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath('/tasks');
    return ok(null);
  });
}
