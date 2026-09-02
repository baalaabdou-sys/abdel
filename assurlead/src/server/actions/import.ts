'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { buildPreview, runImport, type ImportDefaults, type ImportStrategy } from '../services/import';
import { enqueue } from '../services/queue';

export async function previewImportAction(uploadId: string, filename: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:import');
    if (!/^[a-zA-Z0-9._-]+$/.test(uploadId)) return fail('Identifiant de fichier invalide');
    const preview = await buildPreview(ctx.workspaceId, uploadId, filename);
    return ok(preview);
  });
}

const runSchema = z.object({
  uploadId: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  filename: z.string().max(200),
  mapping: z.record(z.string()),
  strategy: z.enum(['SKIP', 'UPDATE', 'MERGE', 'NEW_ONLY']),
  defaults: z.object({
    source: z.string().min(1, 'La source est obligatoire').max(120),
    sourceDetail: z.string().max(200).optional(),
    consentEmail: z.enum(['UNKNOWN', 'GRANTED', 'DENIED']),
    consentPhone: z.enum(['UNKNOWN', 'GRANTED', 'DENIED']),
    consentSource: z.string().max(160).optional(),
    legalBasisNote: z.string().max(500).optional(),
    emailMarketingAllowed: z.boolean(),
    phoneContactAllowed: z.boolean(),
    insuranceType: z.string().optional(),
    tags: z.array(z.string().max(40)).default([]),
    verifyAfterImport: z.boolean().default(true),
  }),
});

/**
 * Starts an import. Small files run inline for immediate feedback; larger ones
 * are handed to the worker so the request never blocks on 100k rows.
 */
export async function runImportAction(raw: unknown): Promise<ActionResult<{ batchId: string; mode: 'inline' | 'queued'; outcome?: unknown }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:import');
    const parsed = runSchema.safeParse(raw);
    if (!parsed.success) return fail('Paramètres d’import invalides', parsed.error.flatten().fieldErrors);

    const { uploadId, filename, mapping, strategy, defaults } = parsed.data;
    if (!Object.values(mapping).includes('email')) return fail('Vous devez associer une colonne à « Email ».');

    const preview = await buildPreview(ctx.workspaceId, uploadId, filename);

    const batch = await prisma.importBatch.create({
      data: {
        workspaceId: ctx.workspaceId,
        filename,
        totalRows: preview.totalRows,
        strategy: strategy as ImportStrategy,
        mapping: mapping as never,
        defaults: { ...defaults, uploadId } as unknown as never,
        status: 'PENDING',
        createdById: ctx.user.id,
      },
    });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'contact.import',
      entityType: 'ImportBatch', entityId: batch.id,
      summary: `${filename} — ${preview.totalRows} ligne(s), stratégie ${strategy}`,
    });

    const INLINE_LIMIT = 3000;
    if (preview.totalRows <= INLINE_LIMIT) {
      const outcome = await runImport(batch.id);
      revalidatePath('/contacts');
      return ok({ batchId: batch.id, mode: 'inline', outcome } as { batchId: string; mode: 'inline' | 'queued'; outcome?: unknown });
    }

    await enqueue('contacts.import', { batchId: batch.id }, {
      workspaceId: ctx.workspaceId,
      dedupeKey: `import:${batch.id}`,
      maxAttempts: 2,
    });
    return ok({ batchId: batch.id, mode: 'queued' } as { batchId: string; mode: 'inline' | 'queued'; outcome?: unknown });
  });
}

export async function getImportStatusAction(batchId: string) {
  return guard(async () => {
    const ctx = await requireWorkspace('contacts:read');
    const batch = await prisma.importBatch.findFirst({ where: { id: batchId, workspaceId: ctx.workspaceId } });
    if (!batch) return fail('Import introuvable');
    return ok(batch);
  });
}
