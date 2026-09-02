import type { Prisma } from '@prisma/client';

export type ContactFilters = {
  q?: string;
  verification?: string;
  consent?: string;
  product?: string;
  city?: string;
  status?: string;
  suppressed?: string;
  tag?: string;
};

/** Builds the workspace-scoped filter used by the contacts list and exports. */
export function contactWhere(workspaceId: string, filters: ContactFilters): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { workspaceId };
  const and: Prisma.ContactWhereInput[] = [];

  if (filters.q) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { emailNormalized: { contains: q.toLowerCase() } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { city: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
  if (filters.verification && filters.verification !== 'all') and.push({ verificationStatus: filters.verification as 'VALID' });
  if (filters.consent && filters.consent !== 'all') and.push({ consentEmail: filters.consent as 'GRANTED' });
  if (filters.product && filters.product !== 'all') and.push({ insuranceInterests: { has: filters.product as 'AUTO' } });
  if (filters.city) and.push({ city: { equals: filters.city, mode: 'insensitive' } });
  if (filters.status && filters.status !== 'all') and.push({ status: filters.status as 'PROSPECT' });
  if (filters.suppressed === 'yes') and.push({ suppressed: true });
  if (filters.suppressed === 'no') and.push({ suppressed: false });
  if (filters.tag) and.push({ tags: { has: filters.tag } });

  if (and.length) where.AND = and;
  return where;
}
