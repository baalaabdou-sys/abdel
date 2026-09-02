'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeEmail, normalizePhone, isSyntacticallyValidEmail, ageFromBirthDate } from '@/lib/utils';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { enqueue } from '../services/queue';
import { addSuppression } from '../services/suppression';
import { INSURANCE_TYPES } from '@/lib/domain';

const insuranceEnum = z.enum(INSURANCE_TYPES as [string, ...string[]]);

const contactSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  firstName: z.string().max(80).optional().nullable(),
  lastName: z.string().max(80).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(12).optional().nullable(),
  country: z.string().max(2).default('FR'),
  birthDate: z.string().optional().nullable(),
  profession: z.string().max(100).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  status: z.enum(['PROSPECT', 'CUSTOMER', 'FORMER_CUSTOMER']).default('PROSPECT'),
  insuranceInterests: z.array(insuranceEnum).default([]),
  currentInsurer: z.string().max(120).optional().nullable(),
  renewalDate: z.string().optional().nullable(),
  requestedCoverage: z.string().max(300).optional().nullable(),
  budgetMin: z.coerce.number().int().min(0).optional().nullable(),
  budgetMax: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(40)).default([]),
  source: z.string().max(120).optional().nullable(),
  sourceDetail: z.string().max(200).optional().nullable(),
  consentEmail: z.enum(['UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN']).default('UNKNOWN'),
  consentPhone: z.enum(['UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN']).default('UNKNOWN'),
  consentDate: z.string().optional().nullable(),
  consentSource: z.string().max(160).optional().nullable(),
  legalBasisNote: z.string().max(500).optional().nullable(),
  emailMarketingAllowed: z.boolean().default(false),
  phoneContactAllowed: z.boolean().default(false),
});

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildContactData(input: z.infer<typeof contactSchema>) {
  const birthDate = toDate(input.birthDate);
  const renewalDate = toDate(input.renewalDate);
  return {
    email: input.email.trim(),
    emailNormalized: normalizeEmail(input.email),
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    phone: input.phone || null,
    phoneNormalized: normalizePhone(input.phone),
    address: input.address || null,
    city: input.city || null,
    postalCode: input.postalCode || null,
    country: input.country || 'FR',
    birthDate,
    age: ageFromBirthDate(birthDate),
    profession: input.profession || null,
    company: input.company || null,
    status: input.status,
    insuranceInterests: input.insuranceInterests as never,
    currentInsurer: input.currentInsurer || null,
    renewalDate,
    renewalMonth: renewalDate ? renewalDate.getMonth() + 1 : null,
    requestedCoverage: input.requestedCoverage || null,
    budgetMin: input.budgetMin ?? null,
    budgetMax: input.budgetMax ?? null,
    notes: input.notes || null,
    tags: input.tags,
    source: input.source || null,
    sourceDetail: input.sourceDetail || null,
    consentEmail: input.consentEmail,
    consentPhone: input.consentPhone,
    consentDate: toDate(input.consentDate),
    consentSource: input.consentSource || null,
    legalBasisNote: input.legalBasisNote || null,
    emailMarketingAllowed: input.emailMarketingAllowed,
    phoneContactAllowed: input.phoneContactAllowed,
  };
}

export async function createContactAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:write');
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const emailNormalized = normalizeEmail(parsed.data.email);
    const existing = await prisma.contact.findUnique({
      where: { workspaceId_emailNormalized: { workspaceId: ctx.workspaceId, emailNormalized } },
      select: { id: true },
    });
    if (existing) return fail('Un contact avec cette adresse email existe déjà.');

    const data = buildContactData(parsed.data);
    const contact = await prisma.contact.create({
      data: { ...data, workspaceId: ctx.workspaceId, importedAt: new Date() },
    });

    if (data.source) {
      await prisma.contactSource.create({
        data: { contactId: contact.id, source: data.source, detail: data.sourceDetail },
      });
    }
    if (parsed.data.consentEmail !== 'UNKNOWN') {
      await prisma.consentRecord.create({
        data: {
          contactId: contact.id,
          channel: 'email',
          state: parsed.data.consentEmail,
          source: data.consentSource,
          note: data.legalBasisNote,
          actorId: ctx.user.id,
        },
      });
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.create',
      entityType: 'Contact', entityId: contact.id, summary: contact.email,
    });
    revalidatePath('/contacts');
    return ok({ id: contact.id });
  });
}

