'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { normalizeEmail, isSyntacticallyValidEmail } from '@/lib/utils';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { addSuppression, removeSuppression } from '../services/suppression';
import { SUPPRESSION_REASON_LIST } from '@/lib/domain';

export async function addSuppressionAction(raw: { email?: string; phone?: string; reason: string; notes?: string }): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('suppression:write');
    const parsed = z.object({
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().max(30).optional().or(z.literal('')),
      reason: z.enum(SUPPRESSION_REASON_LIST as [string, ...string[]]),
      notes: z.string().max(500).optional(),
    }).safeParse(raw);
    if (!parsed.success) return fail('Champs invalides');
    if (!parsed.data.email && !parsed.data.phone) return fail('Renseignez au moins un email ou un téléphone.');

    await addSuppression({
      workspaceId: ctx.workspaceId,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      reason: parsed.data.reason as 'MANUAL_BLOCK',
      source: 'ajout manuel',
      notes: parsed.data.notes,
      userId: ctx.user.id,
    });
    revalidatePath('/suppression');
    return ok(null);
  });
}

export async function removeSuppressionAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('suppression:write');
    const removed = await removeSuppression(ctx.workspaceId, id, ctx.user.id);
    if (!removed) return fail('Entrée introuvable');
    revalidatePath('/suppression');
    return ok(null);
  });
}

/** Bulk import: one email per line, or a CSV whose first column is the email. */
export async function importSuppressionAction(content: string, reason: string): Promise<ActionResult<{ added: number; skipped: number }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('suppression:write');
    if (!SUPPRESSION_REASON_LIST.includes(reason as 'OTHER')) return fail('Motif inconnu');

    const lines = content.split(/\r?\n/).map((l) => l.split(/[,;\t]/)[0].trim()).filter(Boolean);
    let added = 0;
    let skipped = 0;

    for (const line of lines) {
      if (!isSyntacticallyValidEmail(line)) { skipped += 1; continue; }
      await addSuppression({
        workspaceId: ctx.workspaceId,
        email: line,
        reason: reason as 'OTHER',
        source: 'import liste de suppression',
        userId: ctx.user.id,
      });
      added += 1;
    }

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'suppression.import',
      entityType: 'SuppressionEntry', summary: `${added} entrée(s) importée(s), ${skipped} ignorée(s)`,
    });
    revalidatePath('/suppression');
    return ok({ added, skipped });
  });
}

export async function exportSuppressionAction(): Promise<ActionResult<string>> {
  return guard(async () => {
    const ctx = await requireWorkspace('suppression:read');
    const entries = await prisma.suppressionEntry.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { email: true, phone: true, reason: true, source: true, notes: true, createdAt: true },
    });
    const header = 'email,telephone,motif,source,notes,date\n';
    const rows = entries.map((e) =>
      [e.email ?? '', e.phone ?? '', e.reason, e.source ?? '', (e.notes ?? '').replace(/[",\n]/g, ' '), e.createdAt.toISOString()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return ok(header + rows.join('\n'));
  });
}
