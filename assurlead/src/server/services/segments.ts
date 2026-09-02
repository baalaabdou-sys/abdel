import 'server-only';
import type { Prisma, InsuranceType, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';

/**
 * Segment rule engine. Rules are stored as JSON and compiled to a Prisma
 * `where` clause, so evaluation happens in PostgreSQL — a 100k-contact segment
 * is never materialised in Node or in the browser.
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

export const SEGMENT_FIELDS: { key: string; label: string; operators: string[]; type: 'text' | 'number' | 'enum' | 'date' | 'boolean' | 'multi' }[] = [
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

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function conditionToWhere(c: SegmentCondition): Prisma.ContactWhereInput | null {
  const v = c.value;
  const asString = () => String(v ?? '');
  const asNumber = () => Number(v ?? 0);
  const asArray = () => (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined && x !== null && x !== '');

  switch (c.field) {
    case 'age':
      if (c.operator === 'between' && Array.isArray(v)) return { age: { gte: Number(v[0]), lte: Number(v[1]) } };
      if (c.operator === 'gte') return { age: { gte: asNumber() } };
      if (c.operator === 'lte') return { age: { lte: asNumber() } };
      return null;

    case 'city':
    case 'currentInsurer':
    case 'profession':
    case 'source':
    case 'postalCode':
    case 'country': {
      const key = c.field as 'city';
      if (c.operator === 'equals') return { [key]: { equals: asString(), mode: 'insensitive' } } as Prisma.ContactWhereInput;
      if (c.operator === 'contains') return { [key]: { contains: asString(), mode: 'insensitive' } } as Prisma.ContactWhereInput;
      if (c.operator === 'starts_with') return { [key]: { startsWith: asString(), mode: 'insensitive' } } as Prisma.ContactWhereInput;
      if (c.operator === 'in') return { [key]: { in: asArray().map(String) } } as Prisma.ContactWhereInput;
      if (c.operator === 'is_set') return { NOT: { [key]: null } } as Prisma.ContactWhereInput;
      if (c.operator === 'is_empty') return { [key]: null } as Prisma.ContactWhereInput;
      return null;
    }

    case 'insuranceInterests':
      if (c.operator === 'has') return { insuranceInterests: { has: asString() as InsuranceType } };
      if (c.operator === 'has_any') return { insuranceInterests: { hasSome: asArray().map(String) as InsuranceType[] } };
      return null;

    case 'tags':
      if (c.operator === 'has') return { tags: { has: asString() } };
      if (c.operator === 'has_any') return { tags: { hasSome: asArray().map(String) } };
      return null;

    case 'renewalDate':
      if (c.operator === 'within_days') return { renewalDate: { gte: new Date(), lte: daysFromNow(asNumber() || 60) } };
      if (c.operator === 'gte') return { renewalDate: { gte: new Date(asString()) } };
      if (c.operator === 'lte') return { renewalDate: { lte: new Date(asString()) } };
      if (c.operator === 'is_set') return { NOT: { renewalDate: null } };
      return null;

    case 'renewalMonth':
      if (c.operator === 'equals') return { renewalMonth: asNumber() };
      if (c.operator === 'in') return { renewalMonth: { in: asArray().map(Number) } };
      return null;

    case 'createdAt':
      if (c.operator === 'within_days') {
        const d = new Date();
        d.setDate(d.getDate() - (asNumber() || 30));
        return { createdAt: { gte: d } };
      }
      if (c.operator === 'gte') return { createdAt: { gte: new Date(asString()) } };
      if (c.operator === 'lte') return { createdAt: { lte: new Date(asString()) } };
      return null;

    case 'status':
      return { status: asString() as 'PROSPECT' };

    case 'verificationStatus':
      if (c.operator === 'in') return { verificationStatus: { in: asArray().map(String) as VerificationStatus[] } };
      return { verificationStatus: asString() as VerificationStatus };

    case 'consentEmail':
      if (c.operator === 'in') return { consentEmail: { in: asArray().map(String) as ('UNKNOWN')[] } };
      return { consentEmail: asString() as 'UNKNOWN' };

    case 'emailMarketingAllowed':
      return { emailMarketingAllowed: c.operator === 'is_true' };

    case 'leadScoreHint':
      if (c.operator === 'between' && Array.isArray(v)) return { leadScoreHint: { gte: Number(v[0]), lte: Number(v[1]) } };
      if (c.operator === 'gte') return { leadScoreHint: { gte: asNumber() } };
      if (c.operator === 'lte') return { leadScoreHint: { lte: asNumber() } };
      return null;

    case 'campaignHistory':
      if (c.operator === 'never_contacted') return { recipients: { none: { status: 'SENT' } } };
      if (c.operator === 'clicked_campaign') {
        const campaignId = asString();
        return { events: { some: { type: 'CLICKED', ...(campaignId ? { campaignId } : {}) } } };
      }
      if (c.operator === 'submitted_form') {
        const campaignId = asString();
        return { submissions: { some: campaignId ? { campaignId } : {} } };
      }
      return null;

    default:
      // Custom field lookup: `custom:<key>`
      if (c.field.startsWith('custom:')) {
        const key = c.field.slice(7);
        return { customData: { path: [key], equals: v as Prisma.InputJsonValue } };
      }
      return null;
  }
}

/** Compiles stored rules into a workspace-scoped Prisma filter. */
export function buildSegmentWhere(workspaceId: string, rules: unknown): Prisma.ContactWhereInput {
  const parsed = segmentRulesSchema.safeParse(rules);
  const base: Prisma.ContactWhereInput = { workspaceId };
  if (!parsed.success || parsed.data.conditions.length === 0) return base;

  const clauses = parsed.data.conditions
    .map(conditionToWhere)
    .filter((w): w is Prisma.ContactWhereInput => w !== null);
  if (clauses.length === 0) return base;

  return parsed.data.match === 'OR' ? { workspaceId, OR: clauses } : { workspaceId, AND: clauses };
}

export async function countSegment(workspaceId: string, rules: unknown): Promise<number> {
  return prisma.contact.count({ where: buildSegmentWhere(workspaceId, rules) });
}

/** Resolves a segment (static or dynamic) into a contact-id filter. */
export async function segmentContactWhere(workspaceId: string, segmentId: string): Promise<Prisma.ContactWhereInput | null> {
  const segment = await prisma.segment.findFirst({ where: { id: segmentId, workspaceId } });
  if (!segment) return null;
  if (segment.kind === 'STATIC') {
    return { workspaceId, segmentLinks: { some: { segmentId } } };
  }
  return buildSegmentWhere(workspaceId, segment.rules);
}

export async function refreshSegmentCount(workspaceId: string, segmentId: string) {
  const where = await segmentContactWhere(workspaceId, segmentId);
  if (!where) return 0;
  const count = await prisma.contact.count({ where });
  await prisma.segment.update({ where: { id: segmentId }, data: { cachedCount: count, countedAt: new Date() } });
  return count;
}
