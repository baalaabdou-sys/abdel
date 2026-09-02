import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashIp } from '@/lib/crypto';
import { authenticateCapture, mapSubmission, normalizeOrigin, resolveTrackingToken } from '@/server/services/capture';
import { intakeSubmission } from '@/server/services/lead-intake';
import { checkRateLimit } from '@/server/services/rate-limit';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lead submission from an externally hosted landing page.
 *
 * Runs the exact same pipeline as a form hosted here — contact upsert with
 * provenance, explainable scoring, automations, notifications, daily goal — so
 * an external page produces leads indistinguishable in quality from internal
 * ones, apart from the recorded source.
 */
export async function POST(request: Request) {
  const origin = normalizeOrigin(request.headers.get('origin') ?? request.headers.get('referer'));
  const cors = corsHeaders(origin);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`capture-lead:${ip}`, 12, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Trop de demandes envoyées. Réessayez dans une minute.' }, { status: 429, headers: cors });
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
  const { site, channel } = auth.identity;

  if (!site.formId) {
    return NextResponse.json(
      { error: "Aucun formulaire n'est rattaché à ce site de capture." },
      { status: 409, headers: cors },
    );
  }

  const rawFields = (body.fields ?? body.answers ?? {}) as Record<string, unknown>;
  if (typeof rawFields !== 'object' || Object.keys(rawFields).length === 0) {
    return NextResponse.json({ error: 'Aucun champ reçu' }, { status: 400, headers: cors });
  }

  const mapped = mapSubmission(rawFields, site.fieldMapping);
  const email = String(mapped.answers.email ?? '').trim();
  const phone = String(mapped.answers.telephone ?? '').trim();
  if (!email && !phone) {
    return NextResponse.json(
      { error: 'Un email ou un téléphone est nécessaire pour créer un lead exploitable.' },
      { status: 422, headers: cors },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide' }, { status: 422, headers: cors });
  }

  // Consent is recorded as observed, never assumed: a page with no consent
  // checkbox yields a lead whose consent state stays UNKNOWN.
  const consentGiven = mapped.consentFieldPresent
    ? mapped.consentGiven
    : site.requireConsentField
      ? false
      : Boolean(body.consentGiven);

  const token = typeof body.token === 'string' ? body.token : null;
  const recipient = await resolveTrackingToken(site.workspaceId, token);

  try {
    const result = await intakeSubmission({
      workspaceId: site.workspaceId,
      formId: site.formId,
      landingPageId: null,
      campaignId: recipient?.campaignId ?? null,
      recipientToken: recipient ? token : null,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : null,
      answers: {
        ...mapped.answers,
        ...(mapped.answers.type_assurance ? {} : { type_assurance: site.product }),
      },
      consentGiven,
      consentText: site.consentText || String(body.consentText ?? ''),
      ipHash: hashIp(ip),
      userAgent: request.headers.get('user-agent'),
      externalSource: { captureSiteId: site.id, channel, pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 500) : null },
    });

    await prisma.captureSite.update({
      where: { id: site.id },
      data: { leadCount: { increment: 1 }, lastEventAt: new Date() },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, leadId: result.leadId, score: result.score }, { headers: cors });
  } catch (err) {
    console.error('[capture] lead intake failed', err);
    return NextResponse.json({ error: "La demande n'a pas pu être enregistrée." }, { status: 500, headers: cors });
  }
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
