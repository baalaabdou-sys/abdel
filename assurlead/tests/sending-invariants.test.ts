/**
 * The invariants that must never break, whatever else changes.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  prisma, createWorkspace, createEmailAccount, createContact, createSegment,
  createLandingPage, createCampaign, cleanupWorkspace,
} from './helpers';
import { buildRecipients, sendRecipient, evaluateAudience, eligibilityWhere } from '@/server/services/sending';
import { addSuppression } from '@/server/services/suppression';

let workspaceId: string;

beforeAll(async () => {
  const ws = await createWorkspace('Invariants');
  workspaceId = ws.id;
});

afterAll(async () => {
  await cleanupWorkspace(workspaceId);
  await prisma.$disconnect();
});

describe('1. Un contact supprimé ne reçoit JAMAIS d’email', () => {
  it('exclut le contact au moment de la construction de la liste', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    const good = await createContact(workspaceId);
    const suppressed = await createContact(workspaceId, { suppressed: true });

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id,
    });
    await buildRecipients(campaign.id);

    const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId: campaign.id } });
    const ids = recipients.map((r) => r.contactId);
    expect(ids).toContain(good.id);
    expect(ids).not.toContain(suppressed.id);
  });

  it('bloque encore l’envoi si la suppression arrive APRÈS la construction de la liste', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    const contact = await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);

    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, contactId: contact.id },
    });

    // The contact unsubscribes between list build and send.
    await addSuppression({ workspaceId, email: contact.email, reason: 'UNSUBSCRIBED', source: 'test' });

    const outcome = await sendRecipient(recipient.id);
    expect(outcome.status).toBe('SUPPRESSED');

    const after = await prisma.campaignRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(after.status).toBe('SUPPRESSED');
    expect(after.sentAt).toBeNull();

    const sentEvents = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id, contactId: contact.id, type: 'SENT' },
    });
    expect(sentEvents).toBe(0);
  });
});

describe('2. Une adresse invalide ne reçoit JAMAIS d’email', () => {
  it('ignore le destinataire au moment de l’envoi', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    const contact = await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, contactId: contact.id },
    });

    // Verification runs after the list was built and marks the address invalid.
    await prisma.contact.update({ where: { id: contact.id }, data: { verificationStatus: 'INVALID' } });

    const outcome = await sendRecipient(recipient.id);
    expect(outcome.status).toBe('SKIPPED');
    const after = await prisma.campaignRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(after.status).toBe('SKIPPED');
    expect(after.sentAt).toBeNull();
  });

  it('exclut les adresses invalides de l’audience éligible', async () => {
    const ws = await createWorkspace('Eligibilite');
    try {
      await createContact(ws.id, { verificationStatus: 'VALID' });
      await createContact(ws.id, { verificationStatus: 'INVALID' });
      const policy = await prisma.compliancePolicy.findUniqueOrThrow({ where: { workspaceId: ws.id } });
      const result = await evaluateAudience(ws.id, { workspaceId: ws.id }, policy);
      expect(result.total).toBe(2);
      expect(result.eligible).toBe(1);
      expect(result.issues.INVALID_EMAIL).toBe(1);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});

describe('3. Une reprise de job ne provoque JAMAIS de doublon d’envoi', () => {
  it('renvoie ALREADY_SENT au second appel', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, status: 'PENDING' },
    });

    const first = await sendRecipient(recipient.id);
    expect(first.status).toBe('SENT');

    const second = await sendRecipient(recipient.id);
    expect(second.status).toBe('ALREADY_SENT');

    const sentEvents = await prisma.campaignEvent.count({
      where: { recipientId: recipient.id, type: 'SENT' },
    });
    expect(sentEvents).toBe(1);
  });

  it('résiste à deux envois concurrents pour le même destinataire', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, status: 'PENDING' },
    });

    const results = await Promise.all([sendRecipient(recipient.id), sendRecipient(recipient.id)]);
    const sent = results.filter((r) => r.status === 'SENT');
    expect(sent).toHaveLength(1);

    const sentEvents = await prisma.campaignEvent.count({ where: { recipientId: recipient.id, type: 'SENT' } });
    expect(sentEvents).toBe(1);
  });

  it('ne crée jamais deux destinataires pour le même contact', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id,
    });
    const first = await buildRecipients(campaign.id);
    const second = await buildRecipients(campaign.id);

    expect(second.created).toBe(0);
    expect(second.total).toBe(first.total);
  });
});

describe('6. Une campagne ne peut PAS partir sans lancement explicite', () => {
  it('refuse l’envoi tant que le statut n’est pas SENDING', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'DRAFT',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });

    const outcome = await sendRecipient(recipient.id);
    expect(outcome.status).toBe('SKIPPED');
    expect(outcome.detail).toContain('DRAFT');

    const sentEvents = await prisma.campaignEvent.count({ where: { campaignId: campaign.id, type: 'SENT' } });
    expect(sentEvents).toBe(0);
  });

  it('n’envoie plus rien une fois la campagne mise en pause', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } });

    const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });
    const outcome = await sendRecipient(recipient.id);
    expect(outcome.status).toBe('SKIPPED');
  });
});

describe('La politique de conformité pilote l’éligibilité', () => {
  it('exclut les consentements inconnus quand la politique l’exige', async () => {
    const ws = await createWorkspace('Consentement');
    try {
      await createContact(ws.id, { consentEmail: 'GRANTED', emailMarketingAllowed: true });
      await createContact(ws.id, { consentEmail: 'UNKNOWN', emailMarketingAllowed: true });

      const strict = await prisma.compliancePolicy.findUniqueOrThrow({ where: { workspaceId: ws.id } });
      const strictCount = await prisma.contact.count({ where: eligibilityWhere({ workspaceId: ws.id }, strict) });
      expect(strictCount).toBe(1);

      const relaxed = await prisma.compliancePolicy.update({
        where: { workspaceId: ws.id },
        data: { allowUnknownConsent: true },
      });
      const relaxedCount = await prisma.contact.count({ where: eligibilityWhere({ workspaceId: ws.id }, relaxed) });
      expect(relaxedCount).toBe(2);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});

describe('Campagne programmée', () => {
  it('démarre à l’heure prévue, et pas avant', async () => {
    const ws = await createWorkspace('Programmee');
    try {
      const account = await createEmailAccount(ws.id);
      const segment = await createSegment(ws.id);
      const { page } = await createLandingPage(ws.id);
      await createContact(ws.id);

      const campaign = await createCampaign(ws.id, {
        segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id,
      });
      await buildRecipients(campaign.id);

      const { dispatchCampaignBatch } = await import('@/server/services/sending');

      // Launched, but scheduled for later: nothing must be queued.
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'SCHEDULED', launchedAt: new Date(), scheduledAt: new Date(Date.now() + 3_600_000) },
      });
      const early = await dispatchCampaignBatch(campaign.id);
      expect(early.queued).toBe(0);
      expect(early.reason).toBe('not_due_yet');
      expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('SCHEDULED');

      // Once the scheduled moment has passed, the dispatch starts the sending.
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { scheduledAt: new Date(Date.now() - 60_000) },
      });
      const due = await dispatchCampaignBatch(campaign.id);
      expect(due.queued).toBe(1);
      expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('SENDING');
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });

  it('ne démarre jamais une campagne programmée qui n’a pas été lancée', async () => {
    const ws = await createWorkspace('JamaisLancee');
    try {
      const account = await createEmailAccount(ws.id);
      const segment = await createSegment(ws.id);
      const { page } = await createLandingPage(ws.id);
      await createContact(ws.id);

      const campaign = await createCampaign(ws.id, {
        segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id,
      });
      await buildRecipients(campaign.id);
      // Scheduled date in the past, but never launched: must stay put.
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 60_000), launchedAt: null },
      });

      const { dispatchCampaignBatch } = await import('@/server/services/sending');
      const result = await dispatchCampaignBatch(campaign.id);
      expect(result.queued).toBe(0);
      expect(result.reason).toBe('never_launched');
      expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('SCHEDULED');
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});
