'use server';
import { headers, cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { hashIp } from '@/lib/crypto';
import { guard, ok, fail, type ActionResult } from '../context';
import { intakeSubmission } from '../services/lead-intake';
import { checkRateLimit } from '../services/rate-limit';

const SESSION_COOKIE = 'al_sid';

function funnelSession(): string {
  const existing = cookies().get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  const sid = crypto.randomBytes(12).toString('base64url');
  cookies().set(SESSION_COOKIE, sid, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
  return sid;
}

/** Records a landing-page view, deduped per visitor session per page per hour. */
export async function recordLandingView(landingPageId: string, recipientToken: string | null) {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { id: landingPageId },
      select: { workspaceId: true, isDemo: true },
    });
    if (!page) return;

    const sid = funnelSession();
    const recipient = recipientToken
      ? await prisma.campaignRecipient.findUnique({
          where: { trackingToken: recipientToken },
          select: { id: true, campaignId: true, contactId: true },
        })
      : null;

    await prisma.campaignEvent.create({
      data: {
        workspaceId: page.workspaceId,
        campaignId: recipient?.campaignId ?? null,
        recipientId: recipient?.id ?? null,
        contactId: recipient?.contactId ?? null,
        type: 'LANDING_VIEW',
        dedupeKey: `view:${landingPageId}:${sid}:${new Date().toISOString().slice(0, 13)}`,
        metadata: { landingPageId } as never,
      },
    });
  } catch {
    // Duplicate view within the hour, or transient failure — never block the page.
  }
}

export async function recordFormStartAction(landingPageId: string, recipientToken: string | null): Promise<ActionResult<null>> {
  return guard(async () => {
    const page = await prisma.landingPage.findUnique({ where: { id: landingPageId }, select: { workspaceId: true } });
    if (!page) return fail('Page introuvable');
    const sid = funnelSession();
    const recipient = recipientToken
      ? await prisma.campaignRecipient.findUnique({ where: { trackingToken: recipientToken }, select: { id: true, campaignId: true, contactId: true } })
      : null;
    await prisma.campaignEvent.create({
      data: {
        workspaceId: page.workspaceId,
        campaignId: recipient?.campaignId ?? null,
        recipientId: recipient?.id ?? null,
        contactId: recipient?.contactId ?? null,
        type: 'FORM_START',
        dedupeKey: `start:${landingPageId}:${sid}`,
        metadata: { landingPageId } as never,
      },
    }).catch(() => undefined);
    return ok(null);
  });
}

export async function recordFormStepAction(landingPageId: string, step: number): Promise<ActionResult<null>> {
  return guard(async () => {
    const page = await prisma.landingPage.findUnique({ where: { id: landingPageId }, select: { workspaceId: true } });
    if (!page) return ok(null);
    const sid = funnelSession();
    await prisma.campaignEvent.create({
      data: {
        workspaceId: page.workspaceId,
        type: 'FORM_STEP',
        dedupeKey: `step:${landingPageId}:${sid}:${step}`,
        metadata: { landingPageId, step } as never,
      },
    }).catch(() => undefined);
    return ok(null);
  });
}

export type SubmitPayload = {
  formId: string;
  landingPageId: string;
  recipientToken?: string | null;
  answers: Record<string, unknown>;
  consentGiven: boolean;
};

/** Public form submission — creates exactly one lead. */
export async function submitFormAction(payload: SubmitPayload): Promise<ActionResult<{ message: string }>> {
  return guard(async () => {
    const h = headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = await checkRateLimit(`submit:${ip}`, 12, 60_000);
    if (!limit.allowed) return fail('Trop de demandes envoyées. Réessayez dans une minute.');

    const form = await prisma.form.findUnique({
      where: { id: payload.formId },
      include: { fields: true, workspace: { select: { id: true, isDemo: true } } },
    });
    if (!form) return fail('Formulaire introuvable');

    const page = await prisma.landingPage.findFirst({
      where: { id: payload.landingPageId, workspaceId: form.workspaceId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!page) return fail('Page introuvable ou non publiée');

    // Server-side validation of every required field.
    const missing: string[] = [];
    for (const field of form.fields) {
      if (!field.required) continue;
      if (field.conditionField) {
        const dependency = String(payload.answers[field.conditionField] ?? '');
        if (field.conditionValue && dependency !== field.conditionValue) continue;
      }
      const value = payload.answers[field.key];
      if (field.type === 'checkbox') {
        if (value !== true) missing.push(field.label);
      } else if (value === undefined || value === null || String(value).trim() === '') {
        missing.push(field.label);
      }
    }
    if (missing.length) return fail(`Champs obligatoires manquants : ${missing.slice(0, 3).join(', ')}.`);

    const emailValue = String(payload.answers.email ?? '').trim();
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return fail('Adresse email invalide.');
    }

    // Only keep answers that correspond to declared fields.
    const allowed = new Set(form.fields.map((f) => f.key));
    const answers = Object.fromEntries(Object.entries(payload.answers).filter(([k]) => allowed.has(k)));

    const consentField = form.fields.find((f) => f.type === 'checkbox' && f.required);
    const consentGiven = consentField ? payload.answers[consentField.key] === true : payload.consentGiven;

    await intakeSubmission({
      workspaceId: form.workspaceId,
      formId: form.id,
      landingPageId: page.id,
      recipientToken: payload.recipientToken ?? null,
      sessionId: funnelSession(),
      answers,
      consentGiven,
      consentText: form.consentText,
      ipHash: hashIp(ip),
      userAgent: h.get('user-agent'),
      isDemo: form.workspace.isDemo,
    });

    return ok({ message: form.successMessage || 'Merci, votre demande est enregistrée.' });
  });
}
