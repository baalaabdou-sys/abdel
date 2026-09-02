import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { notify } from './notifications';
import { addSuppression } from './suppression';
import { assignLead, pickAssignee, type AssignmentStrategy } from './assignment';

export type AutomationTrigger =
  | 'LEAD_CREATED' | 'LEAD_SCORE_ABOVE' | 'LEAD_NOT_CONTACTED'
  | 'FORM_SUBMITTED' | 'HARD_BOUNCE' | 'UNSUBSCRIBE' | 'LEAD_WON';

export type AutomationCondition = { field: string; operator: 'gte' | 'lte' | 'equals' | 'in'; value: unknown };

export type AutomationAction =
  | { type: 'NOTIFY_TEAM'; level?: string }
  | { type: 'NOTIFY_OWNER'; level?: string }
  | { type: 'NOTIFY_MANAGERS'; level?: string }
  | { type: 'ASSIGN_LEAD'; strategy?: AssignmentStrategy }
  | { type: 'CREATE_TASK'; title: string; taskType?: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; dueInMinutes?: number }
  | { type: 'SUPPRESS_CONTACT'; reason?: string }
  | { type: 'SET_LEAD_STATUS'; status: string }
  | { type: 'ADD_TAG'; tag: string }
  | { type: 'CANCEL_SCHEDULED_SENDS' };

export type AutomationContext = {
  workspaceId: string;
  leadId?: string;
  contactId?: string;
  email?: string;
  score?: number;
  minutes?: number;
  product?: string;
  postalCode?: string | null;
  /** Makes each execution idempotent for a given entity + trigger. */
  dedupeSuffix?: string;
};

function conditionsPass(conditions: AutomationCondition[], ctx: AutomationContext): boolean {
  return conditions.every((c) => {
    const actual = (ctx as unknown as Record<string, unknown>)[c.field];
    switch (c.operator) {
      case 'gte': return Number(actual ?? 0) >= Number(c.value);
      case 'lte': return Number(actual ?? 0) <= Number(c.value);
      case 'equals': return String(actual ?? '') === String(c.value);
      case 'in': return Array.isArray(c.value) && (c.value as unknown[]).map(String).includes(String(actual ?? ''));
      default: return true;
    }
  });
}

/** Runs every enabled rule for a trigger. Executions are recorded and deduped. */
export async function runAutomations(trigger: AutomationTrigger, ctx: AutomationContext) {
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId: ctx.workspaceId, trigger, enabled: true },
  });

  for (const rule of rules) {
    const conditions = (rule.conditions as unknown as AutomationCondition[]) ?? [];
    if (!conditionsPass(conditions, ctx)) continue;

    const entityId = ctx.leadId ?? ctx.contactId ?? ctx.email ?? 'workspace';
    const dedupeKey = `${rule.id}:${entityId}:${ctx.dedupeSuffix ?? trigger}`;

    try {
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          entityType: ctx.leadId ? 'Lead' : ctx.contactId ? 'Contact' : 'Workspace',
          entityId,
          dedupeKey,
          detail: { trigger, actions: rule.actions } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') continue; // already executed
      throw err;
    }

    const actions = (rule.actions as unknown as AutomationAction[]) ?? [];
    for (const action of actions) {
      try {
        await executeAction(action, ctx, rule.name);
      } catch (err) {
        console.error(`[automation] ${rule.name} action ${action.type} failed`, err);
      }
    }
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }
}

