/**
 * Hand-picked campaign recipients.
 *
 * A manual add is an explicit human decision, so it is not filtered by the
 * audience policy the way a segment is. The hard invariants still hold.
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import {
  prisma, createWorkspace, createEmailAccount, createContact, createLandingPage, cleanupWorkspace,
} from './helpers';
import { addManualRecipients, removeManualRecipient, buildRecipients, sendRecipient } from '@/server/services/sending';
import { evaluateCampaignReadiness } from '@/server/services/readiness';

let workspaceId: string;
let emailAccountId: string;
let landingPageId: string;

async function makeCampaign(status: 'DRAFT' | 'SENDING' = 'DRAFT') {
  return prisma.campaign.create({
    data: {
      workspaceId, name: `Manuelle ${crypto.randomBytes(3).toString('hex')}`,
      objective: 'QUOTE_REQUEST', product: 'SANTE', status,
      emailAccountId, landingPageId, batchSize: 100,
      variants: {
        create: [{
          label: 'A', weight: 100, isControl: true,
          subject: 'Bonjour {{first_name}}', bodyText: 'Bonjour,\n\n[[CTA]]', ctaLabel: 'Voir',
        }],
      },
    },
  });
}

beforeAll(async () => {
  const ws = await createWorkspace('Manuel');
  workspaceId = ws.id;
  emailAccountId = (await createEmailAccount(ws.id)).id;
  const { page } = await createLandingPage(ws.id);
  landingPageId = page.id;
});

afterAll(async () => {
  await cleanupWorkspace(workspaceId);
  await prisma.$disconnect();
});

describe('Ajout manuel de destinataires', () => {
  it('ajoute une seule adresse et crée le contact manquant', async () => {
    const campaign = await makeCampaign();
    const email = `nouveau-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;

    const res = await addManualRecipients(campaign.id, [email]);

    expect(res.added).toBe(1);
    expect(res.total).toBe(1);
    expect(res.results[0].outcome).toBe('CONTACT_CREATED');

    const contact = await prisma.contact.findUniqueOrThrow({
      where: { workspaceId_emailNormalized: { workspaceId, emailNormalized: email.toLowerCase() } },
    });
    // Consent is never invented by a manual add.
    expect(contact.consentEmail).toBe('UNKNOWN');
    expect(contact.emailMarketingAllowed).toBe(false);
    expect(contact.source).toBe('ajout_manuel');
    expect(res.results[0].warnings.join(' ')).toMatch(/consentement/i);
  });

  it('accepte plusieurs adresses séparées et ignore les doublons de saisie', async () => {
    const campaign = await makeCampaign();
    const a = `a-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;
    const b = `b-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;

    const res = await addManualRecipients(campaign.id, [a, b, a.toUpperCase()]);

    expect(res.added).toBe(2);
    expect(res.results).toHaveLength(2);
  });

  it('n’ajoute jamais une adresse sur la liste de suppression', async () => {
    const campaign = await makeCampaign();
    const email = `supprime-${crypto.randomBytes(4).toString('hex')}@exemple.fr`;
    await prisma.suppressionEntry.create({
      data: { workspaceId, email, emailNormalized: email.toLowerCase(), reason: 'MANUAL_BLOCK' },
    });

    const res = await addManualRecipients(campaign.id, [email]);

    expect(res.added).toBe(0);
    expect(res.results[0].outcome).toBe('SUPPRESSED');
    expect(await prisma.campaignRecipient.count({ where: { campaignId: campaign.id } })).toBe(0);
  });

  it('refuse un contact désinscrit ou invalide', async () => {
    const campaign = await makeCampaign();
    const unsub = await createContact(workspaceId, { unsubscribed: true });
    const invalid = await createContact(workspaceId, { verificationStatus: 'INVALID' });

    const res = await addManualRecipients(campaign.id, [unsub.email, invalid.email]);

    expect(res.added).toBe(0);
    expect(res.results.map((r) => r.outcome).sort()).toEqual(['INVALID_EMAIL', 'UNSUBSCRIBED']);
  });

  it('ajoute un contact sans consentement, que le segment aurait exclu', async () => {
    const campaign = await makeCampaign();
    // The workspace policy requires explicit consent, so a segment would skip
    // this contact. A person naming the address is a different decision.
    const contact = await createContact(workspaceId, { consentEmail: 'UNKNOWN', emailMarketingAllowed: false });

    const res = await addManualRecipients(campaign.id, [contact.email]);

    expect(res.added).toBe(1);
    expect(res.results[0].outcome).toBe('ADDED');
  });

  it('signale un doublon sans créer une seconde ligne', async () => {
    const campaign = await makeCampaign();
    const contact = await createContact(workspaceId);

    await addManualRecipients(campaign.id, [contact.email]);
    const again = await addManualRecipients(campaign.id, [contact.email]);

    expect(again.added).toBe(0);
    expect(again.results[0].outcome).toBe('ALREADY_PRESENT');
    expect(await prisma.campaignRecipient.count({ where: { campaignId: campaign.id, contactId: contact.id } })).toBe(1);
  });

  it('rejette une adresse syntaxiquement invalide', async () => {
    const campaign = await makeCampaign();
    const res = await addManualRecipients(campaign.id, ['pas-une-adresse']);
    expect(res.added).toBe(0);
    expect(res.results[0].outcome).toBe('INVALID_SYNTAX');
  });

  it('envoie réellement à un destinataire ajouté à la main', async () => {
    const campaign = await makeCampaign('SENDING');
    const contact = await createContact(workspaceId);
    await addManualRecipients(campaign.id, [contact.email]);

    const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });
    const outcome = await sendRecipient(recipient.id);

    expect(outcome.status).toBe('SENT');
    const after = await prisma.campaignRecipient.findUniqueOrThrow({ where: { id: recipient.id } });
    expect(after.manual).toBe(true);
    expect(after.sentAt).not.toBeNull();
  });

  it('une campagne sans segment se construit sans erreur et conserve les ajouts', async () => {
    const campaign = await makeCampaign();
    const contact = await createContact(workspaceId);
    await addManualRecipients(campaign.id, [contact.email]);

    const built = await buildRecipients(campaign.id);

    expect(built.total).toBe(1);
    expect(await prisma.campaignRecipient.count({ where: { campaignId: campaign.id } })).toBe(1);
  });

  it('le contrôle de préparation accepte une liste choisie à la main', async () => {
    const campaign = await makeCampaign();
    const before = await evaluateCampaignReadiness(campaign.id);
    expect(before.blocking.some((b) => b.key === 'audience_size')).toBe(true);

    await addManualRecipients(campaign.id, [(await createContact(workspaceId)).email]);
    const after = await evaluateCampaignReadiness(campaign.id);

    expect(after.blocking.some((b) => b.key === 'audience_size')).toBe(false);
  });

  it('retire un destinataire non envoyé, jamais un envoyé', async () => {
    const campaign = await makeCampaign('SENDING');
    const keep = await createContact(workspaceId);
    const drop = await createContact(workspaceId);
    await addManualRecipients(campaign.id, [keep.email, drop.email]);

    const dropRow = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id, contactId: drop.id } });
    expect(await removeManualRecipient(campaign.id, dropRow.id)).toBe(true);

    const keepRow = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id, contactId: keep.id } });
    await sendRecipient(keepRow.id);
    // Already sent — the record of the send must survive.
    expect(await removeManualRecipient(campaign.id, keepRow.id)).toBe(false);
    expect(await prisma.campaignRecipient.count({ where: { id: keepRow.id } })).toBe(1);
  });
});
