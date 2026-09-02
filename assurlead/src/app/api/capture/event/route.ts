import { NextResponse } from 'next/server';
import { authenticateCapture, normalizeOrigin, recordCaptureEvent } from '@/server/services/capture';
import { checkRateLimit } from '@/server/services/rate-limit';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Funnel events from an externally hosted landing page: view, form start, step.
 * Never creates a lead — that is `/api/capture/lead`.
 */
export async function POST(request: Request) {
  const origin = normalizeOrigin(request.headers.get('origin') ?? request.headers.get('referer'));
  const cors = corsHeaders(origin);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`capture-event:${ip}`, 120, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400, headers: cors });
  }

  const auth = await authenticateCapture(
    typeof body.key === 'string' ? body.key : request.headers.get('x-assurlead-key'),
    bearer(request),
    origin,
  );
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: cors });

  const type = String(body.type ?? '').toUpperCase();
  if (!['LANDING_VIEW', 'FORM_START', 'FORM_STEP'].includes(type)) {
    return NextResponse.json({ error: 'Type d’événement inconnu' }, { status: 400, headers: cors });
  }

  const sessionId = String(body.sessionId ?? '').slice(0, 64);
  if (!sessionId) return NextResponse.json({ error: 'sessionId manquant' }, { status: 400, headers: cors });

  await recordCaptureEvent({
    site: auth.identity.site,
    type: type as 'LANDING_VIEW',
    token: typeof body.token === 'string' ? body.token : null,
    sessionId,
    step: typeof body.step === 'number' ? body.step : undefined,
    pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 500) : undefined,
  });

  return NextResponse.json({ ok: true }, { headers: cors });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(normalizeOrigin(request.headers.get('origin'))),
  });
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}
