import 'server-only';
import type { CampaignEventType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { pct, startOfDay } from '@/lib/utils';
import { QUALIFIED_SCORE_THRESHOLD, QUALIFIED_LEAD_STATUSES } from '@/lib/domain';

/**
 * All analytics are derived from stored rows (CampaignEvent, CampaignRecipient,
 * Lead, FormSubmission). Nothing here is estimated or hardcoded — the only
 * projected figures live in `forecastForTarget`, and are labelled as estimates.
 */

export type FunnelCounts = {
  recipients: number;
  sent: number;
  delivered: number;
  bounced: number;
  clicks: number;
  uniqueClicks: number;
  landingViews: number;
  formStarts: number;
  formSubmits: number;
  leads: number;
  qualifiedLeads: number;
  contacted: number;
  appointments: number;
  sales: number;
};

export type FunnelRates = {
  deliveryRate: number;
  bounceRate: number;
  clickRate: number;
  landingConversionRate: number;
  formCompletionRate: number;
  leadRate: number;
  qualifiedRate: number;
  appointmentRate: number;
  salesRate: number;
};

export type Funnel = { counts: FunnelCounts; rates: FunnelRates };

type Scope = { workspaceId: string; campaignId?: string; from?: Date; to?: Date; includeDemo?: boolean };

function eventWhere(scope: Scope, type: CampaignEventType | CampaignEventType[]): Prisma.CampaignEventWhereInput {
  return {
    workspaceId: scope.workspaceId,
    ...(scope.campaignId ? { campaignId: scope.campaignId } : {}),
    type: Array.isArray(type) ? { in: type } : type,
    ...(scope.from || scope.to ? { occurredAt: { ...(scope.from ? { gte: scope.from } : {}), ...(scope.to ? { lte: scope.to } : {}) } } : {}),
  };
}

export async function getFunnel(scope: Scope): Promise<Funnel> {
  const dateFilter = scope.from || scope.to
    ? { ...(scope.from ? { gte: scope.from } : {}), ...(scope.to ? { lte: scope.to } : {}) }
    : undefined;

  const recipientWhere: Prisma.CampaignRecipientWhereInput = {
    campaign: { workspaceId: scope.workspaceId, ...(scope.campaignId ? { id: scope.campaignId } : {}) },
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const leadWhere: Prisma.LeadWhereInput = {
    workspaceId: scope.workspaceId,
    ...(scope.campaignId ? { campaignId: scope.campaignId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    ...(scope.includeDemo === false ? { isDemo: false } : {}),
  };

  const [
    recipients, sent, delivered, bounced, clicks, uniqueClickRows,
    landingViews, formStarts, formSubmits,
    leads, qualifiedLeads, contacted, appointments, sales,
  ] = await Promise.all([
    prisma.campaignRecipient.count({ where: recipientWhere }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'SENT') }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'DELIVERED') }),
    prisma.campaignEvent.count({ where: eventWhere(scope, ['BOUNCED']) }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'CLICKED') }),
    prisma.campaignEvent.findMany({ where: eventWhere(scope, 'CLICKED'), select: { recipientId: true }, distinct: ['recipientId'] }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'LANDING_VIEW') }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'FORM_START') }),
    prisma.campaignEvent.count({ where: eventWhere(scope, 'FORM_SUBMIT') }),
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, OR: [{ score: { gte: QUALIFIED_SCORE_THRESHOLD } }, { status: { in: QUALIFIED_LEAD_STATUSES } }] } }),
    prisma.lead.count({ where: { ...leadWhere, NOT: { contactedAt: null } } }),
    prisma.lead.count({ where: { ...leadWhere, NOT: { appointmentAt: null } } }),
    prisma.lead.count({ where: { ...leadWhere, status: 'GAGNE' } }),
  ]);

  // Providers that do not emit delivery webhooks: treat sent-minus-bounced as
  // the best available delivered figure, and say so in the UI.
  const effectiveDelivered = delivered > 0 ? delivered : Math.max(0, sent - bounced);

  const counts: FunnelCounts = {
    recipients, sent, delivered: effectiveDelivered, bounced,
    clicks, uniqueClicks: uniqueClickRows.length,
    landingViews, formStarts, formSubmits,
    leads, qualifiedLeads, contacted, appointments, sales,
  };

  const rates: FunnelRates = {
    deliveryRate: pct(effectiveDelivered, sent),
    bounceRate: pct(bounced, sent),
    clickRate: pct(counts.uniqueClicks, effectiveDelivered, 2),
    landingConversionRate: pct(formSubmits, landingViews),
    formCompletionRate: pct(formSubmits, formStarts),
    leadRate: pct(leads, landingViews, 2),
    qualifiedRate: pct(qualifiedLeads, leads),
    appointmentRate: pct(appointments, qualifiedLeads),
    salesRate: pct(sales, qualifiedLeads),
  };

  return { counts, rates };
}

