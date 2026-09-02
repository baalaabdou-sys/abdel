'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { generatePublicKey, generateSecretKey, hashSecretKey, normalizeOrigin } from '../services/capture';
import { INSURANCE_TYPES } from '@/lib/domain';

const siteSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(120),
  url: z.string().url('URL invalide').or(z.literal('')),
  allowedOrigins: z.array(z.string().min(3)).min(1, 'Indiquez au moins un domaine autorisé').max(10),
  formId: z.string().optional().nullable(),
  product: z.enum(INSURANCE_TYPES as [string, ...string[]]),
  fieldMapping: z.record(z.string()).default({}),
  consentText: z.string().max(1000).default(''),
  requireConsentField: z.boolean().default(true),
});

/** Normalises whatever the operator typed into scheme://host entries. */
function cleanOrigins(values: string[]): string[] {
  const out = new Set<string>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const normalized = normalizeOrigin(withScheme);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

export async function saveCaptureSiteAction(id: string | null, raw: unknown): Promise<ActionResult<{ id: string; secretKey?: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    const parsed = siteSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return fail(first ? first.message : 'Champs invalides');
    }

    const origins = cleanOrigins(parsed.data.allowedOrigins);
    if (origins.length === 0) return fail('Aucun domaine autorisé valide.');

    if (parsed.data.formId) {
      const form = await prisma.form.findFirst({ where: { id: parsed.data.formId, workspaceId: ctx.workspaceId } });
      if (!form) return fail('Formulaire introuvable');
    }

    const data = {
      name: parsed.data.name,
      url: parsed.data.url,
      allowedOrigins: origins,
      formId: parsed.data.formId || null,
      product: parsed.data.product as 'AUTRE',
      fieldMapping: parsed.data.fieldMapping as never,
      consentText: parsed.data.consentText,
      requireConsentField: parsed.data.requireConsentField,
    };

    if (id) {
      const existing = await prisma.captureSite.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return fail('Site de capture introuvable');
      await prisma.captureSite.update({ where: { id }, data });
      await writeAudit({
        workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'capture_site.update',
        entityType: 'CaptureSite', entityId: id, summary: `${data.name} — ${origins.join(', ')}`,
      });
      revalidatePath('/integrations');
      return ok({ id });
    }

    // The secret key is shown once, here, and never retrievable afterwards.
    const secretKey = generateSecretKey();
    const site = await prisma.captureSite.create({
      data: {
        ...data,
        workspaceId: ctx.workspaceId,
        publicKey: generatePublicKey(),
        secretKeyHash: hashSecretKey(secretKey),
      },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'capture_site.create',
      entityType: 'CaptureSite', entityId: site.id, summary: `${site.name} — ${origins.join(', ')}`,
    });
    revalidatePath('/integrations');
    return ok({ id: site.id, secretKey });
  });
}

export async function rotateCaptureSecretAction(id: string): Promise<ActionResult<{ secretKey: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    const site = await prisma.captureSite.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!site) return fail('Site de capture introuvable');

    const secretKey = generateSecretKey();
    await prisma.captureSite.update({ where: { id }, data: { secretKeyHash: hashSecretKey(secretKey) } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'capture_site.rotate_secret',
      entityType: 'CaptureSite', entityId: id, summary: `Clé secrète régénérée pour ${site.name}`,
    });
    revalidatePath('/integrations');
    return ok({ secretKey });
  });
}

export async function toggleCaptureSiteAction(id: string, active: boolean): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    const site = await prisma.captureSite.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!site) return fail('Site de capture introuvable');
    await prisma.captureSite.update({ where: { id }, data: { active } });
    revalidatePath('/integrations');
    return ok(null);
  });
}

export async function deleteCaptureSiteAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    const site = await prisma.captureSite.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!site) return fail('Site de capture introuvable');
    await prisma.captureSite.delete({ where: { id } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'capture_site.delete',
      entityType: 'CaptureSite', entityId: id, summary: site.name,
    });
    revalidatePath('/integrations');
    return ok(null);
  });
}

/**
 * Creates a form definition shaped for an external page. The fields exist so the
 * lead pipeline has something to validate against; the page itself keeps its own
 * markup.
 */
export async function createCaptureFormAction(name: string, product: string): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const parsed = z.object({
      name: z.string().min(2).max(120),
      product: z.enum(INSURANCE_TYPES as [string, ...string[]]),
    }).safeParse({ name, product });
    if (!parsed.success) return fail('Champs invalides');

    const form = await prisma.form.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: parsed.data.name,
        product: parsed.data.product as 'AUTRE',
        multiStep: false,
        steps: [{ key: 'contact', title: 'Contact', description: '' }] as never,
        consentText: "Consentement recueilli sur la page externe de l'annonceur.",
        successMessage: 'Merci, votre demande est enregistrée.',
        fields: {
          create: [
            { key: 'prenom', label: 'Prénom', type: 'text', step: 1, order: 1, required: false },
            { key: 'nom', label: 'Nom', type: 'text', step: 1, order: 2, required: false },
            { key: 'email', label: 'Email', type: 'email', step: 1, order: 3, required: false },
            { key: 'telephone', label: 'Téléphone', type: 'tel', step: 1, order: 4, required: false },
            { key: 'code_postal', label: 'Code postal', type: 'postal', step: 1, order: 5, required: false },
            { key: 'ville', label: 'Ville', type: 'text', step: 1, order: 6, required: false },
            { key: 'besoin', label: 'Besoin', type: 'text', step: 1, order: 7, required: false },
            { key: 'assureur_actuel', label: 'Assureur actuel', type: 'text', step: 1, order: 8, required: false },
            { key: 'date_echeance', label: 'Date d’échéance', type: 'date', step: 1, order: 9, required: false },
          ],
        },
      },
    });
    revalidatePath('/integrations');
    return ok({ id: form.id });
  });
}
