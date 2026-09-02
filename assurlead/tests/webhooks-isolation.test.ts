/**
 * Webhook idempotency, unsubscribe propagation, workspace isolation
 * and import behaviour at scale.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  prisma, createWorkspace, createEmailAccount, createContact, createSegment,
  createLandingPage, createCampaign, cleanupWorkspace,
} from './helpers';
import { buildRecipients, sendRecipient, eligibilityWhere } from '@/server/services/sending';
import { ingestEvents, normalizeEvents, verifySignature } from '@/server/services/webhooks';
import { addSuppression, filterSuppressed, isSuppressed } from '@/server/services/suppression';
import { buildSegmentWhere } from '@/server/services/segments';
import { contactWhere } from '@/server/services/contact-filters';
import { suggestMapping, parseFile, UPLOAD_DIR } from '@/server/services/import';
import { renderTemplate, contactVariables } from '@/server/services/personalization';

let workspaceId: string;

beforeAll(async () => {
  const ws = await createWorkspace('Webhooks');
  workspaceId = ws.id;
});

afterAll(async () => {
  await cleanupWorkspace(workspaceId);
  await prisma.$disconnect();
});

describe('4. Un webhook dupliqué ne crée JAMAIS d’événement en double', () => {
  it('ignore la seconde livraison du même événement', async () => {
    const account = await createEmailAccount(workspaceId);
    const segment = await createSegment(workspaceId);
    const { page } = await createLandingPage(workspaceId);
    const contact = await createContact(workspaceId);

    const campaign = await createCampaign(workspaceId, {
      segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING',
    });
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });
    await sendRecipient(recipient.id);

    const payload = [{ event: 'delivered', email: contact.email, id: 'evt-unique-1', date: new Date().toISOString() }];
    const events = normalizeEvents('brevo', payload);
    expect(events).toHaveLength(1);

    const first = await ingestEvents(workspaceId, 'brevo', events);
    const second = await ingestEvents(workspaceId, 'brevo', events);
    const third = await ingestEvents(workspaceId, 'brevo', events);

    expect(first.processed).toBe(1);
    expect(second.processed).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(third.duplicates).toBe(1);

    const delivered = await prisma.campaignEvent.count({
      where: { workspaceId, type: 'DELIVERED', contactId: contact.id },
    });
    expect(delivered).toBe(1);
  });

  it('supprime l’adresse sur rebond définitif, une seule fois', async () => {
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
    await sendRecipient(recipient.id);

    const events = normalizeEvents('brevo', [{ event: 'hard_bounce', email: contact.email, id: 'evt-bounce-1' }]);
    await ingestEvents(workspaceId, 'brevo', events);
    await ingestEvents(workspaceId, 'brevo', events);

    expect(await isSuppressed(workspaceId, contact.email)).toBe(true);
    const entries = await prisma.suppressionEntry.count({
      where: { workspaceId, emailNormalized: contact.email.toLowerCase() },
    });
    expect(entries).toBe(1);

    const updated = await prisma.campaignRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(updated.status).toBe('BOUNCED');
  });

  it('normalise correctement les formats Mailgun et Postmark', () => {
    const mailgun = normalizeEvents('mailgun', {
      'event-data': { event: 'failed', severity: 'permanent', recipient: 'a@b.fr', id: 'mg-1', timestamp: 1700000000 },
    });
    expect(mailgun[0].type).toBe('BOUNCED');

    const soft = normalizeEvents('mailgun', {
      'event-data': { event: 'failed', severity: 'temporary', recipient: 'a@b.fr', id: 'mg-2', timestamp: 1700000000 },
    });
    expect(soft[0].type).toBe('SOFT_BOUNCED');

    const postmark = normalizeEvents('postmark', { RecordType: 'Bounce', Recipient: 'a@b.fr', ID: 'pm-1' });
    expect(postmark[0].type).toBe('BOUNCED');
  });

  it('rejette une signature de webhook invalide', () => {
    const body = JSON.stringify({ hello: 'world' });
    const secret = 'shared-secret';
    const valid = crypto.createHmac('sha256', secret).update(body).digest('hex');

    expect(verifySignature('other', body, new Headers({ 'x-assurlead-signature': valid }), secret)).toBe(true);
    expect(verifySignature('other', body, new Headers({ 'x-assurlead-signature': 'wrong' }), secret)).toBe(false);
    expect(verifySignature('other', body, new Headers(), secret)).toBe(false);
  });
});

describe('5. Une désinscription bloque immédiatement les envois programmés', () => {
  it('annule les destinataires en attente sur toutes les campagnes', async () => {
    const ws = await createWorkspace('Unsub');
    try {
      const account = await createEmailAccount(ws.id);
      const segment = await createSegment(ws.id);
      const { page } = await createLandingPage(ws.id);
      const contact = await createContact(ws.id);

      const first = await createCampaign(ws.id, { segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING' });
      const second = await createCampaign(ws.id, { segmentId: segment.id, emailAccountId: account.id, landingPageId: page.id, status: 'SENDING' });
      await buildRecipients(first.id);
      await buildRecipients(second.id);

      expect(await prisma.campaignRecipient.count({ where: { contactId: contact.id, status: 'PENDING' } })).toBe(2);

      await addSuppression({ workspaceId: ws.id, email: contact.email, reason: 'UNSUBSCRIBED', source: 'test' });

      expect(await prisma.campaignRecipient.count({ where: { contactId: contact.id, status: 'PENDING' } })).toBe(0);
      expect(await prisma.campaignRecipient.count({ where: { contactId: contact.id, status: 'SUPPRESSED' } })).toBe(2);

      const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
      expect(updated.suppressed).toBe(true);
      expect(updated.emailMarketingAllowed).toBe(false);

      // And is excluded from any future campaign build.
      const policy = await prisma.compliancePolicy.findUniqueOrThrow({ where: { workspaceId: ws.id } });
      const eligible = await prisma.contact.count({ where: eligibilityWhere({ workspaceId: ws.id }, policy) });
      expect(eligible).toBe(0);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });

  it('filterSuppressed renvoie uniquement les adresses supprimées', async () => {
    const ws = await createWorkspace('Filter');
    try {
      const a = await createContact(ws.id);
      const b = await createContact(ws.id);
      await addSuppression({ workspaceId: ws.id, email: a.email, reason: 'DO_NOT_CONTACT' });
      const set = await filterSuppressed(ws.id, [a.emailNormalized, b.emailNormalized]);
      expect(set.has(a.emailNormalized)).toBe(true);
      expect(set.has(b.emailNormalized)).toBe(false);
    } finally {
      await cleanupWorkspace(ws.id);
    }
  });
});

describe('7. Un espace de travail ne voit JAMAIS les contacts d’un autre', () => {
  it('cloisonne les requêtes de contacts', async () => {
    const a = await createWorkspace('TenantA');
    const b = await createWorkspace('TenantB');
    try {
      const contactA = await createContact(a.id, { email: 'a@tenant-a.fr' });
      await createContact(b.id, { email: 'b@tenant-b.fr' });

      const fromA = await prisma.contact.findMany({ where: contactWhere(a.id, {}) });
      expect(fromA).toHaveLength(1);
      expect(fromA[0].id).toBe(contactA.id);

      // Even an explicit search for the other tenant's address returns nothing.
      const search = await prisma.contact.findMany({ where: contactWhere(a.id, { q: 'tenant-b' }) });
      expect(search).toHaveLength(0);
    } finally {
      await cleanupWorkspace(a.id);
      await cleanupWorkspace(b.id);
    }
  });

  it('cloisonne les segments et la liste de suppression', async () => {
    const a = await createWorkspace('SegA');
    const b = await createWorkspace('SegB');
    try {
      await createContact(a.id);
      await createContact(b.id);
      const contactB = await prisma.contact.findFirstOrThrow({ where: { workspaceId: b.id } });

      const whereA = buildSegmentWhere(a.id, { match: 'AND', conditions: [] });
      const inA = await prisma.contact.findMany({ where: whereA });
      expect(inA.every((c) => c.workspaceId === a.id)).toBe(true);

      await addSuppression({ workspaceId: b.id, email: contactB.email, reason: 'MANUAL_BLOCK' });
      expect(await isSuppressed(a.id, contactB.email)).toBe(false);
      expect(await isSuppressed(b.id, contactB.email)).toBe(true);
    } finally {
      await cleanupWorkspace(a.id);
      await cleanupWorkspace(b.id);
    }
  });
});

describe('10. L’import gère un fichier volumineux sans hypothèse sur la mémoire du navigateur', () => {
  it('reconnaît automatiquement les colonnes françaises courantes', () => {
    const mapping = suggestMapping([
      'Adresse e-mail', 'Prénom', 'NOM', 'Téléphone', 'Code Postal',
      'Ville', "Date d'échéance", 'Type assurance', 'Assureur actuel', 'Colonne inconnue',
    ]);
    expect(mapping['Adresse e-mail']).toBe('email');
    expect(mapping['Prénom']).toBe('firstName');
    expect(mapping['NOM']).toBe('lastName');
    expect(mapping['Téléphone']).toBe('phone');
    expect(mapping['Code Postal']).toBe('postalCode');
    expect(mapping['Ville']).toBe('city');
    expect(mapping["Date d'échéance"]).toBe('renewalDate');
    expect(mapping['Type assurance']).toBe('insuranceInterests');
    expect(mapping['Assureur actuel']).toBe('currentInsurer');
    expect(mapping['Colonne inconnue']).toBe('');
  });

  it('analyse un fichier côté serveur et ne renvoie qu’un échantillon', async () => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const uploadId = `test-${crypto.randomBytes(5).toString('hex')}.csv`;
    const filePath = path.join(UPLOAD_DIR, uploadId);

    const rows = ['email,prenom,nom,ville'];
    for (let i = 0; i < 5000; i++) rows.push(`user${i}@exemple.fr,Prenom${i},Nom${i},Lyon`);
    await fs.writeFile(filePath, rows.join('\n'));

    try {
      const full = await parseFile(filePath);
      expect(full.totalRows).toBe(5000);

      // The preview path only ever materialises a bounded slice.
      const preview = await parseFile(filePath, 20);
      expect(preview.rows).toHaveLength(20);
      expect(preview.totalRows).toBe(5000);
      expect(preview.headers).toEqual(['email', 'prenom', 'nom', 'ville']);
    } finally {
      await fs.unlink(filePath).catch(() => undefined);
    }
  });
});

describe('Personnalisation', () => {
  it('ne produit jamais « Bonjour undefined »', () => {
    const rendered = renderTemplate('Bonjour {{first_name}}, votre contrat {{insurance_type}} arrive à échéance le {{renewal_date}}.', {});
    expect(rendered).not.toContain('undefined');
    expect(rendered).not.toContain('{{');
    expect(rendered).toBe('Bonjour, votre contrat votre assurance arrive à échéance le votre prochaine échéance.');
  });

  it('utilise les vraies valeurs quand elles existent', () => {
    const vars = contactVariables({
      firstName: 'Marie', lastName: 'Durand', city: 'Lyon',
      currentInsurer: 'AXA', insuranceInterests: ['AUTO'],
      renewalDate: new Date('2026-10-15'),
    });
    const rendered = renderTemplate('Bonjour {{first_name}} {{last_name}} de {{city}}, assuré chez {{current_insurer}}.', vars);
    expect(rendered).toBe('Bonjour Marie Durand de Lyon, assuré chez AXA.');
  });

  it('gère proprement une variable inconnue', () => {
    const rendered = renderTemplate('Test {{variable_inexistante}} fin.', {});
    expect(rendered).not.toContain('undefined');
    expect(rendered).not.toContain('{{');
  });
});