export async function updateContactAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:write');
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides', parsed.error.flatten().fieldErrors);

    const before = await prisma.contact.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!before) return fail('Contact introuvable');

    const data = buildContactData(parsed.data);
    if (data.emailNormalized !== before.emailNormalized) {
      const clash = await prisma.contact.findUnique({
        where: { workspaceId_emailNormalized: { workspaceId: ctx.workspaceId, emailNormalized: data.emailNormalized } },
        select: { id: true },
      });
      if (clash) return fail('Un autre contact utilise déjà cette adresse email.');
    }

    const contact = await prisma.contact.update({ where: { id }, data });

    if (before.consentEmail !== parsed.data.consentEmail) {
      await prisma.consentRecord.create({
        data: {
          contactId: id, channel: 'email', state: parsed.data.consentEmail,
          source: data.consentSource, note: 'Modifié manuellement', actorId: ctx.user.id,
        },
      });
      await writeAudit({
        workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.consent_change',
        entityType: 'Contact', entityId: id, summary: `${before.consentEmail} → ${parsed.data.consentEmail}`,
        before: { consentEmail: before.consentEmail }, after: { consentEmail: parsed.data.consentEmail },
      });
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.update',
      entityType: 'Contact', entityId: id, summary: contact.email,
    });
    revalidatePath('/contacts');
    revalidatePath(`/contacts/${id}`);
    return ok({ id: contact.id });
  });
}

export async function deleteContactsAction(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:delete');
    if (ids.length === 0) return fail('Aucun contact sélectionné');
    const { count } = await prisma.contact.deleteMany({ where: { id: { in: ids }, workspaceId: ctx.workspaceId } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.delete',
      entityType: 'Contact', summary: `${count} contact(s) supprimé(s) définitivement`,
    });
    revalidatePath('/contacts');
    return ok({ deleted: count });
  });
}

export async function verifyContactsAction(ids: string[]): Promise<ActionResult<{ queued: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:write');
    const targets = ids.length
      ? ids
      : (await prisma.contact.findMany({
          where: { workspaceId: ctx.workspaceId, verificationStatus: 'UNVERIFIED' },
          select: { id: true }, take: 5000,
        })).map((c) => c.id);
    if (targets.length === 0) return fail('Aucun contact à vérifier');

    for (let i = 0; i < targets.length; i += 100) {
      await enqueue('contacts.verify_batch',
        { workspaceId: ctx.workspaceId, contactIds: targets.slice(i, i + 100) },
        { workspaceId: ctx.workspaceId, dedupeKey: `verify:${ctx.workspaceId}:${Date.now()}:${i}` });
    }
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.verify',
      entityType: 'Contact', summary: `${targets.length} adresse(s) mise(s) en file de vérification`,
    });
    return ok({ queued: targets.length });
  });
}

export async function suppressContactsAction(ids: string[], reason: string, notes?: string): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('suppression:write');
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids }, workspaceId: ctx.workspaceId },
      select: { email: true, phone: true },
    });
    for (const c of contacts) {
      await addSuppression({
        workspaceId: ctx.workspaceId, email: c.email, phone: c.phone,
        reason: reason as 'MANUAL_BLOCK', source: 'manuel', notes, userId: ctx.user.id,
      });
    }
    revalidatePath('/contacts');
    revalidatePath('/suppression');
    return ok({ count: contacts.length });
  });
}

export async function bulkTagAction(ids: string[], tag: string, mode: 'add' | 'remove'): Promise<ActionResult<{ count: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:write');
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids }, workspaceId: ctx.workspaceId },
      select: { id: true, tags: true },
    });
    let count = 0;
    for (const c of contacts) {
      const tags = mode === 'add'
        ? Array.from(new Set([...c.tags, tag]))
        : c.tags.filter((t) => t !== tag);
      if (tags.length !== c.tags.length) {
        await prisma.contact.update({ where: { id: c.id }, data: { tags } });
        count += 1;
      }
    }
    revalidatePath('/contacts');
    return ok({ count });
  });
}

/** GDPR-style export of everything stored about one contact. */
export async function exportContactAction(id: string): Promise<ActionResult<Record<string, unknown>>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:read');
    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: {
        sources: true, consents: true, verifications: true,
        submissions: true, leads: { include: { activities: true, scores: true } },
        recipients: { include: { campaign: { select: { name: true } } } },
        events: true,
      },
    });
    if (!contact) return fail('Contact introuvable');
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.export',
      entityType: 'Contact', entityId: id, summary: `Export des données de ${contact.email}`,
    });
    return ok(contact as unknown as Record<string, unknown>);
  });
}
