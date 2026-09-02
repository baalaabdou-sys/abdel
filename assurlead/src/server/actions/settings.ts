'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { ROLES } from '@/lib/rbac';
import { INSURANCE_TYPES } from '@/lib/domain';

export async function updateWorkspaceAction(raw: unknown): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    const parsed = z.object({
      name: z.string().min(2).max(120),
      logoUrl: z.string().url().optional().or(z.literal('')),
      locale: z.enum(['fr', 'en']),
      timezone: z.string().max(60),
    }).safeParse(raw);
    if (!parsed.success) return fail('Champs invalides');

    await prisma.workspace.update({
      where: { id: ctx.workspaceId },
      data: {
        name: parsed.data.name,
        logoUrl: parsed.data.logoUrl || null,
        locale: parsed.data.locale,
        timezone: parsed.data.timezone,
      },
    });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'workspace.update', entityType: 'Workspace', entityId: ctx.workspaceId, summary: parsed.data.name });
    revalidatePath('/settings');
    return ok(null);
  });
}

export async function updateCompliancePolicyAction(raw: unknown): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    const parsed = z.object({
      requireExplicitConsent: z.boolean(),
      allowUnknownConsent: z.boolean(),
      requireSourceRecorded: z.boolean(),
      allowCatchAll: z.boolean(),
      allowRisky: z.boolean(),
      allowUnverified: z.boolean(),
      blockOnUnknownConsent: z.boolean(),
      blockOnMissingSource: z.boolean(),
      blockOnLowReadiness: z.boolean(),
      minReadinessScore: z.coerce.number().int().min(0).max(100),
      retentionMonths: z.coerce.number().int().min(1).max(240),
      legalNotice: z.string().max(2000),
      privacyUrl: z.string().url().optional().or(z.literal('')),
      dpoEmail: z.string().email().optional().or(z.literal('')),
    }).safeParse(raw);
    if (!parsed.success) return fail('Champs invalides');

    const before = await prisma.compliancePolicy.findUnique({ where: { workspaceId: ctx.workspaceId } });
    await prisma.compliancePolicy.upsert({
      where: { workspaceId: ctx.workspaceId },
      update: parsed.data,
      create: { workspaceId: ctx.workspaceId, ...parsed.data },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'policy.update',
      entityType: 'CompliancePolicy', entityId: ctx.workspaceId,
      summary: 'Politique de conformité modifiée',
      before: before ?? undefined, after: parsed.data,
    });
    revalidatePath('/settings');
    return ok(null);
  });
}

export async function updateDailyGoalAction(minTarget: number, stretchTarget: number): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    const parsed = z.object({
      minTarget: z.coerce.number().int().min(1).max(1000),
      stretchTarget: z.coerce.number().int().min(1).max(2000),
    }).safeParse({ minTarget, stretchTarget });
    if (!parsed.success) return fail('Objectifs invalides');
    if (parsed.data.stretchTarget < parsed.data.minTarget) return fail('L’objectif ambitieux doit être supérieur ou égal à l’objectif minimum.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyGoal.upsert({
      where: { workspaceId_date: { workspaceId: ctx.workspaceId, date: today } },
      update: parsed.data,
      create: { workspaceId: ctx.workspaceId, date: today, ...parsed.data },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'goal.update',
      entityType: 'DailyGoal', summary: `Objectif : ${parsed.data.minTarget}–${parsed.data.stretchTarget} leads qualifiés/jour`,
    });
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return ok(null);
  });
}

export async function inviteMemberAction(raw: unknown): Promise<ActionResult<{ email: string; temporaryPassword?: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('members:manage');
    const parsed = z.object({
      email: z.string().email(),
      name: z.string().min(2).max(80),
      role: z.enum(ROLES as [Role, ...Role[]]),
      password: z.string().min(8).max(100),
    }).safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);
    if (parsed.data.role === 'OWNER' && ctx.role !== 'OWNER') return fail('Seul le propriétaire peut nommer un autre propriétaire.');

    const email = parsed.data.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) },
      });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: user.id } },
    });
    if (existing) return fail('Cet utilisateur fait déjà partie de l’espace de travail.');

    await prisma.workspaceMember.create({
      data: { workspaceId: ctx.workspaceId, userId: user.id, role: parsed.data.role },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'member.add',
      entityType: 'WorkspaceMember', entityId: user.id, summary: `${email} ajouté avec le rôle ${parsed.data.role}`,
    });
    revalidatePath('/settings');
    return ok({ email });
  });
}

export async function updateMemberRoleAction(userId: string, role: Role): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('members:manage');
    if (!ROLES.includes(role)) return fail('Rôle inconnu');
    if (role === 'OWNER' && ctx.role !== 'OWNER') return fail('Seul le propriétaire peut nommer un autre propriétaire.');
    if (userId === ctx.user.id) return fail('Vous ne pouvez pas modifier votre propre rôle.');

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    });
    if (!member) return fail('Membre introuvable');

    if (member.role === 'OWNER') {
      const owners = await prisma.workspaceMember.count({ where: { workspaceId: ctx.workspaceId, role: 'OWNER' } });
      if (owners <= 1) return fail('L’espace de travail doit conserver au moins un propriétaire.');
    }

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
      data: { role },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'member.role_change',
      entityType: 'WorkspaceMember', entityId: userId, summary: `${member.role} → ${role}`,
      before: { role: member.role }, after: { role },
    });
    revalidatePath('/settings');
    return ok(null);
  });
}

export async function removeMemberAction(userId: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('members:manage');
    if (userId === ctx.user.id) return fail('Vous ne pouvez pas vous retirer vous-même.');

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } },
    });
    if (!member) return fail('Membre introuvable');
    if (member.role === 'OWNER') {
      const owners = await prisma.workspaceMember.count({ where: { workspaceId: ctx.workspaceId, role: 'OWNER' } });
      if (owners <= 1) return fail('L’espace de travail doit conserver au moins un propriétaire.');
    }

    await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId } } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'member.remove',
      entityType: 'WorkspaceMember', entityId: userId, summary: 'Membre retiré de l’espace de travail',
    });
    revalidatePath('/settings');
    return ok(null);
  });
}

export async function updateProductsAction(active: string[]): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('settings:write');
    const valid = active.filter((t) => (INSURANCE_TYPES as string[]).includes(t));
    await prisma.insuranceProduct.updateMany({
      where: { workspaceId: ctx.workspaceId },
      data: { active: false },
    });
    if (valid.length) {
      await prisma.insuranceProduct.updateMany({
        where: { workspaceId: ctx.workspaceId, type: { in: valid as ('AUTO')[] } },
        data: { active: true },
      });
    }
    revalidatePath('/settings');
    return ok(null);
  });
}

/** Deletes every contact and derived record for the workspace. Irreversible. */
export async function purgeDemoDataAction(): Promise<ActionResult<{ deleted: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('workspace:manage');
    const [leads, campaigns, contacts, pages, forms, templates, tasks] = await prisma.$transaction([
      prisma.lead.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.campaign.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.contact.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.landingPage.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.form.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.template.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
      prisma.task.deleteMany({ where: { workspaceId: ctx.workspaceId, isDemo: true } }),
    ]);
    await prisma.workspace.update({ where: { id: ctx.workspaceId }, data: { isDemo: false } });
    const deleted = leads.count + campaigns.count + contacts.count + pages.count + forms.count + templates.count + tasks.count;
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'workspace.purge_demo',
      entityType: 'Workspace', entityId: ctx.workspaceId, summary: `${deleted} enregistrement(s) de démonstration supprimé(s)`,
    });
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return ok({ deleted });
  });
}
