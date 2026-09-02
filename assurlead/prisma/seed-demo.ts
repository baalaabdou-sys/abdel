/**
 * Demo dataset.
 *
 * Everything created here carries `isDemo: true` (and the workspace is flagged
 * as a demo workspace) so demo figures are never mixed with real production
 * analytics. Run with `npm run seed:demo`.
 */
import { PrismaClient, type InsuranceType, type Prisma, type VerificationStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const CONTACT_COUNT = Number(process.env.DEMO_CONTACTS ?? 5000);

const FIRST_NAMES = ['Marie', 'Jean', 'Sophie', 'Thomas', 'Camille', 'Nicolas', 'Julie', 'Pierre', 'Émilie', 'Antoine', 'Laura', 'Maxime', 'Céline', 'Julien', 'Aurélie', 'Sébastien', 'Nathalie', 'Alexandre', 'Sandrine', 'Damien', 'Nadia', 'Karim', 'Fatima', 'Lucas', 'Chloé', 'Hugo', 'Manon', 'Yanis', 'Inès', 'Théo'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Chevalier', 'Francois', 'Legrand'];
const CITIES: [string, string][] = [
  ['Paris', '75011'], ['Lyon', '69003'], ['Marseille', '13008'], ['Toulouse', '31000'],
  ['Nice', '06000'], ['Nantes', '44000'], ['Montpellier', '34000'], ['Strasbourg', '67000'],
  ['Bordeaux', '33000'], ['Lille', '59000'], ['Rennes', '35000'], ['Reims', '51100'],
  ['Grenoble', '38000'], ['Dijon', '21000'], ['Angers', '49000'], ['Villeurbanne', '69100'],
];
const INSURERS = ['AXA', 'MAIF', 'Macif', 'Groupama', 'Allianz', 'MAAF', 'GMF', 'Matmut', 'Direct Assurance', 'Generali', 'Aviva', 'Crédit Agricole Assurances'];
const PROFESSIONS = ['Cadre', 'Employé', 'Artisan', 'Commerçant', 'Profession libérale', 'Enseignant', 'Infirmier', 'Retraité', 'Étudiant', 'Technicien', 'Ingénieur', 'Consultant'];
const PRODUCTS: InsuranceType[] = ['AUTO', 'MOTO', 'HABITATION', 'SANTE', 'PREVOYANCE', 'RC_PRO'];
const SOURCES = ['Formulaire site web', 'Salon Assurance 2025', 'Partenaire comparateur', 'Recommandation client', 'Campagne Google Ads', 'Base historique cabinet'];

/** Deterministic PRNG so repeated seeds produce a comparable dataset. */
let seedState = 42;
function rnd(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
const intBetween = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const workspace = await prisma.workspace.findUnique({ where: { slug: 'cabinet-assurances-demo' } });
  if (!workspace) throw new Error('Lancez d’abord `npm run seed`.');
  const ws = workspace.id;

  console.log('→ Nettoyage des données de démonstration existantes…');
  await prisma.lead.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.campaign.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.landingPage.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.form.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.segment.deleteMany({ where: { workspaceId: ws } });
  await prisma.contact.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.template.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.campaignEvent.deleteMany({ where: { workspaceId: ws } });
  await prisma.task.deleteMany({ where: { workspaceId: ws, isDemo: true } });
  await prisma.notification.deleteMany({ where: { workspaceId: ws } });

  // ── Contacts ────────────────────────────────────────────────
  console.log(`→ Génération de ${CONTACT_COUNT} contacts…`);
  const verifications: [VerificationStatus, number][] = [
    ['VALID', 0.68], ['LIKELY_VALID', 0.12], ['CATCH_ALL', 0.07],
    ['RISKY', 0.04], ['INVALID', 0.05], ['UNVERIFIED', 0.04],
  ];

  const contactRows: Prisma.ContactCreateManyInput[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < CONTACT_COUNT; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const [city, postalCode] = pick(CITIES);
    let email = `${firstName}.${lastName}${i}@${pick(['gmail.com', 'orange.fr', 'free.fr', 'outlook.fr', 'wanadoo.fr', 'sfr.fr', 'laposte.net', 'yahoo.fr'])}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    while (usedEmails.has(email)) email = `x${email}`;
    usedEmails.add(email);

    let roll = rnd();
    let verificationStatus: VerificationStatus = 'VALID';
    for (const [status, weight] of verifications) {
      if (roll < weight) { verificationStatus = status; break; }
      roll -= weight;
    }

    const interests: InsuranceType[] = [pick(PRODUCTS)];
    if (chance(0.25)) interests.push(pick(PRODUCTS));

    const hasRenewal = chance(0.7);
    const renewalDate = hasRenewal ? daysFromNow(intBetween(-90, 300)) : null;
    const age = intBetween(23, 72);
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);

    const consentRoll = rnd();
    const consentEmail = consentRoll < 0.72 ? 'GRANTED' : consentRoll < 0.93 ? 'UNKNOWN' : 'DENIED';
    const suppressed = chance(0.02);

    contactRows.push({
      workspaceId: ws,
      email,
      emailNormalized: email,
      firstName,
      lastName,
      phone: `0${intBetween(6, 7)}${String(intBetween(10000000, 99999999))}`,
      phoneNormalized: `+33${intBetween(6, 7)}${String(intBetween(10000000, 99999999))}`,
      city,
      postalCode,
      country: 'FR',
      birthDate,
      age,
      profession: chance(0.6) ? pick(PROFESSIONS) : null,
      status: chance(0.22) ? 'CUSTOMER' : 'PROSPECT',
      insuranceInterests: Array.from(new Set(interests)),
      currentInsurer: chance(0.75) ? pick(INSURERS) : null,
      renewalDate,
      renewalMonth: renewalDate ? renewalDate.getMonth() + 1 : null,
      source: pick(SOURCES),
      sourceDetail: 'Données de démonstration',
      importedAt: daysFromNow(-intBetween(1, 400)),
      consentEmail: consentEmail as 'GRANTED',
      consentPhone: consentEmail === 'GRANTED' && chance(0.8) ? 'GRANTED' : 'UNKNOWN',
      consentDate: consentEmail === 'GRANTED' ? daysFromNow(-intBetween(1, 400)) : null,
      consentSource: consentEmail === 'GRANTED' ? 'Formulaire de collecte' : null,
      emailMarketingAllowed: consentEmail === 'GRANTED',
      phoneContactAllowed: consentEmail === 'GRANTED' && chance(0.8),
      verificationStatus,
      verifiedAt: verificationStatus === 'UNVERIFIED' ? null : daysFromNow(-intBetween(1, 60)),
      verificationProvider: verificationStatus === 'UNVERIFIED' ? null : 'demo',
      verificationConfidence: verificationStatus === 'UNVERIFIED' ? null : intBetween(55, 98),
      suppressed,
      unsubscribed: suppressed && chance(0.5),
      tags: chance(0.3) ? [pick(['premium', 'relance', 'fidèle', 'nouveau'])] : [],
      isDemo: true,
    });
  }

  for (let i = 0; i < contactRows.length; i += 1000) {
    await prisma.contact.createMany({ data: contactRows.slice(i, i + 1000), skipDuplicates: true });
    process.stdout.write(`\r  ${Math.min(i + 1000, contactRows.length)}/${contactRows.length}`);
  }
  console.log('');

  const suppressedContacts = await prisma.contact.findMany({
    where: { workspaceId: ws, suppressed: true }, select: { email: true }, take: 200,
  });
  await prisma.suppressionEntry.createMany({
    data: suppressedContacts.map((c) => ({
      workspaceId: ws, email: c.email, emailNormalized: c.email.toLowerCase(),
      reason: 'UNSUBSCRIBED' as const, source: 'Données de démonstration',
    })),
    skipDuplicates: true,
  });

  // ── Segments ────────────────────────────────────────────────
  console.log('→ Segments…');
  const segmentDefs = [
    {
      name: 'Assurance Auto — Paris — échéance < 60 jours',
      description: 'Prospects auto en Île-de-France dont le contrat arrive bientôt à échéance.',
      rules: { match: 'AND', conditions: [
        { field: 'insuranceInterests', operator: 'has', value: 'AUTO' },
        { field: 'city', operator: 'equals', value: 'Paris' },
        { field: 'renewalDate', operator: 'within_days', value: 60 },
      ] },
    },
    {
      name: 'Mutuelle Santé — 30 à 55 ans',
      description: 'Cœur de cible pour les campagnes mutuelle.',
      rules: { match: 'AND', conditions: [
        { field: 'insuranceInterests', operator: 'has', value: 'SANTE' },
        { field: 'age', operator: 'between', value: [30, 55] },
      ] },
    },
    {
      name: 'Assurance Habitation — toutes zones',
      description: 'Base habitation avec consentement email accordé.',
      rules: { match: 'AND', conditions: [
        { field: 'insuranceInterests', operator: 'has', value: 'HABITATION' },
        { field: 'consentEmail', operator: 'equals', value: 'GRANTED' },
      ] },
    },
    {
      name: 'Contacts vérifiés jamais contactés',
      description: 'Adresses vérifiées n’ayant jamais reçu de campagne.',
      rules: { match: 'AND', conditions: [
        { field: 'verificationStatus', operator: 'in', value: ['VALID', 'LIKELY_VALID'] },
        { field: 'campaignHistory', operator: 'never_contacted', value: true },
      ] },
    },
  ];

  const { buildSegmentWhere } = await import('../src/server/services/segments');
  const segments = [];
  for (const def of segmentDefs) {
    const count = await prisma.contact.count({ where: buildSegmentWhere(ws, def.rules) });
    segments.push(await prisma.segment.create({
      data: {
        workspaceId: ws, name: def.name, description: def.description,
        kind: 'DYNAMIC', rules: def.rules as never, cachedCount: count, countedAt: new Date(),
      },
    }));
  }

  // ── Landing pages + forms ───────────────────────────────────
  console.log('→ Landing pages et formulaires…');
  const { LANDING_TEMPLATES, DEFAULT_THEME } = await import('../src/server/services/landing-templates');
  const pages = [];
  for (const template of LANDING_TEMPLATES.slice(0, 5)) {
    const form = await prisma.form.create({
      data: {
        workspaceId: ws,
        name: `Formulaire — ${template.name}`,
        product: template.product,
        multiStep: template.formSteps.length > 1,
        steps: template.formSteps as never,
        consentText: template.consentText,
        successMessage: 'Merci ! Votre demande est enregistrée. Un conseiller vous recontacte rapidement.',
        isDemo: true,
        fields: {
          create: template.formFields.map((f) => ({
            key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
            required: f.required, options: (f.options ?? []) as never,
            placeholder: f.placeholder ?? '', helpText: f.helpText ?? '',
          })),
        },
      },
    });
    pages.push(await prisma.landingPage.create({
      data: {
        workspaceId: ws,
        name: template.name,
        slug: `demo-${template.key}`,
        product: template.product,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        sections: template.sections as never,
        theme: DEFAULT_THEME as never,
        formId: form.id,
        seoTitle: template.name,
        seoDescription: template.description,
        isDemo: true,
      },
    }));
  }

  // ── Templates ───────────────────────────────────────────────
  await prisma.template.createMany({
    data: [
      { workspaceId: ws, name: 'Relance échéance Auto', category: 'Renouvellement', product: 'AUTO',
        subject: 'Votre contrat auto arrive à échéance le {{renewal_date}}',
        previewText: 'Comparez avant reconduction — étude gratuite',
        bodyText: "Bonjour {{first_name}},\n\nVotre contrat auto chez {{current_insurer}} arrive à échéance le {{renewal_date}}. C'est le moment de vérifier que vos garanties correspondent toujours à votre usage.\n\n[[CTA]]\n\nBien cordialement,\nCabinet Assurances Léman",
        isDemo: true },
      { workspaceId: ws, name: 'Découverte Mutuelle Santé', category: 'Mutuelle', product: 'SANTE',
        subject: 'Votre mutuelle correspond-elle encore à vos besoins ?',
        previewText: 'Étude gratuite, sans question de santé',
        bodyText: "Bonjour {{first_name}},\n\nBeaucoup de contrats santé ne sont plus adaptés après quelques années. Un conseiller peut faire le point avec vous, sans engagement.\n\n[[CTA]]\n\nBien cordialement,\nCabinet Assurances Léman",
        isDemo: true },
      { workspaceId: ws, name: 'Cross-sell Habitation', category: 'Cross-sell', product: 'HABITATION',
        subject: '{{first_name}}, et votre assurance habitation ?',
        previewText: 'Un seul interlocuteur pour tous vos contrats',
        bodyText: "Bonjour {{first_name}},\n\nVous nous faites déjà confiance pour un de vos contrats. Nous pouvons également étudier votre assurance habitation à {{city}}.\n\n[[CTA]]\n\nBien cordialement,\nCabinet Assurances Léman",
        isDemo: true },
      { workspaceId: ws, name: 'Réactivation prospects', category: 'Relance', product: 'AUTRE',
        subject: 'Souhaitez-vous toujours étudier votre contrat ?',
        previewText: 'Nous restons disponibles',
        bodyText: "Bonjour {{first_name}},\n\nVous nous aviez contactés au sujet d'une étude d'assurance. Si le sujet est toujours d'actualité, un conseiller peut reprendre votre dossier.\n\n[[CTA]]\n\nBien cordialement,\nCabinet Assurances Léman",
        isDemo: true },
    ],
  });

  // ── Email account + domain ──────────────────────────────────
  const domain = await prisma.sendingDomain.upsert({
    where: { workspaceId_domain: { workspaceId: ws, domain: 'exemple.fr' } },
    update: {},
    create: {
      workspaceId: ws, domain: 'exemple.fr',
      spf: 'CONFIGURED', dkim: 'CONFIGURED', dmarc: 'NEEDS_ATTENTION',
      spfRecord: 'v=spf1 include:spf.exemple.fr -all',
      dmarcRecord: 'v=DMARC1; p=none; rua=mailto:dmarc@exemple.fr',
      lastCheckedAt: new Date(),
      notes: 'La politique DMARC est en observation (p=none) : à renforcer progressivement.',
    },
  });
  const account = await prisma.emailAccount.findFirst({ where: { workspaceId: ws } })
    ?? await prisma.emailAccount.create({
      data: { workspaceId: ws, provider: 'DEMO', label: 'Expéditeur DEMO', fromEmail: 'contact@exemple.fr', fromName: 'Cabinet Assurances Léman', status: 'CONNECTED' },
    });
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { domainId: domain.id, fromEmail: 'contact@exemple.fr', fromName: 'Cabinet Assurances Léman', dailyLimit: 3000, warmupEnabled: false },
  });

  // ── Campaigns with realistic funnel history ─────────────────
  console.log('→ Campagnes et historique de l’entonnoir…');
  const campaignDefs = [
    { name: 'Assurance Auto — Septembre', product: 'AUTO' as InsuranceType, segment: segments[0], page: pages[0], days: 21, recipients: 4200, clickRate: 0.058, lpConv: 0.19, qualRate: 0.66 },
    { name: 'Mutuelle Santé — Rentrée', product: 'SANTE' as InsuranceType, segment: segments[1], page: pages[1], days: 12, recipients: 2800, clickRate: 0.041, lpConv: 0.14, qualRate: 0.58 },
    { name: 'Habitation — Propriétaires', product: 'HABITATION' as InsuranceType, segment: segments[2], page: pages[2], days: 5, recipients: 1600, clickRate: 0.036, lpConv: 0.12, qualRate: 0.52 },
  ];

  const salesUsers = await prisma.workspaceMember.findMany({
    where: { workspaceId: ws, role: 'SALES' }, select: { userId: true },
  });

  const contactPool = await prisma.contact.findMany({
    where: { workspaceId: ws, suppressed: false, verificationStatus: { in: ['VALID', 'LIKELY_VALID'] } },
    select: { id: true, email: true, firstName: true, lastName: true, city: true, postalCode: true, currentInsurer: true, renewalDate: true },
    take: 9000,
  });

  let poolIndex = 0;
  let totalLeads = 0;

  for (const def of campaignDefs) {
    const launchedAt = daysFromNow(-def.days);
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: ws, name: def.name, objective: 'QUOTE_REQUEST', product: def.product,
        status: 'COMPLETED', segmentId: def.segment.id, emailAccountId: account.id,
        landingPageId: def.page.id, launchedAt, startedAt: launchedAt,
        completedAt: daysFromNow(-def.days + 3), recipientCount: def.recipients,
        readinessScore: intBetween(78, 94), isDemo: true,
        variants: {
          create: [{
            label: 'A', weight: 100, isControl: true,
            subject: `${def.name} — votre étude personnalisée`,
            previewText: 'Étude gratuite et sans engagement',
            ctaLabel: 'Demander mon étude',
            bodyText: `Bonjour {{first_name}},\n\nNous pouvons étudier votre contrat ${def.product.toLowerCase()} et le comparer aux offres de nos partenaires.\n\n[[CTA]]\n\nBien cordialement,\nCabinet Assurances Léman`,
          }],
        },
      },
      include: { variants: true },
    });
    const variant = campaign.variants[0];

    const events: Prisma.CampaignEventCreateManyInput[] = [];
    const recipients: Prisma.CampaignRecipientCreateManyInput[] = [];
    const leadSeeds: { contact: (typeof contactPool)[number]; occurredAt: Date }[] = [];

    const sendCount = Math.min(def.recipients, contactPool.length);
    for (let i = 0; i < sendCount; i++) {
      // Wrap around the pool: each campaign has its own audience slice, and a
      // contact may legitimately appear in more than one campaign.
      const contact = contactPool[(poolIndex + i) % contactPool.length];
      if (!contact) break;
      const sentAt = new Date(launchedAt.getTime() + (i / sendCount) * 3 * 86_400_000);
      const token = crypto.randomBytes(18).toString('base64url');
      const bounced = chance(0.021);

      recipients.push({
        campaignId: campaign.id, contactId: contact.id, variantId: variant.id,
        sendKey: crypto.createHash('sha256').update(`${campaign.id}:${contact.id}`).digest('hex'),
        trackingToken: token, status: bounced ? 'BOUNCED' : 'SENT', sentAt,
      });
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, variantId: variant.id, type: 'SENT', dedupeKey: `demo-sent:${campaign.id}:${contact.id}`, occurredAt: sentAt });

      if (bounced) {
        events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, type: 'BOUNCED', dedupeKey: `demo-bounce:${campaign.id}:${contact.id}`, occurredAt: new Date(sentAt.getTime() + 6e5) });
        continue;
      }
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, type: 'DELIVERED', dedupeKey: `demo-deliv:${campaign.id}:${contact.id}`, occurredAt: new Date(sentAt.getTime() + 3e5) });

      if (!chance(def.clickRate)) continue;
      const clickedAt = new Date(sentAt.getTime() + intBetween(10, 2880) * 60_000);
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, variantId: variant.id, type: 'CLICKED', dedupeKey: `demo-click:${campaign.id}:${contact.id}`, occurredAt: clickedAt });
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, type: 'LANDING_VIEW', dedupeKey: `demo-view:${campaign.id}:${contact.id}`, occurredAt: new Date(clickedAt.getTime() + 4000) });

      if (!chance(0.55)) continue;
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, type: 'FORM_START', dedupeKey: `demo-start:${campaign.id}:${contact.id}`, occurredAt: new Date(clickedAt.getTime() + 20000) });

      if (!chance(def.lpConv / 0.55)) continue;
      events.push({ workspaceId: ws, campaignId: campaign.id, contactId: contact.id, type: 'FORM_SUBMIT', dedupeKey: `demo-submit:${campaign.id}:${contact.id}`, occurredAt: new Date(clickedAt.getTime() + 180000) });
      leadSeeds.push({ contact, occurredAt: new Date(clickedAt.getTime() + 180000) });
    }

    for (let i = 0; i < recipients.length; i += 1000) {
      await prisma.campaignRecipient.createMany({ data: recipients.slice(i, i + 1000), skipDuplicates: true });
    }
    for (let i = 0; i < events.length; i += 1000) {
      await prisma.campaignEvent.createMany({ data: events.slice(i, i + 1000), skipDuplicates: true });
    }

    // ── Leads ─────────────────────────────────────────────────
    for (const seed of leadSeeds) {
      const qualified = chance(def.qualRate);
      const score = qualified ? intBetween(60, 96) : intBetween(18, 59);
      const band = score >= 80 ? 'HOT' : score >= 60 ? 'GOOD' : score >= 40 ? 'CHECK' : 'LOW';
      const owner = salesUsers.length ? pick(salesUsers).userId : null;
      const contactedAfter = chance(0.78) ? intBetween(2, 180) : null;

      let status: string = qualified ? 'QUALIFIE' : 'NOUVEAU';
      let appointmentAt: Date | null = null;
      let wonAt: Date | null = null;
      if (qualified) {
        const r = rnd();
        if (r < 0.14) { status = 'GAGNE'; wonAt = new Date(seed.occurredAt.getTime() + 6 * 86_400_000); appointmentAt = new Date(seed.occurredAt.getTime() + 2 * 86_400_000); }
        else if (r < 0.32) { status = 'RENDEZ_VOUS'; appointmentAt = new Date(seed.occurredAt.getTime() + 3 * 86_400_000); }
        else if (r < 0.48) status = 'DEVIS_ENVOYE';
        else if (r < 0.62) status = 'TRES_INTERESSE';
        else if (r < 0.78) status = 'CONTACTE';
        else if (r < 0.88) status = 'PERDU';
      }

      const lead = await prisma.lead.create({
        data: {
          workspaceId: ws, contactId: seed.contact.id, campaignId: campaign.id,
          product: def.product, status: status as 'NOUVEAU', score, scoreBand: band,
          firstName: seed.contact.firstName, lastName: seed.contact.lastName,
          email: seed.contact.email, phone: `06${intBetween(10000000, 99999999)}`,
          city: seed.contact.city, postalCode: seed.contact.postalCode,
          currentInsurer: seed.contact.currentInsurer, renewalDate: seed.contact.renewalDate,
          answers: { besoin: pick(['changer', 'comparer', 'nouveau']), rappel: pick(['matin', 'apres_midi', 'soir']) } as never,
          ownerId: owner, assignedAt: owner ? seed.occurredAt : null,
          firstActionAt: contactedAfter ? new Date(seed.occurredAt.getTime() + contactedAfter * 60_000) : null,
          responseMinutes: contactedAfter,
          contactedAt: contactedAfter ? new Date(seed.occurredAt.getTime() + contactedAfter * 60_000) : null,
          appointmentAt, wonAt, value: wonAt ? intBetween(320, 1450) : null,
          createdAt: seed.occurredAt, isDemo: true,
        },
      });
      totalLeads += 1;

      await prisma.leadScore.create({
        data: {
          leadId: lead.id, score, band,
          breakdown: [
            { factor: 'phone', label: 'Téléphone fourni', points: 15, detail: 'Un numéro exploitable permet un rappel immédiat.' },
            { factor: 'product_match', label: 'Produit cohérent avec la campagne', points: 15, detail: `Le lead demande bien : ${def.product}.` },
            { factor: 'timing', label: 'Échéance proche', points: score >= 60 ? 17 : 4, detail: 'Basé sur la date d’échéance déclarée.' },
            { factor: 'completeness', label: 'Formulaire complet', points: score >= 60 ? 8 : 2, detail: 'Nombre de réponses fournies.' },
          ] as never,
        },
      });
      await prisma.leadActivity.create({
        data: { leadId: lead.id, type: 'FORM', title: 'Formulaire soumis', body: `Score ${score}/100`, createdAt: seed.occurredAt },
      });
      if (contactedAfter) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id, userId: owner, type: 'CALL', title: 'Appel sortant',
            body: pick(['Message laissé sur répondeur.', 'Échange positif, devis à préparer.', 'Client rappelle la semaine prochaine.', 'Demande un comparatif écrit.']),
            createdAt: new Date(seed.occurredAt.getTime() + contactedAfter * 60_000),
          },
        });
      }
      if (chance(0.3)) {
        await prisma.task.create({
          data: {
            workspaceId: ws, leadId: lead.id, assigneeId: owner,
            title: `${pick(['Rappeler', 'Envoyer le devis à', 'Relancer'])} ${seed.contact.firstName} ${seed.contact.lastName}`,
            type: pick(['CALL', 'QUOTE', 'FOLLOW_UP']),
            priority: score >= 80 ? 'URGENT' : score >= 60 ? 'HIGH' : 'NORMAL',
            status: chance(0.45) ? 'DONE' : 'TODO',
            dueAt: daysFromNow(intBetween(-2, 5)),
            isDemo: true,
          },
        });
      }
    }
    poolIndex = (poolIndex + sendCount) % contactPool.length;
    console.log(`  ✓ ${def.name} — ${recipients.length} envois, ${leadSeeds.length} leads`);
  }

  // ── Today's activity so the dashboard is alive on first open ──
  console.log('→ Activité du jour…');
  const todayCampaign = await prisma.campaign.findFirst({ where: { workspaceId: ws, isDemo: true }, orderBy: { launchedAt: 'desc' } });
  const todayContacts = Array.from({ length: 60 }, (_, i) => contactPool[(poolIndex + i) % contactPool.length]).filter(Boolean);
  let qualifiedToday = 0;
  // Spread today's activity evenly across the time already elapsed today, so
  // the dashboard shows a live-looking day whatever the hour of the seed run.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const elapsedMs = Math.max(30 * 60_000, Date.now() - dayStart.getTime());

  for (const [i, contact] of todayContacts.entries()) {
    const at = new Date(dayStart.getTime() + (i / Math.max(1, todayContacts.length)) * elapsedMs * 0.95);

    await prisma.campaignEvent.createMany({
      data: [
        { workspaceId: ws, campaignId: todayCampaign?.id ?? null, contactId: contact.id, type: 'SENT', dedupeKey: `today-sent:${contact.id}`, occurredAt: at },
        { workspaceId: ws, campaignId: todayCampaign?.id ?? null, contactId: contact.id, type: 'DELIVERED', dedupeKey: `today-deliv:${contact.id}`, occurredAt: at },
      ],
      skipDuplicates: true,
    });

    if (!chance(0.5)) continue;
    await prisma.campaignEvent.createMany({
      data: [
        { workspaceId: ws, campaignId: todayCampaign?.id ?? null, contactId: contact.id, type: 'CLICKED', dedupeKey: `today-click:${contact.id}`, occurredAt: at },
        { workspaceId: ws, campaignId: todayCampaign?.id ?? null, contactId: contact.id, type: 'LANDING_VIEW', dedupeKey: `today-view:${contact.id}`, occurredAt: at },
      ],
      skipDuplicates: true,
    });

    if (!chance(0.55)) continue;
    await prisma.campaignEvent.create({
      data: { workspaceId: ws, campaignId: todayCampaign?.id ?? null, contactId: contact.id, type: 'FORM_SUBMIT', dedupeKey: `today-submit:${contact.id}`, occurredAt: at },
    }).catch(() => undefined);

    const score = chance(0.62) ? intBetween(62, 95) : intBetween(25, 58);
    if (score >= 60) qualifiedToday += 1;
    const owner = salesUsers.length ? pick(salesUsers).userId : null;
    const responded = chance(0.7) ? intBetween(2, 45) : null;

    const lead = await prisma.lead.create({
      data: {
        workspaceId: ws, contactId: contact.id, campaignId: todayCampaign?.id ?? null,
        product: pick(PRODUCTS), status: score >= 60 ? 'QUALIFIE' : 'NOUVEAU',
        score, scoreBand: score >= 80 ? 'HOT' : score >= 60 ? 'GOOD' : score >= 40 ? 'CHECK' : 'LOW',
        firstName: contact.firstName, lastName: contact.lastName, email: contact.email,
        phone: `06${intBetween(10000000, 99999999)}`, city: contact.city, postalCode: contact.postalCode,
        currentInsurer: contact.currentInsurer, renewalDate: contact.renewalDate,
        answers: { besoin: pick(['changer', 'comparer', 'nouveau']) } as never,
        ownerId: owner, assignedAt: owner ? at : null,
        firstActionAt: responded ? new Date(at.getTime() + responded * 60_000) : null,
        responseMinutes: responded,
        contactedAt: responded ? new Date(at.getTime() + responded * 60_000) : null,
        createdAt: at, isDemo: true,
      },
    });
    await prisma.leadScore.create({
      data: { leadId: lead.id, score, band: score >= 80 ? 'HOT' : score >= 60 ? 'GOOD' : 'CHECK', breakdown: [] as never },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyGoal.upsert({
    where: { workspaceId_date: { workspaceId: ws, date: today } },
    update: { achieved: qualifiedToday, minTarget: 10, stretchTarget: 20 },
    create: { workspaceId: ws, date: today, achieved: qualifiedToday, minTarget: 10, stretchTarget: 20 },
  });

  await prisma.notification.createMany({
    data: [
      { workspaceId: ws, level: 'SUCCESS', type: 'DEMO', title: 'Données de démonstration chargées', body: `${CONTACT_COUNT} contacts, 3 campagnes, ${totalLeads + qualifiedToday} leads. Toutes ces données sont marquées DÉMO.`, link: '/dashboard', dedupeKey: `demo-loaded:${Date.now()}` },
      { workspaceId: ws, level: 'WARNING', type: 'DELIVERABILITY', title: 'DMARC en observation', body: 'La politique DMARC du domaine exemple.fr est p=none. À renforcer progressivement.', link: '/deliverability', dedupeKey: `demo-dmarc:${Date.now()}` },
    ],
  });

  console.log(`\n✓ Données de démonstration prêtes : ${CONTACT_COUNT} contacts, ${segments.length} segments, ${campaignDefs.length} campagnes, ${pages.length} landing pages, ${totalLeads + qualifiedToday} leads (dont ${qualifiedToday} qualifiés aujourd'hui).`);
  console.log('  Toutes ces données portent le marqueur DÉMO et sont exclues des analytics de production.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
