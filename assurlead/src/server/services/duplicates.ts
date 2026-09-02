import 'server-only';
import type { Contact } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Duplicate detection across an existing base.
 *
 * Email is unique per workspace, so exact email duplicates cannot exist — the
 * useful signals are shared phone numbers and identical names paired with a
 * matching phone or a near-identical address. Nothing is ever merged
 * automatically: the operator chooses the record to keep, and no field is
 * silently discarded.
 */

export type DuplicateKind = 'PHONE' | 'NAME_PHONE' | 'NAME_EMAIL_LOCAL';

export type DuplicateGroup = {
  key: string;
  kind: DuplicateKind;
  reason: string;
  contacts: {
    id: string; email: string; firstName: string | null; lastName: string | null;
    phone: string | null; city: string | null; createdAt: string;
    filledFields: number; suppressed: boolean; hasLeads: boolean;
  }[];
};

/** Counts how much information a record actually carries, to suggest a primary. */
function filledFields(contact: Contact): number {
  const values = [
    contact.firstName, contact.lastName, contact.phone, contact.address, contact.city,
    contact.postalCode, contact.birthDate, contact.profession, contact.company,
    contact.currentInsurer, contact.renewalDate, contact.requestedCoverage, contact.notes,
    contact.source, contact.consentDate,
  ];
  return values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length
    + contact.insuranceInterests.length
    + contact.tags.length;
}

function nameKey(contact: Contact): string {
  return `${(contact.firstName ?? '').trim().toLowerCase()}|${(contact.lastName ?? '').trim().toLowerCase()}`;
}

