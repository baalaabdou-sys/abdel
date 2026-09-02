import 'server-only';
import { prisma } from '@/lib/db';
import { runAi, parseAiJson } from '../providers/ai';
import { getFunnel } from '../services/analytics';

const SYSTEM = `[TASK:PERFORMANCE_ANALYSIS]
Tu analyses la performance d'une campagne d'emailing assurance.

Tu reçois des MÉTRIQUES RÉELLES issues de la base de données. Tu ne dois JAMAIS
inventer de chiffre : n'utilise que les valeurs fournies. Si une métrique
manque, dis qu'elle n'est pas disponible.

Identifie l'étape de l'entonnoir où la perte est la plus importante, puis donne
des recommandations concrètes et hiérarchisées.

Réponds UNIQUEMENT en JSON : {"summary","findings":["..."],"recommendations":["..."],"bottleneck"}`;

export type AnalysisResult = {
  summary: string;
  findings: string[];
  recommendations: string[];
  bottleneck: string;
  metrics: Record<string, number>;
  simulated: boolean;
};

/**
 * Analyses real stored metrics. The metric payload handed to the model is
 * computed from CampaignEvent/Lead rows — the model is never asked to recall or
 * invent numbers.
 */
export async function analyseCampaign(workspaceId: string, campaignId?: string, question?: string): Promise<AnalysisResult> {
  const scope = campaignId ? { workspaceId, campaignId } : { workspaceId };
  const funnel = await getFunnel(scope);

  let previous: Awaited<ReturnType<typeof getFunnel>> | null = null;
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { product: true, launchedAt: true } });
    const prior = campaign?.launchedAt
      ? await prisma.campaign.findFirst({
          where: { workspaceId, product: campaign.product, launchedAt: { lt: campaign.launchedAt }, status: { in: ['COMPLETED', 'SENDING', 'PAUSED'] } },
          orderBy: { launchedAt: 'desc' },
          select: { id: true },
        })
      : null;
    if (prior) previous = await getFunnel({ workspaceId, campaignId: prior.id });
  }

  const metrics = {
    ...funnel.rates,
    sent: funnel.counts.sent,
    delivered: funnel.counts.delivered,
    uniqueClicks: funnel.counts.uniqueClicks,
    landingViews: funnel.counts.landingViews,
    formSubmits: funnel.counts.formSubmits,
    leads: funnel.counts.leads,
    qualifiedLeads: funnel.counts.qualifiedLeads,
    appointments: funnel.counts.appointments,
    sales: funnel.counts.sales,
  };

  const response = await runAi(workspaceId, {
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        question: question ?? 'Analyse la performance de cette campagne.',
        metrics,
        counts: funnel.counts,
        previousPeriod: previous ? { ...previous.rates, ...previous.counts } : null,
      }),
    }],
    maxTokens: 1400,
    temperature: 0.2,
  });

  const parsed = parseAiJson<Omit<AnalysisResult, 'metrics' | 'simulated'>>(response.text);
  return {
    summary: parsed.summary ?? '',
    findings: parsed.findings ?? [],
    recommendations: parsed.recommendations ?? [],
    bottleneck: parsed.bottleneck ?? 'unknown',
    metrics,
    simulated: response.simulated,
  };
}
