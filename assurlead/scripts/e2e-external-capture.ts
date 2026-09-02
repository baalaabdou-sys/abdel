/**
 * End-to-end verification of the external landing page path, over real HTTP:
 * a campaign whose CTA points at a page the client hosts, a browser-style
 * capture from that page, and a server-side capture from their backend.
 *
 * Development use only.
 */
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.APP_URL ?? 'http://localhost:3000';
const CLIENT_ORIGIN = 'https://exemple-client.fr';
const CLIENT_PAGE = `${CLIENT_ORIGIN}/etude-comparative`;

const steps: { label: string; ok: boolean }[] = [];
function check(label: string, ok: boolean, detail = '') {
  steps.push({ label, ok });
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const suffix = crypto.randomBytes(4).toString('hex');
  const workspace = await prisma.workspace.create({ data: { name: `Ext ${suffix}`, slug: `ext-${suffix}` } });

  try {
    const { bootstrapWorkspace } = await import('@/server/services/workspace-bootstrap');
    await bootstrapWorkspace(workspace.id);
    await prisma.compliancePolicy.update({
      where: { workspaceId: workspace.id },
      data: { requireSourceRecorded: false },
    });
    await prisma.user.create({
      data: {
        email: `sales-ext-${suffix}@exemple.fr`, name: 'Commercial', passwordHash: 'x'.repeat(60),
        memberships: { create: { workspaceId: workspace.id, role: 'SALES' } },
      },
    });

    // ── Capture site for the client's existing page ─────────────
    const { generatePublicKey, generateSecretKey, hashSecretKey } = await import('@/server/services/capture');
    const publicKey = generatePublicKey();
    const secretKey = generateSecretKey();

    const form = await prisma.form.create({
      data: {
        workspaceId: workspace.id, name: 'Capture externe', product: 'SANTE', multiStep: false,
        steps: [{ key: 'contact', title: 'Contact', description: '' }] as never,
        consentText: "J'accepte d'être recontacté.", successMessage: 'Merci !',
        fields: {
          create: [
            { key: 'prenom', label: 'Prénom', type: 'text', step: 1, order: 1, required: false },
            { key: 'email', label: 'Email', type: 'email', step: 1, order: 2, required: false },
            { key: 'telephone', label: 'Téléphone', type: 'tel', step: 1, order: 3, required: false },
          ],
        },
      },
    });
    await prisma.captureSite.create({
      data: {
        workspaceId: workspace.id, name: 'Étude comparative', url: CLIENT_PAGE,
        publicKey, secretKeyHash: hashSecretKey(secretKey),
        allowedOrigins: [CLIENT_ORIGIN], formId: form.id, product: 'SANTE',
        consentText: "J'accepte d'être recontacté.",
      },
    });
    check('Site de capture déclaré', true, CLIENT_ORIGIN);

    // ── Campaign pointing at the external page ──────────────────
    const account = await prisma.emailAccount.create({
      data: {
        workspaceId: workspace.id, provider: 'DEMO', label: 'Ext', fromEmail: 'contact@exemple.fr',
        fromName: 'Cabinet', status: 'CONNECTED', dailyLimit: 500, warmupEnabled: false,
      },
    });
    const email = `ext-${suffix}@exemple.fr`;
    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id, email, emailNormalized: email, firstName: 'Simone', lastName: 'Bernard',
        city: 'Lyon', insuranceInterests: ['SANTE'], source: 'test', consentEmail: 'GRANTED',
        emailMarketingAllowed: true, verificationStatus: 'VALID',
      },
    });
    const segment = await prisma.segment.create({
      data: { workspaceId: workspace.id, name: 'Tous', kind: 'DYNAMIC', rules: { match: 'AND', conditions: [] } as never },
    });
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: workspace.id, name: 'Mutuelle sénior', objective: 'QUOTE_REQUEST', product: 'SANTE',
        status: 'SENDING', segmentId: segment.id, emailAccountId: account.id,
        externalLandingUrl: CLIENT_PAGE, launchedAt: new Date(), startedAt: new Date(),
        variants: {
          create: [{
            label: 'A', weight: 100, isControl: true, subject: 'Votre étude comparative',
            bodyText: 'Bonjour {{first_name}},\n\nVoici votre étude comparative personnalisée.\n\n[[CTA]]\n\nCordialement,',
            ctaLabel: 'Voir mon étude',
          }],
        },
      },
    });

    const { buildRecipients, sendRecipient } = await import('@/server/services/sending');
    await buildRecipients(campaign.id);
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({ where: { campaignId: campaign.id } });
    await sendRecipient(recipient.id);
    check('Campagne envoyée vers la page externe', true);

    // ── The recipient clicks the CTA (real HTTP) ────────────────
    const click = await fetch(`${BASE}/c/${recipient.trackingToken}`, { redirect: 'manual' });
    const location = click.headers.get('location') ?? '';
    check(
      'Le CTA redirige vers la page du client avec le jeton',
      click.status === 302 && location.startsWith(CLIENT_PAGE) && location.includes(`alid=${recipient.trackingToken}`),
      location,
    );

    // ── The snippet is served ───────────────────────────────────
    const embed = await fetch(`${BASE}/api/embed`);
    const embedBody = await embed.text();
    check(
      'Script de capture servi',
      embed.ok && embedBody.includes('assurlead') && embedBody.includes('alid'),
      `${embedBody.length} octets`,
    );

    // ── Browser capture: view, then lead ────────────────────────
    const sessionId = `sess-${suffix}`;
    const viewRes = await fetch(`${BASE}/api/capture/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CLIENT_ORIGIN },
      body: JSON.stringify({ key: publicKey, type: 'LANDING_VIEW', token: recipient.trackingToken, sessionId, pageUrl: CLIENT_PAGE }),
    });
    check('Visite de la page externe enregistrée', viewRes.ok);

    const wrongOrigin = await fetch(`${BASE}/api/capture/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://site-malveillant.fr' },
      body: JSON.stringify({ key: publicKey, type: 'LANDING_VIEW', sessionId: 'x' }),
    });
    check('Une origine non autorisée est refusée', wrongOrigin.status === 403);

    const leadRes = await fetch(`${BASE}/api/capture/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CLIENT_ORIGIN },
      body: JSON.stringify({
        key: publicKey,
        token: recipient.trackingToken,
        sessionId,
        pageUrl: CLIENT_PAGE,
        fields: {
          'Prénom': 'Simone', 'NOM': 'Bernard', 'E-mail': email,
          'Téléphone': '0612345678', 'Code Postal': '69003',
          'Mutuelle actuelle': 'AXA', consentement_rgpd: true,
        },
      }),
    });
    const leadJson = (await leadRes.json()) as { leadId?: string; score?: number; error?: string };
    check('Lead créé depuis la page externe', leadRes.ok && !!leadJson.leadId, leadJson.error ?? `score ${leadJson.score}/100`);

    if (leadJson.leadId) {
      const lead = await prisma.lead.findUniqueOrThrow({
        where: { id: leadJson.leadId },
        include: { contact: true, scores: true },
      });
      check('Lead rattaché à la campagne', lead.campaignId === campaign.id);
      check('Lead rattaché au contact existant', lead.contactId === contact.id);
      check('Score expliqué', lead.scores.length === 1 && (lead.scores[0].breakdown as unknown[]).length > 0,
        `${(lead.scores[0].breakdown as unknown[]).length} facteurs`);
      // The contact already existed (it was the campaign recipient), so its
      // original `sourceDetail` must be preserved and the external visit
      // recorded as an additional provenance row.
      const sources = await prisma.contactSource.findMany({ where: { contactId: contact.id } });
      check(
        'Provenance externe enregistrée',
        sources.some((s) => s.source === 'landing_externe' && (s.detail ?? '').includes('exemple-client.fr')),
        `${sources.length} source(s)`,
      );
      check('Commercial assigné automatiquement', !!lead.ownerId);
    }

    const notifications = await prisma.notification.count({ where: { workspaceId: workspace.id } });
    check('Équipe notifiée', notifications >= 1, `${notifications} notification(s)`);

    // ── Server-side capture, without an Origin header ───────────
    const serverEmail = `serveur-${suffix}@exemple.fr`;
    const serverRes = await fetch(`${BASE}/api/capture/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({
        fields: { prenom: 'Robert', nom: 'Dubois', email: serverEmail, telephone: '0698765432', consentement: true },
      }),
    });
    const serverJson = (await serverRes.json()) as { leadId?: string; error?: string };
    check('Capture serveur à serveur acceptée', serverRes.ok && !!serverJson.leadId, serverJson.error ?? '');

    const badSecret = await fetch(`${BASE}/api/capture/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer als_invalide' },
      body: JSON.stringify({ fields: { email: 'x@y.fr' } }),
    });
    check('Une clé secrète invalide est refusée', badSecret.status === 401);

    // ── Consent is never assumed ────────────────────────────────
    const noConsentEmail = `sansconsent-${suffix}@exemple.fr`;
    const noConsent = await fetch(`${BASE}/api/capture/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CLIENT_ORIGIN },
      body: JSON.stringify({ key: publicKey, fields: { prenom: 'Alice', email: noConsentEmail, telephone: '0611111111' } }),
    });
    const noConsentJson = (await noConsent.json()) as { leadId?: string };
    const created = noConsentJson.leadId
      ? await prisma.contact.findUnique({ where: { workspaceId_emailNormalized: { workspaceId: workspace.id, emailNormalized: noConsentEmail } } })
      : null;
    check(
      'Sans case de consentement, le consentement reste « inconnu »',
      created?.consentEmail === 'UNKNOWN' && created?.emailMarketingAllowed === false,
    );

    // ── A submission with neither email nor phone is refused ────
    const empty = await fetch(`${BASE}/api/capture/lead`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CLIENT_ORIGIN },
      body: JSON.stringify({ key: publicKey, fields: { message: 'bonjour' } }),
    });
    check('Une demande sans moyen de contact est refusée', empty.status === 422);

    // ── The funnel reflects the external page ───────────────────
    const { getFunnel } = await import('@/server/services/analytics');
    const funnel = await getFunnel({ workspaceId: workspace.id });
    check(
      'Entonnoir alimenté par la page externe',
      funnel.counts.sent === 1 && funnel.counts.landingViews === 1 && funnel.counts.formSubmits >= 1,
      `${funnel.counts.sent} envoyé · ${funnel.counts.landingViews} visite · ${funnel.counts.formSubmits} formulaire(s) · ${funnel.counts.leads} lead(s)`,
    );

    const site = await prisma.captureSite.findFirstOrThrow({ where: { workspaceId: workspace.id } });
    check('Compteurs du site de capture à jour', site.viewCount >= 1 && site.leadCount >= 1,
      `${site.viewCount} vue(s), ${site.leadCount} lead(s)`);

    console.log('\n' + '─'.repeat(60));
    const failed = steps.filter((s) => !s.ok);
    console.log(failed.length === 0
      ? `✓ Capture externe validée : ${steps.length}/${steps.length} étapes.`
      : `✗ ${failed.length} étape(s) en échec : ${failed.map((f) => f.label).join(', ')}`);
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: suffix } } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