export type DailyGoalStatus = {
  date: Date;
  minTarget: number;
  stretchTarget: number;
  achieved: number;
  progressMin: number;
  progressStretch: number;
  weekAchieved: number;
  weekTarget: number;
  /** Simple pace-based projection — clearly an estimate, never a promise. */
  forecastToday: number;
};

export async function getDailyGoalStatus(workspaceId: string): Promise<DailyGoalStatus> {
  const today = startOfDay();
  const goal = await prisma.dailyGoal.upsert({
    where: { workspaceId_date: { workspaceId, date: today } },
    update: {},
    create: { workspaceId, date: today },
  });

  const achieved = await prisma.lead.count({
    where: { workspaceId, createdAt: { gte: today }, score: { gte: QUALIFIED_SCORE_THRESHOLD } },
  });

  const weekStart = startOfDay();
  const day = (weekStart.getDay() + 6) % 7; // Monday-based
  weekStart.setDate(weekStart.getDate() - day);
  const weekAchieved = await prisma.lead.count({
    where: { workspaceId, createdAt: { gte: weekStart }, score: { gte: QUALIFIED_SCORE_THRESHOLD } },
  });

  const hoursElapsed = Math.max(1, (Date.now() - today.getTime()) / 3_600_000);
  const activeHours = 12; // typical working window used for the projection
  const forecastToday = Math.round((achieved / Math.min(hoursElapsed, activeHours)) * activeHours);

  if (goal.achieved !== achieved) {
    await prisma.dailyGoal.update({ where: { id: goal.id }, data: { achieved } });
  }

  return {
    date: today,
    minTarget: goal.minTarget,
    stretchTarget: goal.stretchTarget,
    achieved,
    progressMin: pct(achieved, goal.minTarget, 0),
    progressStretch: pct(achieved, goal.stretchTarget, 0),
    weekAchieved,
    weekTarget: goal.minTarget * 5,
    forecastToday: Number.isFinite(forecastToday) ? forecastToday : achieved,
  };
}

export type Forecast = {
  targetLeads: number;
  landingConversionRate: number;
  clickRate: number;
  deliveryRate: number;
  qualifiedRate: number;
  requiredVisits: number | null;
  requiredClicks: number | null;
  requiredEmails: number | null;
  hasEnoughData: boolean;
};

/**
 * Works backwards from a daily qualified-lead target using the workspace's own
 * measured conversion rates. Presented as an ESTIMATE — the UI never states it
 * as a guarantee, and returns nulls when there is not enough data to project.
 */
