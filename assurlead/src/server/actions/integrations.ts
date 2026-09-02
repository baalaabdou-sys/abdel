'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { encryptConfig, decryptConfig } from '@/lib/crypto';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { getAiProvider } from '../providers/ai';
import { getVerificationProvider } from '../providers/verification';
import { INTEGRATION_CATALOG } from '@/lib/integration-catalog';

export async function saveIntegrationAction(kind: string, provider: string, config: Record<string, unknown>): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    const entry = INTEGRATION_CATALOG.find((i) => i.kind === kind && i.provider === provider);
    if (!entry) return fail('Intégration inconnue');

    const existing = await prisma.integration.findUnique({
      where: { workspaceId_kind_provider: { workspaceId: ctx.workspaceId, kind, provider } },
    });
    const current = decryptConfig((existing?.config ?? {}) as Record<string, unknown>);
    const merged = Object.fromEntries(
      Object.entries(config).map(([k, v]) => (v === '••••••••' || v === '' ? [k, current[k] ?? ''] : [k, v])),
    );

    // The routing table is stored as parsed objects so the assignment service can read it.
    if (provider === 'routing') {
      try {
        merged.byProduct = merged.byProductJson ? JSON.parse(String(merged.byProductJson)) : {};
        merged.byDepartment = merged.byDepartmentJson ? JSON.parse(String(merged.byDepartmentJson)) : {};
      } catch {
        return fail('Les tables de routage doivent être du JSON valide.');
      }
    }

    const hasSecret = entry.fields.some((f) => String(merged[f.key] ?? '').length > 0);

    await prisma.integration.upsert({
      where: { workspaceId_kind_provider: { workspaceId: ctx.workspaceId, kind, provider } },
      update: {
        config: encryptConfig(merged) as never,
        status: hasSecret ? 'CONNECTED' : 'DISCONNECTED',
        label: entry.label,
      },
      create: {
        workspaceId: ctx.workspaceId, kind, provider, label: entry.label,
        config: encryptConfig(merged) as never,
        status: hasSecret ? 'CONNECTED' : 'DISCONNECTED',
      },
    });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'integration.save',
      entityType: 'Integration', summary: `${entry.label} ${hasSecret ? 'connectée' : 'déconnectée'}`,
    });
    revalidatePath('/integrations');
    return ok(null);
  });
}

export async function testIntegrationAction(kind: string, provider: string): Promise<ActionResult<{ ok: boolean; message: string }>> {
  return guard<{ ok: boolean; message: string }>(async () => {
    const ctx = await requireWorkspace('integrations:write');
    try {
      if (kind === 'AI') {
        const ai = await getAiProvider(ctx.workspaceId);
        if (ai.simulated) return ok({ ok: false, message: 'Aucune clé IA active : le fournisseur DEMO est utilisé.' });
        const response = await ai.complete({
          system: '[TASK:PING] Réponds uniquement par {"ok":true}.',
          messages: [{ role: 'user', content: '{}' }],
          maxTokens: 20,
        });
        const message = `Connexion établie avec ${ai.name} (${ai.model}). ${response.outputTokens} jeton(s) générés.`;
        await prisma.integration.updateMany({
          where: { workspaceId: ctx.workspaceId, kind, provider },
          data: { status: 'CONNECTED', statusMessage: message, lastSyncAt: new Date() },
        });
        return ok({ ok: true, message });
      }

      if (kind === 'VERIFICATION') {
        const verifier = await getVerificationProvider(ctx.workspaceId);
        const result = await verifier.verify('test@exemple.fr');
        const message = `Fournisseur ${verifier.name} joignable — statut retourné : ${result.status}.`;
        await prisma.integration.updateMany({
          where: { workspaceId: ctx.workspaceId, kind, provider },
          data: { status: 'CONNECTED', statusMessage: message, lastSyncAt: new Date() },
        });
        return ok({ ok: true, message });
      }

      return ok({ ok: true, message: 'Aucun test automatique disponible pour cette intégration.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test échoué';
      await prisma.integration.updateMany({
        where: { workspaceId: ctx.workspaceId, kind, provider },
        data: { status: 'ERROR', statusMessage: message },
      });
      return ok({ ok: false, message });
    }
  });
}

export async function disconnectIntegrationAction(kind: string, provider: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('integrations:write');
    await prisma.integration.deleteMany({ where: { workspaceId: ctx.workspaceId, kind, provider } });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'integration.disconnect',
      entityType: 'Integration', summary: `${provider} déconnectée`,
    });
    revalidatePath('/integrations');
    return ok(null);
  });
}
