import 'server-only';
import { prisma } from '@/lib/db';
import { runAi, parseAiJson } from '../providers/ai';
import { proposeSegment } from './segment-builder';
import { analyseCampaign } from './analyst';
import { getFunnel } from '../services/analytics';
import { QUALIFIED_SCORE_THRESHOLD, insuranceLabel } from '@/lib/domain';

/**
 * AI command area.
 *
 * The assistant reads through a controlled, workspace-scoped server-side tool
 * layer. It NEVER performs a destructive or outward-facing action directly:
 * anything that sends email, launches a campaign, deletes or bulk-suppresses is
 * returned as a `confirmation` the user must approve in the UI.
 */

export type AssistantAction =
  | { kind: 'NAVIGATE'; href: string; label: string }
  | { kind: 'CREATE_SEGMENT'; name: string; rules: unknown; explanations: string[] }
  | { kind: 'DRAFT_CAMPAIGN'; product: string; objective: string; name: string }
  | { kind: 'DRAFT_LANDING'; product: string; name: string };

export type AssistantConfirmation = {
  /** Present when the request implies a dangerous action. Never auto-executed. */
  action: string;
  description: string;
  href?: string;
};

export type AssistantResponse = {
  answer: string;
  data?: { columns: string[]; rows: (string | number)[][] };
  actions: AssistantAction[];
  confirmation?: AssistantConfirmation;
  simulated: boolean;
};

const DANGEROUS = [
  { re: /lance[rz]?\s+(la\s+)?campagne|démarre[rz]?\s+la\s+campagne|envoie[rz]?\s+les?\s+emails?/i, action: 'LAUNCH_CAMPAIGN', description: 'Lancer une campagne déclenche des envois réels vers les destinataires éligibles.' },
  { re: /supprime[rz]?\s+(le|les|ce|ces)?\s*contacts?/i, action: 'DELETE_CONTACTS', description: 'La suppression de contacts est définitive.' },
  { re: /supprime[rz]?\s+(la\s+)?campagne/i, action: 'DELETE_CAMPAIGN', description: 'La suppression d’une campagne efface son historique d’envoi.' },
  { re: /blocke[rz]?|désinscri[rs]|suppression\s+de\s+masse|liste\s+de\s+suppression/i, action: 'BULK_SUPPRESS', description: 'Une suppression de masse retire durablement des contacts de tous les envois.' },
];

const SYSTEM = `[TASK:ASSISTANT_INTENT]
Tu es l'assistant de la plateforme ASSURLEAD AI. Tu identifies l'intention de l'utilisateur.
Intentions : CREATE_SEGMENT, CREATE_CAMPAIGN, CREATE_LANDING, ANALYSE, LIST_UNCONTACTED, TOP_CAMPAIGNS, REWRITE_EMAIL, ANSWER.
Réponds UNIQUEMENT en JSON : {"intent":"...","prompt":"..."}`;

