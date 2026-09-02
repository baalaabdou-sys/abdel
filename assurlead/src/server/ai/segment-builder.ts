import 'server-only';
import { runAi, parseAiJson } from '../providers/ai';
import { segmentRulesSchema, SEGMENT_FIELDS, type SegmentRules } from '../services/segments';

const SYSTEM = `[TASK:SEGMENT_RULES]
Tu convertis une instruction en français en filtres structurés pour une base de contacts assurance.

Champs disponibles : ${SEGMENT_FIELDS.map((f) => `${f.key} (${f.operators.join('|')})`).join(', ')}.
Types d'assurance : AUTO, MOTO, HABITATION, SANTE, PREVOYANCE, EMPRUNTEUR, PROFESSIONNELLE, DECENNALE, RC_PRO, AUTRE.

Ne crée aucun filtre que l'instruction ne justifie pas. N'exécute aucune action.
Réponds UNIQUEMENT en JSON : {"name": "...", "rules": {"match":"AND","conditions":[{"field","operator","value"}]}, "explanations": ["..."]}`;

export type AiSegmentProposal = {
  name: string;
  rules: SegmentRules;
  explanations: string[];
  simulated: boolean;
};

/**
 * Produces a *proposal* only. The caller always shows the resulting filters to
 * the user before anything is persisted — the AI never writes to the database.
 */
export async function proposeSegment(workspaceId: string, prompt: string): Promise<AiSegmentProposal> {
  const response = await runAi(workspaceId, {
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ prompt }) }],
    maxTokens: 1200,
    temperature: 0.2,
  });
  const parsed = parseAiJson<{ name?: string; rules?: unknown; explanations?: string[] }>(response.text);
  const rules = segmentRulesSchema.safeParse(parsed.rules);
  return {
    name: (parsed.name ?? prompt).slice(0, 80),
    rules: rules.success ? rules.data : { match: 'AND', conditions: [] },
    explanations: parsed.explanations ?? [],
    simulated: response.simulated,
  };
}
