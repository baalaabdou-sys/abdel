import { z } from 'zod';

/**
 * Segment rule vocabulary shared by the server rule engine and the builder UI.
 * Kept free of server-only imports so the client can render the same catalogue
 * the server compiles.
 */

export const SEGMENT_OPERATORS = [
  'equals', 'not_equals', 'contains', 'starts_with', 'in', 'not_in',
  'has', 'has_any', 'between', 'gte', 'lte', 'within_days', 'is_true',
  'is_false', 'is_set', 'is_empty', 'never_contacted', 'clicked_campaign',
  'submitted_form', 'in_month',
] as const;

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(SEGMENT_OPERATORS),
  value: z.unknown().optional(),
});

export const segmentRulesSchema = z.object({
  match: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(conditionSchema).max(30).default([]),
});

export type SegmentCondition = z.infer<typeof conditionSchema>;
export type SegmentRules = z.infer<typeof segmentRulesSchema>;

export const SEGMENT_FIELDS: {
  key: string; label: string; operators: string[];
  type: 'text' | 'number' | 'enum' | 'date' | 'boolean' | 'multi';
}[] = [
  { key: 'age', label: 'Âge', operators: ['between', 'gte', 'lte'], type: 'number' },
  { key: 'city', label: 'Ville', operators: ['equals', 'contains', 'in'], type: 'text' },
  { key: 'postalCode', label: 'Code postal', operators: ['equals', 'starts_with', 'in'], type: 'text' },
  { key: 'country', label: 'Pays', operators: ['equals'], type: 'text' },
  { key: 'insuranceInterests', label: 'Type d’assurance', operators: ['has', 'has_any'], type: 'multi' },
  { key: 'currentInsurer', label: 'Assureur actuel', operators: ['equals', 'contains', 'is_set', 'is_empty'], type: 'text' },
  { key: 'renewalDate', label: 'Date d’échéance', operators: ['within_days', 'gte', 'lte', 'is_set'], type: 'date' },
  { key: 'renewalMonth', label: 'Mois d’échéance', operators: ['equals', 'in'], type: 'number' },
  { key: 'profession', label: 'Profession', operators: ['equals', 'contains'], type: 'text' },
  { key: 'status', label: 'Client / Prospect', operators: ['equals'], type: 'enum' },
  { key: 'verificationStatus', label: 'Vérification email', operators: ['equals', 'in'], type: 'enum' },
  { key: 'consentEmail', label: 'Consentement email', operators: ['equals', 'in'], type: 'enum' },
  { key: 'emailMarketingAllowed', label: 'Marketing email autorisé', operators: ['is_true', 'is_false'], type: 'boolean' },
  { key: 'tags', label: 'Tags', operators: ['has', 'has_any'], type: 'multi' },
  { key: 'source', label: 'Source', operators: ['equals', 'contains', 'is_set', 'is_empty'], type: 'text' },
  { key: 'leadScoreHint', label: 'Score de lead', operators: ['gte', 'lte', 'between'], type: 'number' },
  { key: 'campaignHistory', label: 'Historique campagne', operators: ['never_contacted', 'clicked_campaign', 'submitted_form'], type: 'text' },
  { key: 'createdAt', label: 'Date d’ajout', operators: ['within_days', 'gte', 'lte'], type: 'date' },
];