async function executeAction(action: AutomationAction, ctx: AutomationContext, ruleName: string) {
  const lead = ctx.leadId ? await prisma.lead.findUnique({ where: { id: ctx.leadId } }) : null;

  switch (action.type) {
    case 'NOTIFY_TEAM':
      await notify({
        workspaceId: ctx.workspaceId,
        type: 'AUTOMATION',
        level: (action.level as 'INFO') ?? 'INFO',
        title: lead ? `Nouveau lead : ${leadName(lead)}` : ruleName,
        body: lead ? `${lead.product} · ${lead.city ?? '—'} · score ${lead.score}/100` : '',
        link: lead ? `/leads/${lead.id}` : undefined,
        roles: ['OWNER', 'ADMIN', 'SALES'],
        dedupeKey: lead ? `lead_created:${lead.id}` : undefined,
      });
      break;

    case 'NOTIFY_OWNER':
      if (lead?.ownerId) {
        await notify({
          workspaceId: ctx.workspaceId,
          type: 'HOT_LEAD',
          level: (action.level as 'CRITICAL') ?? 'CRITICAL',
          title: `🔥 Lead chaud : ${leadName(lead)}`,
          body: `${lead.product} · ${lead.city ?? '—'} · ${lead.phone ?? 'sans téléphone'} · score ${lead.score}/100`,
          link: `/leads/${lead.id}`,
          userId: lead.ownerId,
          dedupeKey: `hot_lead:${lead.id}`,
          email: true,
        });
      }
      break;

    case 'NOTIFY_MANAGERS':
      await notify({
        workspaceId: ctx.workspaceId,
        type: 'SPEED_TO_LEAD',
        level: (action.level as 'WARNING') ?? 'WARNING',
        title: lead ? `Lead non contacté : ${leadName(lead)}` : ruleName,
        body: `Aucune action commerciale depuis ${ctx.minutes ?? '?'} minutes.`,
        link: lead ? `/leads/${lead.id}` : undefined,
        roles: ['OWNER', 'ADMIN'],
        dedupeKey: lead ? `speed_alert:${lead.id}` : undefined,
      });
      break;

    case 'ASSIGN_LEAD': {
      if (!lead || lead.ownerId) break;
      const userId = await pickAssignee(ctx.workspaceId, action.strategy ?? 'ROUND_ROBIN', {
        product: lead.product,
        postalCode: lead.postalCode,
      });
      if (userId) await assignLead({ leadId: lead.id, userId, strategy: action.strategy ?? 'ROUND_ROBIN' });
      break;
    }

    case 'CREATE_TASK': {
      if (!lead) break;
      const dueAt = action.dueInMinutes ? new Date(Date.now() + action.dueInMinutes * 60_000) : null;
      await prisma.task.create({
        data: {
          workspaceId: ctx.workspaceId,
          leadId: lead.id,
          assigneeId: lead.ownerId,
          title: `${action.title} — ${leadName(lead)}`,
          type: action.taskType ?? 'CALL',
          priority: action.priority ?? 'NORMAL',
          dueAt,
          isDemo: lead.isDemo,
        },
      });
      break;
    }

    case 'SUPPRESS_CONTACT':
      if (ctx.email) {
        await addSuppression({
          workspaceId: ctx.workspaceId,
          email: ctx.email,
          reason: (action.reason as 'UNSUBSCRIBED') ?? 'UNSUBSCRIBED',
          source: `automation:${ruleName}`,
        });
      }
      break;

    case 'SET_LEAD_STATUS':
      if (lead) await prisma.lead.update({ where: { id: lead.id }, data: { status: action.status as 'NOUVEAU' } });
      break;

    case 'ADD_TAG':
      if (lead && !lead.tags.includes(action.tag)) {
        await prisma.lead.update({ where: { id: lead.id }, data: { tags: { push: action.tag } } });
      }
      break;

    case 'CANCEL_SCHEDULED_SENDS':
      if (lead?.contactId) {
        await prisma.campaignRecipient.updateMany({
          where: { contactId: lead.contactId, status: { in: ['PENDING', 'QUEUED'] } },
          data: { status: 'CANCELLED', skipReason: 'Client signé — envois marketing arrêtés' },
        });
      }
      break;
  }
}

function leadName(lead: { firstName: string | null; lastName: string | null; email: string | null }) {
  return [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Lead';
}