export async function runAssistant(workspaceId: string, prompt: string): Promise<AssistantResponse> {
  const danger = DANGEROUS.find((d) => d.re.test(prompt));

  const intentResponse = await runAi(workspaceId, {
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ prompt }) }],
    maxTokens: 300,
    temperature: 0,
  });
  const { intent } = parseAiJson<{ intent: string }>(intentResponse.text);
  const simulated = intentResponse.simulated;

  const confirmation: AssistantConfirmation | undefined = danger
    ? { action: danger.action, description: danger.description }
    : undefined;

  switch (intent) {
    case 'CREATE_SEGMENT': {
      const proposal = await proposeSegment(workspaceId, prompt);
      const { countSegment } = await import('../services/segments');
      const count = await countSegment(workspaceId, proposal.rules);
      return {
        answer: `J'ai traduit votre demande en ${proposal.rules.conditions.length} filtre(s). ${count} contact(s) correspondent actuellement. Vérifiez les filtres avant d'enregistrer — rien n'est créé tant que vous ne validez pas.`,
        actions: [{ kind: 'CREATE_SEGMENT', name: proposal.name, rules: proposal.rules, explanations: proposal.explanations }],
        confirmation,
        simulated,
      };
    }

    case 'CREATE_CAMPAIGN': {
      const product = detectProduct(prompt);
      return {
        answer: `Je peux préparer une campagne « ${insuranceLabel(product)} ». Elle sera créée en brouillon : aucun email n'est envoyé tant que vous ne cliquez pas explicitement sur « Lancer la campagne ».`,
        actions: [{ kind: 'DRAFT_CAMPAIGN', product, objective: 'QUOTE_REQUEST', name: suggestName(prompt, product) }],
        confirmation,
        simulated,
      };
    }

    case 'CREATE_LANDING': {
      const product = detectProduct(prompt);
      return {
        answer: `Je peux créer une landing page « ${insuranceLabel(product)} » à partir d'un modèle. Elle restera en brouillon jusqu'à publication.`,
        actions: [{ kind: 'DRAFT_LANDING', product, name: `Landing ${insuranceLabel(product)}` }],
        confirmation,
        simulated,
      };
    }

    case 'ANALYSE': {
      const analysis = await analyseCampaign(workspaceId, undefined, prompt);
      return {
        answer: [analysis.summary, '', ...analysis.findings.map((f) => `• ${f}`), '', 'Recommandations :', ...analysis.recommendations.map((r) => `→ ${r}`)].join('\n'),
        actions: [{ kind: 'NAVIGATE', href: '/analytics', label: 'Ouvrir Analytics' }],
        confirmation,
        simulated: analysis.simulated,
      };
    }

    case 'LIST_UNCONTACTED': {
      const minutes = Number(/(\d{1,3})\s*minutes?/.exec(prompt)?.[1] ?? 20);
      const cutoff = new Date(Date.now() - minutes * 60_000);
      const leads = await prisma.lead.findMany({
        where: { workspaceId, firstActionAt: null, createdAt: { lte: cutoff }, status: { in: ['NOUVEAU', 'A_CONTACTER'] } },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: { owner: { select: { name: true } } },
      });
      return {
        answer: leads.length
          ? `${leads.length} lead(s) sans action commerciale depuis plus de ${minutes} minutes.`
          : `Aucun lead en attente depuis plus de ${minutes} minutes. 👍`,
        data: {
          columns: ['Lead', 'Produit', 'Score', 'Attente (min)', 'Commercial'],
          rows: leads.map((l) => [
            [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || '—',
            l.product,
            l.score,
            Math.round((Date.now() - l.createdAt.getTime()) / 60_000),
            l.owner?.name ?? 'Non assigné',
          ]),
        },
        actions: [{ kind: 'NAVIGATE', href: '/leads?filter=uncontacted', label: 'Voir les leads' }],
        confirmation,
        simulated,
      };
    }

    case 'TOP_CAMPAIGNS': {
      const campaigns = await prisma.campaign.findMany({
        where: { workspaceId, status: { in: ['SENDING', 'PAUSED', 'COMPLETED'] } },
        take: 8,
        orderBy: { launchedAt: 'desc' },
        select: { id: true, name: true, product: true },
      });
      const rows: (string | number)[][] = [];
      for (const c of campaigns) {
        const f = await getFunnel({ workspaceId, campaignId: c.id });
        rows.push([c.name, c.product, f.counts.sent, f.counts.qualifiedLeads, `${f.rates.landingConversionRate} %`]);
      }
      rows.sort((a, b) => Number(b[3]) - Number(a[3]));
      return {
        answer: rows.length ? 'Campagnes classées par nombre de leads qualifiés générés.' : 'Aucune campagne lancée pour le moment.',
        data: { columns: ['Campagne', 'Produit', 'Envoyés', 'Leads qualifiés', 'Conv. LP'], rows },
        actions: [{ kind: 'NAVIGATE', href: '/campaigns', label: 'Ouvrir les campagnes' }],
        confirmation,
        simulated,
      };
    }

    default: {
      const funnel = await getFunnel({ workspaceId });
      const qualifiedToday = await prisma.lead.count({
        where: { workspaceId, createdAt: { gte: startOfToday() }, score: { gte: QUALIFIED_SCORE_THRESHOLD } },
      });
      return {
        answer: [
          `Aujourd'hui : ${qualifiedToday} lead(s) qualifié(s).`,
          `Sur l'ensemble de la période : ${funnel.counts.sent} email(s) envoyé(s), ${funnel.counts.uniqueClicks} clic(s) unique(s), ${funnel.counts.formSubmits} formulaire(s) soumis, ${funnel.counts.qualifiedLeads} lead(s) qualifié(s).`,
          '',
          'Vous pouvez me demander : créer un segment, préparer une campagne, analyser une baisse de conversion, ou lister les leads non contactés.',
        ].join('\n'),
        actions: [{ kind: 'NAVIGATE', href: '/dashboard', label: 'Ouvrir le tableau de bord' }],
        confirmation,
        simulated,
      };
    }
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function detectProduct(prompt: string): 'AUTO' | 'MOTO' | 'HABITATION' | 'SANTE' | 'PREVOYANCE' | 'RC_PRO' | 'AUTRE' {
  const p = prompt.toLowerCase();
  if (/moto|scooter/.test(p)) return 'MOTO';
  if (/habitation|maison|logement/.test(p)) return 'HABITATION';
  if (/santé|sante|mutuelle/.test(p)) return 'SANTE';
  if (/prévoyance|prevoyance/.test(p)) return 'PREVOYANCE';
  if (/rc pro|responsabilité/.test(p)) return 'RC_PRO';
  if (/auto|voiture|véhicule/.test(p)) return 'AUTO';
  return 'AUTRE';
}

function suggestName(prompt: string, product: string): string {
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const found = months.find((m) => prompt.toLowerCase().includes(m));
  const label = insuranceLabel(product as 'AUTO');
  const month = found ?? months[new Date().getMonth()];
  return `${label} — ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}