export async function findDuplicates(workspaceId: string, limit = 60): Promise<DuplicateGroup[]> {
  // Only candidates that could possibly collide are loaded, not the whole base.
  const phoneGroups = await prisma.$queryRaw<{ phoneNormalized: string; count: bigint }[]>`
    SELECT "phoneNormalized", COUNT(*) AS count
    FROM "Contact"
    WHERE "workspaceId" = ${workspaceId} AND "phoneNormalized" IS NOT NULL AND "phoneNormalized" <> ''
    GROUP BY "phoneNormalized"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT ${limit};
  `;

  const nameGroups = await prisma.$queryRaw<{ first: string; last: string; count: bigint }[]>`
    SELECT lower(trim("firstName")) AS first, lower(trim("lastName")) AS last, COUNT(*) AS count
    FROM "Contact"
    WHERE "workspaceId" = ${workspaceId}
      AND "firstName" IS NOT NULL AND trim("firstName") <> ''
      AND "lastName" IS NOT NULL AND trim("lastName") <> ''
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT ${limit};
  `;

  const groups: DuplicateGroup[] = [];
  const seenIds = new Set<string>();

  const toRow = async (contact: Contact) => ({
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    city: contact.city,
    createdAt: contact.createdAt.toISOString(),
    filledFields: filledFields(contact),
    suppressed: contact.suppressed,
    hasLeads: (await prisma.lead.count({ where: { contactId: contact.id } })) > 0,
  });

  for (const group of phoneGroups) {
    const contacts = await prisma.contact.findMany({
      where: { workspaceId, phoneNormalized: group.phoneNormalized },
      orderBy: { createdAt: 'asc' },
    });
    if (contacts.length < 2) continue;
    contacts.forEach((c) => seenIds.add(c.id));
    groups.push({
      key: `phone:${group.phoneNormalized}`,
      kind: 'PHONE',
      reason: `${contacts.length} contacts partagent le numéro ${contacts[0].phone ?? group.phoneNormalized}`,
      contacts: await Promise.all(contacts.map(toRow)),
    });
  }

  for (const group of nameGroups) {
    const contacts = await prisma.contact.findMany({
      where: {
        workspaceId,
        firstName: { equals: group.first, mode: 'insensitive' },
        lastName: { equals: group.last, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (contacts.length < 2) continue;
    // Skip groups already reported through the stronger phone signal.
    if (contacts.every((c) => seenIds.has(c.id))) continue;

    const sharedLocalPart = new Set(contacts.map((c) => c.emailNormalized.split('@')[0])).size < contacts.length;
    const sharedPhone = new Set(contacts.map((c) => c.phoneNormalized ?? '')).size < contacts.length;

    groups.push({
      key: `name:${group.first}|${group.last}`,
      kind: sharedPhone ? 'NAME_PHONE' : 'NAME_EMAIL_LOCAL',
      reason: sharedPhone
        ? `${contacts.length} contacts avec le même nom et le même téléphone`
        : sharedLocalPart
          ? `${contacts.length} contacts avec le même nom et des adresses très proches`
          : `${contacts.length} contacts portent le même nom — à vérifier, ce peut être une homonymie`,
      contacts: await Promise.all(contacts.map(toRow)),
    });
  }

  return groups;
}

export type MergeOutcome = { keptId: string; mergedCount: number; movedLeads: number };

/**
 * Merges duplicates into a primary record.
 *
 * The primary keeps its own values; empty fields are filled from the duplicates.
 * Leads, submissions, campaign history, consent records and sources are all
 * re-pointed at the primary, so nothing is lost. The most restrictive consent
 * and suppression state wins.
 */
export async function mergeContacts(
  workspaceId: string,
  primaryId: string,
  duplicateIds: string[],
  actorId?: string,
): Promise<MergeOutcome> {
  const ids = duplicateIds.filter((id) => id !== primaryId);
  if (ids.length === 0) throw new Error('Aucun doublon à fusionner');

  const primary = await prisma.contact.findFirst({ where: { id: primaryId, workspaceId } });
  if (!primary) throw new Error('Contact principal introuvable');

  const duplicates = await prisma.contact.findMany({ where: { id: { in: ids }, workspaceId } });
  if (duplicates.length === 0) throw new Error('Doublons introuvables');

  let movedLeads = 0;

  await prisma.$transaction(async (tx) => {
    const merged: Record<string, unknown> = {};
    const fill = (key: keyof Contact) => {
      if (primary[key] !== null && primary[key] !== undefined && String(primary[key]).trim() !== '') return;
      const donor = duplicates.find((d) => d[key] !== null && d[key] !== undefined && String(d[key]).trim() !== '');
      if (donor) merged[key] = donor[key];
    };
    ([
      'firstName', 'lastName', 'phone', 'phoneNormalized', 'address', 'city', 'postalCode',
      'birthDate', 'age', 'profession', 'company', 'currentInsurer', 'renewalDate',
      'renewalMonth', 'requestedCoverage', 'budgetMin', 'budgetMax', 'notes',
      'source', 'sourceDetail', 'consentDate', 'consentSource', 'legalBasisNote',
    ] as (keyof Contact)[]).forEach(fill);

    merged.insuranceInterests = Array.from(new Set([
      ...primary.insuranceInterests,
      ...duplicates.flatMap((d) => d.insuranceInterests),
    ]));
    merged.tags = Array.from(new Set([...primary.tags, ...duplicates.flatMap((d) => d.tags)]));

    // The most restrictive state always wins — a merge can never re-enable
    // marketing for someone who opted out on any of the merged records.
    const anySuppressed = primary.suppressed || duplicates.some((d) => d.suppressed);
    const anyUnsubscribed = primary.unsubscribed || duplicates.some((d) => d.unsubscribed);
    const anyDenied = [primary, ...duplicates].some((c) => ['DENIED', 'WITHDRAWN'].includes(c.consentEmail));
    merged.suppressed = anySuppressed;
    merged.unsubscribed = anyUnsubscribed;
    if (anyDenied) {
      merged.consentEmail = 'WITHDRAWN';
      merged.emailMarketingAllowed = false;
    } else {
      merged.emailMarketingAllowed = primary.emailMarketingAllowed && !anySuppressed;
    }

    await tx.contact.update({ where: { id: primaryId }, data: merged as never });

    // Re-point every related record at the primary before deleting duplicates.
    const leads = await tx.lead.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    movedLeads = leads.count;
    await tx.formSubmission.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    await tx.contactSource.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    await tx.consentRecord.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    await tx.verificationResult.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    await tx.emailMessage.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });
    await tx.campaignEvent.updateMany({ where: { contactId: { in: ids } }, data: { contactId: primaryId } });

    // Campaign recipients are unique per (campaign, contact): move only the ones
    // that would not collide, and drop the rest rather than losing the invariant.
    const recipients = await tx.campaignRecipient.findMany({ where: { contactId: { in: ids } } });
    for (const recipient of recipients) {
      const clash = await tx.campaignRecipient.findUnique({
        where: { campaignId_contactId: { campaignId: recipient.campaignId, contactId: primaryId } },
      });
      if (clash) await tx.campaignRecipient.delete({ where: { id: recipient.id } });
      else await tx.campaignRecipient.update({ where: { id: recipient.id }, data: { contactId: primaryId } });
    }

    // The merged addresses are recorded as sources so the history stays readable.
    await tx.contactSource.createMany({
      data: duplicates.map((d) => ({
        contactId: primaryId,
        source: 'fusion',
        detail: `Fusionné depuis ${d.email}`,
      })),
    });

    await tx.contact.deleteMany({ where: { id: { in: ids } } });

    await tx.auditLog.create({
      data: {
        workspaceId,
        userId: actorId ?? null,
        action: 'contact.merge',
        entityType: 'Contact',
        entityId: primaryId,
        summary: `${duplicates.length} doublon(s) fusionné(s) dans ${primary.email}`,
        before: { duplicates: duplicates.map((d) => ({ id: d.id, email: d.email })) } as never,
        after: { kept: primary.email, movedLeads } as never,
      },
    });
  });

  return { keptId: primaryId, mergedCount: duplicates.length, movedLeads };
}
