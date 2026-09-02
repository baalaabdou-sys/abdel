'use server';
import { requireWorkspace, guard, ok, fail } from '../context';
import { runAssistant } from '../ai/assistant';
import { analyseCampaign } from '../ai/analyst';
import { checkRateLimit } from '../services/rate-limit';
import { prisma } from '@/lib/db';

/** AI usage is metered per workspace to prevent runaway spend. */
async function assertBudget(workspaceId: string) {
  const periodMonth = new Date().toISOString().slice(0, 7);
  const used = await prisma.apiUsage.aggregate({
    where: { workspaceId, kind: 'AI_REQUEST', periodMonth },
    _sum: { quantity: true },
  });
  const cap = Number(process.env.AI_MONTHLY_REQUEST_CAP ?? 5000);
  if ((used._sum.quantity ?? 0) >= cap) {
    throw new Error(`Plafond mensuel de requêtes IA atteint (${cap}). Ajustez-le dans les paramètres.`);
  }
}

export async function askAssistantAction(prompt: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('ai:use');
    if (prompt.trim().length < 3) return fail('Posez une question ou décrivez ce que vous souhaitez faire.');

    const limit = await checkRateLimit(`ai:${ctx.workspaceId}:${ctx.user.id}`, 30, 60_000);
    if (!limit.allowed) return fail('Trop de requêtes IA. Patientez une minute.');
    await assertBudget(ctx.workspaceId);

    const response = await runAssistant(ctx.workspaceId, prompt.trim());
    return ok(response);
  });
}

export async function analyseCampaignAction(campaignId?: string, question?: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('ai:use');
    const limit = await checkRateLimit(`ai-analyse:${ctx.workspaceId}`, 20, 60_000);
    if (!limit.allowed) return fail('Trop d’analyses demandées. Patientez une minute.');
    await assertBudget(ctx.workspaceId);

    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ctx.workspaceId } });
      if (!campaign) return fail('Campagne introuvable');
    }
    const analysis = await analyseCampaign(ctx.workspaceId, campaignId, question);
    return ok(analysis);
  });
}
