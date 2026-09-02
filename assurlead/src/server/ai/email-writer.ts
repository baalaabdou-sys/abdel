import 'server-only';
import type { CampaignObjective, InsuranceType } from '@prisma/client';
import { runAi, parseAiJson } from '../providers/ai';
import { insuranceLabel, objectiveLabel } from '@/lib/domain';
import type { EmailStyle } from '@/lib/email-styles';

export { EMAIL_STYLES } from '@/lib/email-styles';
export type { EmailStyle } from '@/lib/email-styles';

export type GeneratedEmail = {
  subject: string;
  previewText: string;
  bodyText: string;
  ctaLabel: string;
  alternative: { subject: string; previewText: string; bodyText: string; ctaLabel: string };
  followUp?: { subject: string; bodyText: string; ctaLabel: string };
  notes: string[];
  simulated: boolean;
};

const SYSTEM = `[TASK:EMAIL_COPY]
Tu rédiges des emails marketing pour un courtier en assurance en France.

Règles absolues :
- N'invente JAMAIS de prix, de pourcentage d'économie, de garantie précise, de délai de remboursement ni d'argument réglementaire. Ces éléments ne peuvent venir que de données validées fournies dans le contexte.
- Pas de fausse urgence, de rareté fictive, de "dernière chance", ni de promesse de résultat.
- Pas d'affirmation du type "vous allez économiser X €".
- Ton sobre, clair, utile. Phrases courtes. Vouvoiement.
- Utilise uniquement les variables : {{first_name}}, {{last_name}}, {{city}}, {{insurance_type}}, {{renewal_date}}, {{current_insurer}}.
- Place le marqueur [[CTA]] sur sa propre ligne à l'endroit du bouton d'appel à l'action.

Réponds UNIQUEMENT en JSON avec les clés :
{"subject","previewText","bodyText","ctaLabel","alternative":{"subject","previewText","bodyText","ctaLabel"},"followUp":{"subject","bodyText","ctaLabel"},"notes":[]}`;

export async function generateCampaignEmail(params: {
  workspaceId: string;
  companyName: string;
  product: InsuranceType;
  objective: CampaignObjective;
  style: EmailStyle;
  audienceDescription?: string;
  extraInstructions?: string;
  locale?: 'fr' | 'en';
}): Promise<GeneratedEmail> {
  const context = {
    company: params.companyName,
    product: params.product,
    productLabel: insuranceLabel(params.product, params.locale ?? 'fr'),
    objective: params.objective,
    objectiveLabel: objectiveLabel(params.objective, params.locale ?? 'fr'),
    style: params.style,
    audience: params.audienceDescription ?? '',
    instructions: params.extraInstructions ?? '',
    locale: params.locale ?? 'fr',
  };

  const response = await runAi(params.workspaceId, {
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(context) }],
    maxTokens: 2200,
    temperature: 0.5,
    jsonSchemaHint: 'GeneratedEmail',
  });

  const parsed = parseAiJson<Omit<GeneratedEmail, 'simulated'>>(response.text);
  return { ...parsed, notes: parsed.notes ?? [], simulated: response.simulated };
}

const REWRITE_SYSTEM = `[TASK:EMAIL_COPY]
Tu réécris un email marketing assurance existant selon une consigne.
Applique les mêmes règles : aucun chiffre inventé, aucune promesse, ton sobre, variables autorisées uniquement.
Réponds UNIQUEMENT en JSON : {"subject","previewText","bodyText","ctaLabel","alternative":{...},"notes":[]}`;

export async function rewriteEmail(params: {
  workspaceId: string;
  subject: string;
  bodyText: string;
  instruction: string;
  productLabel: string;
}): Promise<GeneratedEmail> {
  const response = await runAi(params.workspaceId, {
    system: REWRITE_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(params) }],
    maxTokens: 2200,
    temperature: 0.6,
  });
  const parsed = parseAiJson<Omit<GeneratedEmail, 'simulated'>>(response.text);
  return { ...parsed, notes: parsed.notes ?? [], simulated: response.simulated };
}
