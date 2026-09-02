/**
 * Capture from a landing page the client hosts themselves.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import {
  prisma, createWorkspace, createEmailAccount, createContact, createSegment,
  createLandingPage, createCampaign, cleanupWorkspace,
} from './helpers';
import {
  authenticateCapture, generatePublicKey, generateSecretKey, hashSecretKey,
  mapSubmission, normalizeOrigin, originAllowed, recordCaptureEvent, resolveTrackingToken,
} from '@/server/services/capture';
import { intakeSubmission } from '@/server/services/lead-intake';
import { buildRecipients, sendRecipient } from '@/server/services/sending';

let workspaceId: string;
let formId: string;
let publicKey: string;
let secretKey: string;
let siteId: string;

beforeAll(async () => {
  const ws = await createWorkspace('Capture');
  workspaceId = ws.id;

  const { form } = await createLandingPage(ws.id);
  formId = form.id;

  publicKey = generatePublicKey();
  secretKey = generateSecretKey();
  const site = await prisma.captureSite.create({
    data: {
      workspaceId,
      name: 'Page externe',
      url: 'https://exemple-client.fr/etude-comparative',
      publicKey,
      secretKeyHash: hashSecretKey(secretKey),
      allowedOrigins: ['https://exemple-client.fr'],
      formId,
      product: 'SANTE',
      consentText: "J'accepte d'être recontacté.",
    },
  });
  siteId = site.id;
});

afterAll(async () => {
  await cleanupWorkspace(workspaceId);
  await prisma.$disconnect();
});

describe('Contrôle d’origine', () => {
  it('accepte la clé publique depuis un domaine autorisé', async () => {
    const result = await authenticateCapture(publicKey, null, 'https://exemple-client.fr');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.channel).toBe('browser');
  });

  it('refuse la clé publique depuis un autre domaine', async () => {
    const result = await authenticateCapture(publicKey, null, 'https://site-malveillant.fr');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('refuse la clé publique sans origine', async () => {
    const result = await authenticateCapture(publicKey, null, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('accepte la clé secrète sans origine, pour un appel serveur', async () => {
    const result = await authenticateCapture(null, secretKey, null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.channel).toBe('server');
  });

  it('refuse une clé secrète invalide', async () => {
    const result = await authenticateCapture(null, generateSecretKey(), null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('refuse un site désactivé', async () => {
    await prisma.captureSite.update({ where: { id: siteId }, data: { active: false } });
    const result = await authenticateCapture(publicKey, null, 'https://exemple-client.fr');
    expect(result.ok).toBe(false);
    await prisma.captureSite.update({ where: { id: siteId }, data: { active: true } });
  });

  it('normalise les origines et tolère le domaine nu', () => {
    expect(normalizeOrigin('https://exemple.fr/page?a=1')).toBe('https://exemple.fr');
    expect(originAllowed('https://exemple.fr', ['exemple.fr'])).toBe(true);
    expect(originAllowed('https://exemple.fr', ['https://exemple.fr/'])).toBe(true);
    expect(originAllowed('https://autre.fr', ['exemple.fr'])).toBe(false);
    expect(originAllowed('https://exemple.fr', [])).toBe(false);
  });
});

describe('Correspondance des champs', () => {
  it('reconnaît les noms de champs français courants', () => {
    const { answers } = mapSubmission(
      {
        Prénom: 'Marie', NOM: 'Durand', 'E-mail': 'marie@exemple.fr',
        'Téléphone': '06 12 34 56 78', 'Code Postal': '69003', Ville: 'Lyon',
        'Mutuelle actuelle': 'AXA',
      },
      {},
    );
    expect(answers.prenom).toBe('Marie');
    expect(answers.nom).toBe('Durand');
    expect(answers.email).toBe('marie@exemple.fr');
    expect(answers.telephone).toBe('06 12 34 56 78');
    expect(answers.code_postal).toBe('69003');
    expect(answers.ville).toBe('Lyon');
    expect(answers.assureur_actuel).toBe('AXA');
  });

  it('applique une correspondance explicite par-dessus les alias', () => {
    const { answers } = mapSubmission({ champ_perso_12: 'marie@exemple.fr' }, { champ_perso_12: 'email' });
    expect(answers.email).toBe('marie@exemple.fr');
  });

  it('conserve les champs inconnus au lieu de les perdre', () => {
    const { answers } = mapSubmission({ 'Nombre de bénéficiaires': '2' }, {});
    expect(answers.nombre_de_beneficiaires).toBe('2');
  });

  it('ignore les champs techniques et les pots de miel', () => {
    const { answers } = mapSubmission({ _csrf: 'x', honeypot: 'y', email: 'a@b.fr' }, {});
    expect(answers._csrf).toBeUndefined();
    expect(answers.honeypot).toBeUndefined();
    expect(answers.email).toBe('a@b.fr');
  });

  it('détecte le consentement, coché ou non', () => {
    const accepted = mapSubmission({ consentement_rgpd: true, email: 'a@b.fr' }, {});
    expect(accepted.consentFieldPresent).toBe(true);
    expect(accepted.consentGiven).toBe(true);

    const refused = mapSubmission({ consentement_rgpd: false, email: 'a@b.fr' }, {});
    expect(refused.consentFieldPresent).toBe(true);
    expect(refused.consentGiven).toBe(false);

    const absent = mapSubmission({ email: 'a@b.fr' }, {});
    expect(absent.consentFieldPresent).toBe(false);
    expect(absent.consentGiven).toBe(false);
  });
});

describe('Création de lead depuis une page externe', () => {
  it('crée un lead scoré et trace la provenance externe', async () => {
    const { answers } = mapSubmission(
      {
        Prénom: 'Jeanne', NOM: 'Martin', 'E-mail': `externe-${crypto.randomBytes(4).toString('hex')}@exemple.fr`,
        'Téléphone': '0612345678', 'Code Postal': '69003', Ville: 'Lyon',
        besoin: 'comparer', consentement: true,
      },
      {},
    );

    const result = await intakeSubmission({
      workspaceId,
      formId,
      landingPageId: null,
      answers,
      consentGiven: true,
      consentText: "J'accepte d'être recontacté.",
      externalSource: { captureSiteId: siteId, channel: 'browser', pageUrl: 'https://exemple-client.fr/etude-comparative' },
    });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: result.leadId },
      include: { scores: true, activities: true, contact: true },
    });
    expect(lead.score).toBeGreaterThan(0);
    expect(lead.scores).toHaveLength(1);
    // Provenance says plainly that this came from an external page.
    expect(lead.contact?.source).toBe('landing_externe');
    expect(lead.contact?.sourceDetail).toContain('exemple-client.fr');
    expect(lead.activities.some((a) => a.title.includes('page externe'))).toBe(true);
    // The capture origin is retained on the submission for audit.
    const submission = await prisma.formSubmission.findUniqueOrThrow({ where: { id: result.submissionId } });
    expect((submission.answers as Record<string, unknown>).__capture).toMatchObject({ siteId, channel: 'browser' });
  });

  it('n’assume jamais le consentement quand la page n’en collecte pas', async () => {
    const email = `sans-consent-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;
    const result = await intakeSubmission({
      workspaceId,
      formId,
      landingPageId: null,
      answers: { prenom: 'Paul', email, telephone: '0698765432' },
      consentGiven: false,
      consentText: '',
      externalSource: { captureSiteId: siteId, channel: 'browser', pageUrl: null },
    });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: result.leadId },
      include: { contact: true },
    });
    expect(lead.contact?.consentEmail).toBe('UNKNOWN');
    expect(lead.contact?.emailMarketingAllowed).toBe(false);
  });

  it('rattache le lead à la campagne via le jeton de suivi', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const contact = await createContact(workspaceId);
    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, status: 'SENDING',
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { externalLandingUrl: 'https://exemple-client.fr/etude-comparative' },
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, contactId: contact.id },
    });
    await sendRecipient(recipient.id);

    const resolved = await resolveTrackingToken(workspaceId, recipient.trackingToken);
    expect(resolved?.campaignId).toBe(campaign.id);

    await recordCaptureEvent({
      site: { id: siteId, workspaceId, formId, product: 'SANTE', fieldMapping: {}, consentText: '', requireConsentField: true },
      type: 'LANDING_VIEW',
      token: recipient.trackingToken,
      sessionId: 'sess-1',
    });

    const result = await intakeSubmission({
      workspaceId,
      formId,
      landingPageId: null,
      recipientToken: recipient.trackingToken,
      answers: { prenom: 'Lucie', email: contact.email, telephone: '0612345678', code_postal: '75011' },
      consentGiven: true,
      consentText: 'ok',
      externalSource: { captureSiteId: siteId, channel: 'browser', pageUrl: null },
    });

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: result.leadId } });
    expect(lead.campaignId).toBe(campaign.id);
    expect(lead.contactId).toBe(contact.id);

    // The funnel now reflects the external page.
    const views = await prisma.campaignEvent.count({ where: { campaignId: campaign.id, type: 'LANDING_VIEW' } });
    const submits = await prisma.campaignEvent.count({ where: { campaignId: campaign.id, type: 'FORM_SUBMIT' } });
    expect(views).toBe(1);
    expect(submits).toBe(1);
  });

  it('ne rattache pas un jeton appartenant à un autre espace de travail', async () => {
    const other = await createWorkspace('AutreCapture');
    try {
      const account = await createEmailAccount(other.id);
      const segment = await createSegment(other.id);
      await createContact(other.id);
      const campaign = await createCampaign(other.id, { segmentId: segment.id, emailAccountId: account.id });
      await buildRecipients(campaign.id);
      const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });

      const resolved = await resolveTrackingToken(workspaceId, recipient.trackingToken);
      expect(resolved).toBeNull();
    } finally {
      await cleanupWorkspace(other.id);
    }
  });

  it('déduplique les vues d’un même visiteur dans l’heure', async () => {
    const site = { id: siteId, workspaceId, formId, product: 'SANTE', fieldMapping: {}, consentText: '', requireConsentField: true };
    const before = await prisma.campaignEvent.count({ where: { workspaceId, type: 'LANDING_VIEW' } });
    await recordCaptureEvent({ site, type: 'LANDING_VIEW', token: null, sessionId: 'sess-dedupe' });
    await recordCaptureEvent({ site, type: 'LANDING_VIEW', token: null, sessionId: 'sess-dedupe' });
    const after = await prisma.campaignEvent.count({ where: { workspaceId, type: 'LANDING_VIEW' } });
    expect(after - before).toBe(1);
  });
});
