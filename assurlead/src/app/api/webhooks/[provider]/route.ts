import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptConfig } from '@/lib/crypto';
import { ingestEvents, normalizeEvents, verifySignature } from '@/server/services/webhooks';
import { checkRateLimit } from '@/server/services/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED = ['brevo', 'mailgun', 'postmark', 'ses'];

/**
 * Provider webhook endpoint: /api/webhooks/<provider>?ws=<workspaceId>
 *
 * The workspace's stored webhook secret is used to verify the signature.
 * Processing is idempotent — see `ingestEvents`.
 */
export async function POST(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider.toLowerCase();
  if (!SUPPORTED.includes(provider)) {
    return NextResponse.json({ error: 'Fournisseur non supporté' }, { status: 404 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('ws');
  if (!workspaceId) return NextResponse.json({ error: 'Paramètre ws manquant' }, { status: 400 });

  const limit = await checkRateLimit(`webhook:${workspaceId}:${provider}`, 600, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const integration = await prisma.integration.findFirst({
    where: { workspaceId, kind: 'EMAIL', provider },
  });
  const secret = String(decryptConfig((integration?.config ?? {}) as Record<string, unknown>).webhookSecret ?? '');

  const rawBody = await request.text();

  if (secret) {
    if (!verifySignature(provider, rawBody, request.headers, secret)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Refuse unverifiable events in production rather than trusting them.
    return NextResponse.json({ error: 'Aucun secret de webhook configuré pour ce fournisseur' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const events = normalizeEvents(provider, body);
  if (events.length === 0) return NextResponse.json({ processed: 0, ignored: true });

  const result = await ingestEvents(workspaceId, provider, events);
  await prisma.integration.updateMany({
    where: { workspaceId, kind: 'EMAIL', provider },
    data: { lastSyncAt: new Date(), status: 'CONNECTED' },
  });

  return NextResponse.json(result);
}

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  // Some providers probe the endpoint before enabling delivery.
  return NextResponse.json({ ok: true, provider: params.provider });
}