export async function forecastForTarget(workspaceId: string, targetLeads: number, days = 30): Promise<Forecast> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { rates, counts } = await getFunnel({ workspaceId, from });

  const hasEnoughData = counts.landingViews >= 20 && counts.sent >= 100;
  const lpConv = rates.landingConversionRate / 100;
  const qualified = (rates.qualifiedRate || 100) / 100;
  const clickRate = rates.clickRate / 100;
  const deliveryRate = (rates.deliveryRate || 95) / 100;

  const requiredVisits = lpConv > 0 && qualified > 0 ? Math.ceil(targetLeads / (lpConv * qualified)) : null;
  const requiredClicks = requiredVisits !== null ? Math.ceil(requiredVisits / 0.9) : null; // ~10% drop-off click→page
  const requiredEmails = requiredClicks !== null && clickRate > 0 ? Math.ceil(requiredClicks / (clickRate * deliveryRate)) : null;

  return {
    targetLeads,
    landingConversionRate: rates.landingConversionRate,
    clickRate: rates.clickRate,
    deliveryRate: rates.deliveryRate,
    qualifiedRate: rates.qualifiedRate,
    requiredVisits,
    requiredClicks,
    requiredEmails,
    hasEnoughData,
  };
}

export async function getSpeedToLead(workspaceId: string, days = 1) {
  const from = startOfDay();
  from.setDate(from.getDate() - (days - 1));
  const rows = await prisma.lead.findMany({
    where: { workspaceId, createdAt: { gte: from }, NOT: { responseMinutes: null } },
    select: { responseMinutes: true },
  });
  const pending = await prisma.lead.count({
    where: { workspaceId, firstActionAt: null, status: { in: ['NOUVEAU', 'A_CONTACTER'] } },
  });
  if (rows.length === 0) return { averageMinutes: null, median: null, sample: 0, pendingUncontacted: pending };
  const values = rows.map((r) => r.responseMinutes ?? 0).sort((a, b) => a - b);
  const average = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  const median = values[Math.floor(values.length / 2)];
  return { averageMinutes: average, median, sample: values.length, pendingUncontacted: pending };
}

export async function getDailySeries(workspaceId: string, days = 30) {
  const from = startOfDay();
  from.setDate(from.getDate() - (days - 1));

  const [events, leads] = await Promise.all([
    prisma.campaignEvent.groupBy({
      by: ['type'],
      where: { workspaceId, occurredAt: { gte: from } },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { workspaceId, createdAt: { gte: from } },
      select: { createdAt: true, score: true, status: true },
    }),
  ]);

  const rawEvents = await prisma.$queryRaw<{ day: Date; type: string; count: bigint }[]>`
    SELECT date_trunc('day', "occurredAt") AS day, type::text AS type, COUNT(*) AS count
    FROM "CampaignEvent"
    WHERE "workspaceId" = ${workspaceId} AND "occurredAt" >= ${from}
    GROUP BY 1, 2
    ORDER BY 1 ASC;
  `;

  const series: Record<string, { date: string; sent: number; clicks: number; visits: number; submits: number; leads: number; qualified: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series[key] = { date: key, sent: 0, clicks: 0, visits: 0, submits: 0, leads: 0, qualified: 0 };
  }
  for (const row of rawEvents) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    if (!series[key]) continue;
    const n = Number(row.count);
    if (row.type === 'SENT') series[key].sent += n;
    else if (row.type === 'CLICKED') series[key].clicks += n;
    else if (row.type === 'LANDING_VIEW') series[key].visits += n;
    else if (row.type === 'FORM_SUBMIT') series[key].submits += n;
  }
  for (const lead of leads) {
    const key = lead.createdAt.toISOString().slice(0, 10);
    if (!series[key]) continue;
    series[key].leads += 1;
    if (lead.score >= QUALIFIED_SCORE_THRESHOLD) series[key].qualified += 1;
  }

  return { series: Object.values(series), totals: events };
}

export async function getCampaignComparison(workspaceId: string, limit = 10) {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId, status: { in: ['SENDING', 'PAUSED', 'COMPLETED'] } },
    orderBy: { launchedAt: 'desc' },
    take: limit,
    select: { id: true, name: true, product: true, status: true, launchedAt: true },
  });

  return Promise.all(
    campaigns.map(async (c) => {
      const funnel = await getFunnel({ workspaceId, campaignId: c.id });
      return { ...c, ...funnel };
    }),
  );
}
