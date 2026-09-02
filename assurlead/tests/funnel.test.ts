/**
 * End-to-end funnel: click → landing page → form → lead → scoring → analytics.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import {
  prisma, createWorkspace, createEmailAccount, createContact, createSegment,
  createLandingPage, createCampaign, cleanupWorkspace,
} from './helpers';
import { buildRecipients, sendRecipient } from '@/server/services/sending';
import { intakeSubmission } from '@/server/services/lead-intake';
import { getFunnel, getDailyGoalStatus, forecastForTarget } from '@/server/services/analytics';
import { scoreLead } from '@/server/services/lead-scoring';

let workspaceId: string;

beforeAll(async () => {
  const ws = await createWorkspace('Funnel');
  workspaceId = ws.id;
});

afterAll(async () => {
  await cleanupWorkspace(workspaceId);
  await prisma.$disconnect();
});

describe('8. Une soumission de formulaire crée exactement UN lead', () => {
  it('crée un lead unique, scoré et rattaché à la campagne', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { form, page } = await createLandingPage(workspaceId);
    const contact = await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, contactId: contact.id },
    });
    await sendRecipient(recipient.id);

    const before = await prisma.lead.count({ where: { workspaceId } });

    const result = await intakeSubmission({
      workspaceId,
      formId: form.id,
      landingPageId: page.id,
      recipientToken: recipient.trackingToken,
      answers: {
        prenom: 'Jean', nom: 'Dupont', email: contact.email,
        telephone: '0612345678', code_postal: '69003', ville: 'Lyon',
        besoin: 'changer', assureur_actuel: 'AXA',
        date_echeance: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      },
      consentGiven: true,
      consentText: "J'accepte d'être contacté.",
    });

    const after = await prisma.lead.count({ where: { workspaceId } });
    expect(after - before).toBe(1);

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: result.leadId },
      include: { scores: true },
    });
    expect(lead.campaignId).toBe(campaign.id);
    expect(lead.contactId).toBe(contact.id);
    expect(lead.email).toBe(contact.email);
    expect(lead.score).toBeGreaterThan(0);
    expect(lead.scores).toHaveLength(1);

    // The score must always be explainable.
    const breakdown = lead.scores[0].breakdown as unknown as { label: string; points: number }[];
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown.every((f) => typeof f.label === 'string' && typeof f.points === 'number')).toBe(true);

    // One submission, one FORM_SUBMIT event.
    const submitEvents = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id, type: 'FORM_SUBMIT' },
    });
    expect(submitEvents).toBe(1);
  });

  it('rattache le lead à un nouveau contact lorsque l’email est inconnu', async () => {
    const { form, page } = await createLandingPage(workspaceId);
    const email = `nouveau-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;

    const result = await intakeSubmission({
      workspaceId,
      formId: form.id,
      landingPageId: page.id,
      answers: { prenom: 'Marie', nom: 'Martin', email, telephone: '0698765432', code_postal: '75011' },
      consentGiven: true,
      consentText: "J'accepte d'être contacté.",
    });

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: result.leadId } });
    expect(lead.contactId).not.toBeNull();

    const contact = await prisma.contact.findUniqueOrThrow({ where: { id: lead.contactId! } });
    expect(contact.consentEmail).toBe('GRANTED');
    expect(contact.source).toBe('landing_form');
    // Consent must be recorded as evidence, not merely as a flag.
    const consents = await prisma.consentRecord.count({ where: { contactId: contact.id } });
    expect(consents).toBeGreaterThan(0);
  });
});

describe('9. Les analytics utilisent de vrais événements en base', () => {
  it('reflète exactement les événements enregistrés', async () => {
    const ws = await createWorkspace('Analytics');
    try {
      const account = await createEmailAccount(ws.id);
      const segment = await createSegment(ws.id);
      const { form, page } = await createLandingPage(ws.id);
      for (let i = 0; i < 3; i++) await createContact(ws.id);

      const campaign = await createCampaign(ws.id, {
        segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
      });
      await buildRecipients(campaign.id);

      const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId: campaign.id } });
      for (const recipient of recipients) await sendRecipient(recipient.id);

      // One click and one submission.
      await prisma.campaignEvent.create({
        data: {
          workspaceId: ws.id, campaignId: campaign.id, recipientId: recipients[0].id,
          contactId: recipients[0].contactId, type: 'CLICKED', dedupeKey: `t-click-${recipients[0].id}`,
        },
      });
      await prisma.campaignEvent.create({
        data: {
          workspaceId: ws.id, campaignId: campaign.id, recipientId: recipients[0].id,
          type: 'LANDING_VIEW', dedupeKey: `t-view-${recipients[0].id}`,
        },
      });
      await intakeSubmission({
        workspaceId: ws.id, formId: form.id, landingPageId: page.id,
        recipientToken: recipients[0].trackingToken,
        answers: { prenom: 'Test', email: 'lead@exemple.fr', telephone: '0612345678', code_postal: '69003', besoin: 'changer' },
        consentGiven: true, consentText: 'test',
      });

      const funnel = await getFunnel({ workspaceId: ws.id });
      expect(funnel.counts.sent).toBe(3);
      expect(funnel.counts.uniqueClicks).toBe(1);
      expect(funnel.counts.landingViews).toBe(1);
      expect(funnel.counts.formSubmits).toBe(1);
      expect(funnel.counts.leads).toBe(1);
      // No provider delivery webhook here: delivered falls back to sent − bounced.
      expect(funnel.counts.delivered).toBe(3);
      expect(funnel.rates.landingConversionRate).toBe(100);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });

  it('renvoie des prévisions nulles quand les données sont insuffisantes', async () => {
    const ws = await createWorkspace('Forecast');
    try {
      const forecast = await forecastForTarget(ws.id, 15);
      expect(forecast.hasEnoughData).toBe(false);
      expect(forecast.requiredVisits).toBeNull();
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });

  it('compte l’objectif quotidien à partir des leads réellement qualifiés', async () => {
    const ws = await createWorkspace('Goal');
    try {
      await prisma.lead.createMany({
        data: [
          { workspaceId: ws.id, product: 'AUTO', score: 85, scoreBand: 'HOT', status: 'QUALIFIE' },
          { workspaceId: ws.id, product: 'AUTO', score: 62, scoreBand: 'GOOD', status: 'QUALIFIE' },
          { workspaceId: ws.id, product: 'AUTO', score: 31, scoreBand: 'LOW', status: 'NOUVEAU' },
        ],
      });
      const goal = await getDailyGoalStatus(ws.id);
      expect(goal.achieved).toBe(2);
      expect(goal.minTarget).toBe(10);
      expect(goal.stretchTarget).toBe(20);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});

describe('Qualification des leads', () => {
  it('note plus haut un dossier complet avec échéance proche', () => {
    const complete = scoreLead({
      product: 'AUTO', campaignProduct: 'AUTO',
      answers: { besoin: 'changer', rappel: 'matin', marque: 'Renault', modele: 'Clio', annee: '2019', assureur_actuel: 'AXA', bonus_malus: '0.68', message: 'Merci' },
      email: 'a@b.fr', phone: '0612345678', postalCode: '69003', city: 'Lyon',
      firstName: 'Jean', lastName: 'Dupont',
      renewalDate: new Date(Date.now() + 15 * 86_400_000),
      currentInsurer: 'AXA', cameFromCampaign: true, contactVerified: true,
    });
    const sparse = scoreLead({
      product: 'AUTO', campaignProduct: 'AUTO',
      answers: {}, email: 'c@d.fr', phone: null, postalCode: null, city: null,
      firstName: null, lastName: null, renewalDate: null, currentInsurer: null,
      cameFromCampaign: false,
    });

    expect(complete.score).toBeGreaterThan(sparse.score);
    expect(complete.score).toBeGreaterThanOrEqual(60);
    expect(complete.band).toMatch(/HOT|GOOD/);
    expect(sparse.band).toBe('LOW');
  });

  it('borne le score entre 0 et 100 et explique chaque point', () => {
    const result = scoreLead({
      product: 'SANTE', campaignProduct: 'SANTE',
      answers: { besoin: 'changer', rappel: 'soir', a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
      email: 'x@y.fr', phone: '0612345678', postalCode: '75011', city: 'Paris',
      firstName: 'A', lastName: 'B', renewalDate: new Date(Date.now() + 5 * 86_400_000),
      currentInsurer: 'MAIF', cameFromCampaign: true, contactVerified: true,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.every((f) => f.detail.length > 0)).toBe(true);
  });
});

describe('Enregistrement des visites de landing page', () => {
  it('enregistre la visite sans dépendre d’un cookie inscriptible', async () => {
    // `recordLandingView` runs inside a Server Component render, where
    // `cookies().set()` throws. It must fall back to a request fingerprint
    // rather than silently dropping the event.
    const ws = await createWorkspace('View');
    try {
      const { page } = await createLandingPage(ws.id);
      const { recordLandingView } = await import('@/server/actions/funnel');
      await recordLandingView(page.id, null);

      const views = await prisma.campaignEvent.count({
        where: { workspaceId: ws.id, type: 'LANDING_VIEW' },
      });
      expect(views).toBe(1);

      // A second view in the same hour from the same visitor is deduplicated.
      await recordLandingView(page.id, null);
      expect(await prisma.campaignEvent.count({ where: { workspaceId: ws.id, type: 'LANDING_VIEW' } })).toBe(1);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});

describe('Détection et fusion des doublons', () => {
  it('détecte les contacts partageant un numéro et fusionne sans perdre d’historique', async () => {
    const ws = await createWorkspace('Doublons');
    try {
      const { findDuplicates, mergeContacts } = await import('@/server/services/duplicates');

      const primary = await prisma.contact.create({
        data: {
          workspaceId: ws.id, email: 'jean.dupont@exemple.fr', emailNormalized: 'jean.dupont@exemple.fr',
          firstName: 'Jean', lastName: 'Dupont', phone: '0612345678', phoneNormalized: '+33612345678',
          city: 'Lyon', source: 'site', consentEmail: 'GRANTED', emailMarketingAllowed: true,
        },
      });
      const duplicate = await prisma.contact.create({
        data: {
          workspaceId: ws.id, email: 'j.dupont@exemple.fr', emailNormalized: 'j.dupont@exemple.fr',
          firstName: 'Jean', lastName: 'Dupont', phone: '06 12 34 56 78', phoneNormalized: '+33612345678',
          postalCode: '69003', currentInsurer: 'AXA', consentEmail: 'GRANTED',
          // The duplicate opted out: the merged record must inherit that.
          unsubscribed: true, suppressed: true,
        },
      });
      const lead = await prisma.lead.create({
        data: { workspaceId: ws.id, contactId: duplicate.id, product: 'AUTO', score: 70, scoreBand: 'GOOD' },
      });

      const groups = await findDuplicates(ws.id);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].kind).toBe('PHONE');
      expect(groups[0].contacts.map((c) => c.id).sort()).toEqual([primary.id, duplicate.id].sort());

      const outcome = await mergeContacts(ws.id, primary.id, [duplicate.id]);
      expect(outcome.mergedCount).toBe(1);
      expect(outcome.movedLeads).toBe(1);

      const merged = await prisma.contact.findUniqueOrThrow({ where: { id: primary.id } });
      // Empty fields were filled from the duplicate…
      expect(merged.postalCode).toBe('69003');
      expect(merged.currentInsurer).toBe('AXA');
      // …existing values were kept…
      expect(merged.city).toBe('Lyon');
      // …and the most restrictive state won.
      expect(merged.suppressed).toBe(true);
      expect(merged.unsubscribed).toBe(true);
      expect(merged.emailMarketingAllowed).toBe(false);

      // The lead followed the merge; the duplicate is gone.
      const movedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
      expect(movedLead.contactId).toBe(primary.id);
      expect(await prisma.contact.findUnique({ where: { id: duplicate.id } })).toBeNull();

      // The merge is traceable.
      const audit = await prisma.auditLog.count({ where: { workspaceId: ws.id, action: 'contact.merge' } });
      expect(audit).toBe(1);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });

  it('refuse de fusionner un contact avec lui-même', async () => {
    const ws = await createWorkspace('DoublonsSelf');
    try {
      const { mergeContacts } = await import('@/server/services/duplicates');
      const contact = await createContact(ws.id);
      await expect(mergeContacts(ws.id, contact.id, [contact.id])).rejects.toThrow(/Aucun doublon/);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});
