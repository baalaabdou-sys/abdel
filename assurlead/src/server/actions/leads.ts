'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { assignLead, pickAssignee, type AssignmentStrategy } from '../services/assignment';
import { runAutomations } from '../services/automations';
import { refreshDailyGoal } from '../services/lead-intake';
import { LEAD_STATUS_LIST } from '@/lib/domain';

/** Records the first commercial action, which is what speed-to-lead measures. */
async function markFirstAction(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { firstActionAt: true, createdAt: true } });
  if (!lead || lead.firstActionAt) return;
  const now = new Date();
  await prisma.lead.update({
    where: { id: leadId },
    data: { firstActionAt: now, responseMinutes: Math.round((now.getTime() - lead.createdAt.getTime()) / 60_000) },
  });
}

export async function updateLeadStatusAction(leadId: string, status: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('leads:write');
    if (!LEAD_STATUS_LIST.includes(status as 'NOUVEAU')) return fail('Statut inconnu');

    const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: ctx.workspaceId } });
    if (!lead) return fail('Lead introuvable');

    const now = new Date();
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status as 'NOUVEAU',
        ...(status === 'CONTACTE' && !lead.contactedAt ? { contactedAt: now } : {}),
        ...(status === 'GAGNE' ? { wonAt: now } : {}),
        ...(status === 'PERDU' ? { lostAt: now } : {}),
      },
    });
    await markFirstAction(leadId);

    await prisma.leadActivity.create({
      data: {
        leadId, userId: ctx.user.id, type: 'STATUS_CHANGE',
        title: 'Statut modifié', body: `${lead.status} → ${status}`,
      },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'lead.status_change',
      entityType: 'Lead', entityId: leadId, summary: `${lead.status} → ${status}`,
      before: { status: lead.status }, after: { status },
    });

    if (status === 'GAGNE') await runAutomations('LEAD_WON', { workspaceId: ctx.workspaceId, leadId });
    await refreshDailyGoal(ctx.workspaceId);

    revalidatePath('/leads');
    revalidatePath('/crm');
    revalidatePath(`/leads/${leadId}`);
    return ok(null);
  });
}

export async function assignLeadAction(leadId: string, userId: string | null, strategy: AssignmentStrategy = 'MANUAL'): Promise<ActionResult<{ userId: string | null }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('leads:assign');
    const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: ctx.workspaceId } });
    if (!lead) return fail('Lead introuvable');

    let target = userId;
    if (strategy !== 'MANUAL') {
      target = await pickAssignee(ctx.workspaceId, strategy, { product: lead.product, postalCode: lead.postalCode });
    } else if (userId) {
      const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: ctx.workspaceId, userId } });
      if (!member) return fail('Utilisateur introuvable dans cet espace de travail');
    }

    await assignLead({ leadId, userId: target, strategy, actorId: ctx.user.id });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'lead.assign',
      entityType: 'Lead', entityId: leadId, summary: `Assigné (${strategy})`,
      before: { ownerId: lead.ownerId }, after: { ownerId: target },
    });
    revalidatePath('/leads');
    revalidatePath('/crm');
    return ok({ userId: target });
  });
}

export async function addLeadNoteAction(leadId: string, body: string, type = 'NOTE'): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('leads:write');
    const parsed = z.string().min(1, 'Note vide').max(4000).safeParse(body);
    if (!parsed.success) return fail('La note est vide ou trop longue.');

    const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: ctx.workspaceId } });
    if (!lead) return fail('Lead introuvable');

    await prisma.leadActivity.create({
      data: {
        leadId, userId: ctx.user.id, type,
        title: type === 'CALL' ? 'Appel' : type === 'EMAIL' ? 'Email' : 'Note',
        body: parsed.data,
      },
    });
    await markFirstAction(leadId);
    if (type === 'CALL' && !lead.contactedAt) {
      await prisma.lead.update({ where: { id: leadId }, data: { contactedAt: new Date() } });
    }
    revalidatePath(`/leads/${leadId}`);
    return ok(null);
  });
}

export async function scheduleAppointmentAction(leadId: string, when: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('leads:write');
    const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: ctx.workspaceId } });
    if (!lead) return fail('Lead introuvable');
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return fail('Date invalide');

    await prisma.lead.update({ where: { id: leadId }, data: { appointmentAt: date, status: 'RENDEZ_VOUS' } });
    await prisma.leadActivity.create({
      data: { leadId, userId: ctx.user.id, type: 'APPOINTMENT', title: 'Rendez-vous planifié', body: date.toLocaleString('fr-FR') },
    });
    await markFirstAction(leadId);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath('/crm');
    return ok(null);
  });
}

export async function updateLeadAction(leadId: string, data: { value?: number | null; lostReason?: string | null; tags?: string[]; notes?: string | null }): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('leads:write');
    const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: ctx.workspaceId } });
    if (!lead) return fail('Lead introuvable');
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.lostReason !== undefined ? { lostReason: data.lostReason } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    revalidatePath(`/leads/${leadId}`);
    return ok(null);
  });
}
