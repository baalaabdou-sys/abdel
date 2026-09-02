import 'server-only';
import type { InsuranceType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeEmail, normalizePhone, isSyntacticallyValidEmail, ageFromBirthDate } from '@/lib/utils';
import { scoreLead } from './lead-scoring';
import { runAutomations } from './automations';
import { enqueue } from './queue';
import { QUALIFIED_SCORE_THRESHOLD } from '@/lib/domain';

export type SubmissionInput = {
  workspaceId: string;
  formId: string;
  landingPageId?: string | null;
  campaignId?: string | null;
  recipientToken?: string | null;
  sessionId?: string | null;
  answers: Record<string, unknown>;
  consentGiven: boolean;
  consentText: string;
  ipHash?: string | null;
  userAgent?: string | null;
  variantLabel?: string | null;
  isDemo?: boolean;
  /// Present when the submission came from a page the client hosts themselves.
  externalSource?: { captureSiteId: string; channel: 'browser' | 'server'; pageUrl: string | null } | null;
};

export type IntakeResult = { submissionId: string; leadId: string; score: number; band: string };

const ANSWER_KEYS = {
  email: ['email', 'mail', 'adresse_email'],
  phone: ['telephone', 'phone', 'tel', 'mobile'],
  firstName: ['prenom', 'first_name', 'firstname'],
  lastName: ['nom', 'last_name', 'lastname'],
  city: ['ville', 'city'],
  postalCode: ['code_postal', 'postal_code', 'cp', 'zip'],
  currentInsurer: ['assureur_actuel', 'current_insurer', 'assureur'],
  renewalDate: ['date_echeance', 'renewal_date', 'echeance'],
};

function pluck(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = answers[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/**
 * Turns a landing-page form submission into exactly one lead.
 *
 * Everything downstream of the funnel hangs off this function: contact
 * upsert with provenance, scoring with explanation, campaign event for
 * analytics, automations (assignment, tasks, notifications) and the daily goal.
 */
export async function intakeSubmission(input: SubmissionInput): Promise<IntakeResult> {
  const form = await prisma.form.findFirst({ where: { id: input.formId, workspaceId: input.workspaceId } });
  if (!form) throw new Error('Formulaire introuvable');

  const email = pluck(input.answers, ANSWER_KEYS.email);
  const phone = pluck(input.answers, ANSWER_KEYS.phone);
  const firstName = pluck(input.answers, ANSWER_KEYS.firstName);
  const lastName = pluck(input.answers, ANSWER_KEYS.lastName);
  const city = pluck(input.answers, ANSWER_KEYS.city);
  const postalCode = pluck(input.answers, ANSWER_KEYS.postalCode);
  const currentInsurer = pluck(input.answers, ANSWER_KEYS.currentInsurer);
  const renewalRaw = pluck(input.answers, ANSWER_KEYS.renewalDate);
  const renewalDate = renewalRaw && !Number.isNaN(Date.parse(renewalRaw)) ? new Date(renewalRaw) : null;

  // Resolve the originating recipient, if the visitor came from a tracked email.
  const recipient = input.recipientToken
    ? await prisma.campaignRecipient.findUnique({
        where: { trackingToken: input.recipientToken },
        include: { contact: true, campaign: true },
      })
    : null;

  const campaignId = input.campaignId ?? recipient?.campaignId ?? null;
  const campaign = campaignId
    ? await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: input.workspaceId } })
    : null;

  // ── Contact upsert with provenance ────────────────────────────
  let contactId: string | null = null;
  // A visitor who arrived from a tracked email is already a known contact; one
  // who arrived cold is matched on their normalised email. Either way the same
  // enrichment and provenance path runs, so a tracked submission is never
  // silently dropped on the floor.
  const known =
    recipient?.contact ??
    (email && isSyntacticallyValidEmail(email)
      ? await prisma.contact.findUnique({
          where: {
            workspaceId_emailNormalized: {
              workspaceId: input.workspaceId,
              emailNormalized: normalizeEmail(email),
            },
          },
        })
      : null);

  if (known || (email && isSyntacticallyValidEmail(email))) {
    const existing = known;
    if (existing) {
      contactId = existing.id;
      // Enrich without overwriting existing values.
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName ?? firstName,
          lastName: existing.lastName ?? lastName,
          phone: existing.phone ?? phone,
          phoneNormalized: existing.phoneNormalized ?? normalizePhone(phone),
          city: existing.city ?? city,
          postalCode: existing.postalCode ?? postalCode,
          currentInsurer: existing.currentInsurer ?? currentInsurer,
          renewalDate: existing.renewalDate ?? renewalDate,
          renewalMonth: existing.renewalMonth ?? (renewalDate ? renewalDate.getMonth() + 1 : null),
          insuranceInterests: existing.insuranceInterests.includes(form.product)
            ? existing.insuranceInterests
            : { push: form.product },
          ...(input.consentGiven
            ? {
                consentEmail: 'GRANTED' as const,
                consentDate: new Date(),
                consentSource: input.externalSource ? 'landing_externe' : 'landing_form',
                emailMarketingAllowed: true,
                phoneContactAllowed: true,
                consentPhone: 'GRANTED' as const,
              }
            : {}),
        },
      });
      // Provenance is appended, never overwritten: `sourceDetail` still names
      // where the contact originally came from, and this row records that the
      // same person came back through an external page.
      await prisma.contactSource.create({
        data: {
          contactId: existing.id,
          source: input.externalSource ? 'landing_externe' : 'landing_form',
          detail: input.externalSource
            ? `Page externe${input.externalSource.pageUrl ? ` — ${input.externalSource.pageUrl}` : ''}${campaign ? ` · Campagne ${campaign.name}` : ''}`
            : campaign ? `Campagne ${campaign.name}` : form.name,
        },
      });
    } else if (email) {
      const created = await prisma.contact.create({
        data: {
          workspaceId: input.workspaceId,
          email,
          emailNormalized: normalizeEmail(email),
          firstName,
          lastName,
          phone,
          phoneNormalized: normalizePhone(phone),
          city,
          postalCode,
          currentInsurer,
          renewalDate,
          renewalMonth: renewalDate ? renewalDate.getMonth() + 1 : null,
          insuranceInterests: [form.product],
          source: input.externalSource ? 'landing_externe' : 'landing_form',
          sourceDetail: input.externalSource
            ? `Page externe${input.externalSource.pageUrl ? ` — ${input.externalSource.pageUrl}` : ''}${campaign ? ` · Campagne ${campaign.name}` : ''}`
            : campaign ? `Campagne ${campaign.name}` : form.name,
          consentEmail: input.consentGiven ? 'GRANTED' : 'UNKNOWN',
          consentPhone: input.consentGiven ? 'GRANTED' : 'UNKNOWN',
          consentDate: input.consentGiven ? new Date() : null,
          consentSource: input.consentGiven ? (input.externalSource ? 'landing_externe' : 'landing_form') : null,
          legalBasisNote: input.consentText.slice(0, 500),
          emailMarketingAllowed: input.consentGiven,
          phoneContactAllowed: input.consentGiven,
          isDemo: input.isDemo ?? false,
        },
      });
      contactId = created.id;
      await prisma.contactSource.create({
        data: {
          contactId: created.id,
          source: input.externalSource ? 'landing_externe' : 'landing_form',
          detail: input.externalSource
            ? `Page externe${input.externalSource.pageUrl ? ` — ${input.externalSource.pageUrl}` : ''}`
            : campaign ? `Campagne ${campaign.name}` : form.name,
        },
      });
    }

    if (contactId && input.consentGiven) {
      await prisma.consentRecord.createMany({
        data: [
          { contactId, channel: 'email', state: 'GRANTED', source: input.externalSource ? 'landing_externe' : 'landing_form', evidence: input.consentText.slice(0, 500) },
          { contactId, channel: 'phone', state: 'GRANTED', source: input.externalSource ? 'landing_externe' : 'landing_form', evidence: input.consentText.slice(0, 500) },
        ],
      });
    }
  }

  // ── Submission ────────────────────────────────────────────────
  const submission = await prisma.formSubmission.create({
    data: {
      workspaceId: input.workspaceId,
      formId: input.formId,
      landingPageId: input.landingPageId ?? null,
      campaignId,
      contactId,
      recipientToken: input.recipientToken ?? null,
      sessionId: input.sessionId ?? null,
      consentGiven: input.consentGiven,
      consentText: input.consentText,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      variantLabel: input.variantLabel ?? null,
      isDemo: input.isDemo ?? false,
      answers: {
        ...(input.answers as Record<string, unknown>),
        ...(input.externalSource
          ? { __capture: { siteId: input.externalSource.captureSiteId, channel: input.externalSource.channel, pageUrl: input.externalSource.pageUrl } }
          : {}),
      } as Prisma.InputJsonValue,
    },
  });

  // ── Scoring ───────────────────────────────────────────────────
  const product = (String(input.answers.type_assurance ?? '') as InsuranceType) || form.product;
  const validProduct: InsuranceType = (
    ['AUTO', 'MOTO', 'HABITATION', 'SANTE', 'PREVOYANCE', 'EMPRUNTEUR', 'PROFESSIONNELLE', 'DECENNALE', 'RC_PRO', 'AUTRE'] as string[]
  ).includes(product) ? product : form.product;

  const contact = contactId ? await prisma.contact.findUnique({ where: { id: contactId } }) : null;
  const scoring = scoreLead({
    product: validProduct,
    campaignProduct: campaign?.product ?? null,
    answers: input.answers,
    email,
    phone,
    postalCode,
    city,
    firstName,
    lastName,
    renewalDate: renewalDate ?? contact?.renewalDate ?? null,
    currentInsurer: currentInsurer ?? contact?.currentInsurer ?? null,
    cameFromCampaign: !!recipient,
    contactVerified: contact ? ['VALID', 'LIKELY_VALID'].includes(contact.verificationStatus) : false,
  });

  // ── Lead (exactly one per submission) ─────────────────────────
  const lead = await prisma.lead.create({
    data: {
      workspaceId: input.workspaceId,
      contactId,
      campaignId,
      submissionId: submission.id,
      product: validProduct,
      status: scoring.score >= QUALIFIED_SCORE_THRESHOLD ? 'QUALIFIE' : 'NOUVEAU',
      score: scoring.score,
      scoreBand: scoring.band,
      firstName,
      lastName,
      email,
      phone,
      city,
      postalCode,
      currentInsurer,
      renewalDate,
      answers: input.answers as Prisma.InputJsonValue,
      isDemo: input.isDemo ?? false,
    },
  });

  await prisma.leadScore.create({
    data: { leadId: lead.id, score: scoring.score, band: scoring.band, breakdown: scoring.breakdown as unknown as Prisma.InputJsonValue },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'FORM',
      title: input.externalSource ? 'Formulaire soumis (page externe)' : 'Formulaire soumis',
      body: `${Object.keys(input.answers).length} réponses · score ${scoring.score}/100${input.externalSource ? ` · capture ${input.externalSource.channel === 'server' ? 'serveur' : 'navigateur'}` : ''}`,
      metadata: { submissionId: submission.id, campaignId } as Prisma.InputJsonValue,
    },
  });

  // ── Funnel events (analytics read these, never hardcoded numbers) ──
  await prisma.campaignEvent.create({
    data: {
      workspaceId: input.workspaceId,
      campaignId,
      recipientId: recipient?.id ?? null,
      contactId,
      type: 'FORM_SUBMIT',
      dedupeKey: `form_submit:${submission.id}`,
      metadata: { formId: input.formId, leadId: lead.id, score: scoring.score } as Prisma.InputJsonValue,
    },
  });

  // ── Automations: assignment, tasks, notifications ─────────────
  await runAutomations('FORM_SUBMITTED', { workspaceId: input.workspaceId, leadId: lead.id, contactId: contactId ?? undefined });
  await runAutomations('LEAD_CREATED', {
    workspaceId: input.workspaceId,
    leadId: lead.id,
    contactId: contactId ?? undefined,
    score: scoring.score,
    product: validProduct,
    postalCode,
  });
  if (scoring.score >= 80) {
    await runAutomations('LEAD_SCORE_ABOVE', {
      workspaceId: input.workspaceId,
      leadId: lead.id,
      score: scoring.score,
      product: validProduct,
      postalCode,
    });
  }

  // Speed-to-lead watchdog.
  await enqueue('automation.speed_to_lead', { leadId: lead.id }, {
    workspaceId: input.workspaceId,
    runAt: new Date(Date.now() + 10 * 60_000),
    dedupeKey: `speed:${lead.id}`,
  });

  await refreshDailyGoal(input.workspaceId);

  return { submissionId: submission.id, leadId: lead.id, score: scoring.score, band: scoring.band };
}

/** Recomputes today's qualified-lead count from real lead rows. */
export async function refreshDailyGoal(workspaceId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const achieved = await prisma.lead.count({
    where: { workspaceId, createdAt: { gte: start }, score: { gte: QUALIFIED_SCORE_THRESHOLD } },
  });
  const goal = await prisma.dailyGoal.upsert({
    where: { workspaceId_date: { workspaceId, date: start } },
    update: { achieved },
    create: { workspaceId, date: start, achieved },
  });
  if (achieved >= goal.minTarget) {
    const { notify } = await import('./notifications');
    await notify({
      workspaceId,
      type: 'DAILY_TARGET',
      level: 'SUCCESS',
      title: 'Objectif quotidien atteint 🎯',
      body: `${achieved} leads qualifiés aujourd'hui (objectif : ${goal.minTarget}).`,
      link: '/dashboard',
      dedupeKey: `daily_target:${workspaceId}:${start.toISOString().slice(0, 10)}`,
    });
  }
  return goal;
}
