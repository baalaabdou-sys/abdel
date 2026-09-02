/**
 * End-to-end verification of the complete funnel against a running app.
 *
 * Exercises the real path: campaign launch → queue → send (DEMO transport) →
 * CTA click over HTTP → landing page render → form submission → lead creation
 * → scoring → assignment → notification → analytics → daily goal.
 *
 * Development use only: `npx tsx --tsconfig tsconfig.scripts.json scripts/e2e-funnel.ts`
 */
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.APP_URL ?? 'http://localhost:3000';

const steps: { label: string; ok: boolean; detail: string }[] = [];
function check(label: string, ok: boolean, detail = '') {
  steps.push({ label, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const suffix = crypto.randomBytes(4).toString('hex');
  const workspace = await prisma.workspace.create({
    data: { name: `E2E ${suffix}`, slug: `e2e-${suffix}` },
  });
  // Same bootstrap a real registration performs: policy, products, default
  // automation rules (assignment, notifications, suppression on bounce…).
  const { bootstrapWorkspace } = await import('@/server/services/workspace-bootstrap');
  await bootstrapWorkspace(workspace.id);
  await prisma.compliancePolicy.update({
    where: { workspaceId: workspace.id },
    data: { requireExplicitConsent: true, requireSourceRecorded: false, legalNotice: 'Test E2E' },
  });

  // A sales user, so round-robin assignment has someone to assign to.
  const salesUser = await prisma.user.create({
    data: {
      email: `sales-${suffix}@exemple.fr`, name: 'Commercial E2E',
      passwordHash: 'x'.repeat(60),
      memberships: { create: { workspaceId: workspace.id, role: 'SALES' } },
    },
  });

  try {
    // ── 1. Contacts imported ────────────────────────────────────
    const contacts = await Promise.all(
      Array.from({ length: 5 }, (_, i) => {
        const email = `e2e-${suffix}-${i}@exemple.fr`;
        return prisma.contact.create({
          data: {
            workspaceId: workspace.id, email, emailNormalized: email,
            firstName: `Prenom${i}`, lastName: `Nom${i}`, city: 'Lyon', postalCode: '69003',
            insuranceInterests: ['AUTO'], currentInsurer: 'AXA',
            renewalDate: new Date(Date.now() + 25 * 86_400_000),
            source: 'e2e', consentEmail: 'GRANTED', emailMarketingAllowed: true,
            verificationStatus: 'VALID',
          },
        });
      }),
    );
    check('Base de contacts importée', contacts.length === 5, `${contacts.length} contacts`);

    // ── 2. Verification ─────────────────────────────────────────
    const { getVerificationProvider } = await import('@/server/providers/verification');
    const verifier = await getVerificationProvider(workspace.id);
    const verification = await verifier.verify(contacts[0].email);
    check('Adresses vérifiées', !!verification.status, `${verifier.name} → ${verification.status}`);

    // ── 3. Segment ──────────────────────────────────────────────
    const { countSegment } = await import('@/server/services/segments');
    const rules = { match: 'AND', conditions: [{ field: 'insuranceInterests', operator: 'has', value: 'AUTO' }] };
    const segmentCount = await countSegment(workspace.id, rules);
    const segment = await prisma.segment.create({
      data: { workspaceId: workspace.id, name: 'Auto Lyon', kind: 'DYNAMIC', rules: rules as never, cachedCount: segmentCount },
    });
    check('Contacts segmentés', segmentCount === 5, `${segmentCount} contacts dans le segment`);

    // ── 4. AI copy ──────────────────────────────────────────────
    const { generateCampaignEmail } = await import('@/server/ai/email-writer');
    const copy = await generateCampaignEmail({
      workspaceId: workspace.id, companyName: workspace.name,
      product: 'AUTO', objective: 'QUOTE_REQUEST', style: 'RENEWAL',
    });
    check("Copie d'email générée par l'IA", copy.subject.length > 5 && copy.bodyText.includes('[[CTA]]'),
      `${copy.simulated ? 'fournisseur DEMO' : 'fournisseur réel'} — « ${copy.subject} »`);

    // ── 5. Landing page + form ──────────────────────────────────
    const { LANDING_TEMPLATES, DEFAULT_THEME } = await import('@/server/services/landing-templates');
    const template = LANDING_TEMPLATES[0];
    const form = await prisma.form.create({
      data: {
        workspaceId: workspace.id, name: 'Form E2E', product: 'AUTO', multiStep: true,
        steps: template.formSteps as never, consentText: template.consentText,
        successMessage: 'Merci !',
        fields: { create: template.formFields.map((f) => ({
          key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
          required: f.required, options: (f.options ?? []) as never,
          placeholder: f.placeholder ?? '', helpText: f.helpText ?? '',
        })) },
      },
    });
    const page = await prisma.landingPage.create({
      data: {
        workspaceId: workspace.id, name: 'LP E2E', slug: `e2e-${suffix}`, product: 'AUTO',
        status: 'PUBLISHED', publishedAt: new Date(),
        sections: template.sections as never, theme: DEFAULT_THEME as never, formId: form.id,
      },
    });
    check('Landing page publiée et formulaire configuré', !!page.id, `${BASE}/p/${page.slug}`);

    // ── 6. Sender ───────────────────────────────────────────────
    const account = await prisma.emailAccount.create({
      data: {
        workspaceId: workspace.id, provider: 'DEMO', label: 'E2E',
        fromEmail: 'contact@exemple.fr', fromName: 'Cabinet E2E',
        status: 'CONNECTED', dailyLimit: 1000, warmupEnabled: false,
      },
    });
    check('Compte expéditeur connecté', account.status === 'CONNECTED', 'fournisseur DEMO — aucun envoi réel');

    // ── 7. Campaign ─────────────────────────────────────────────
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: workspace.id, name: 'ASSURANCE AUTO — E2E', objective: 'QUOTE_REQUEST',
        product: 'AUTO', status: 'DRAFT', segmentId: segment.id,
        emailAccountId: account.id, landingPageId: page.id, batchSize: 50,
        variants: { create: [{
          label: 'A', weight: 100, isControl: true,
          subject: copy.subject, previewText: copy.previewText,
          bodyText: copy.bodyText, ctaLabel: copy.ctaLabel,
        }] },
      },
    });
    check('Campagne créée en brouillon', campaign.status === 'DRAFT');

    // ── 8. Readiness check ──────────────────────────────────────
    const { evaluateCampaignReadiness } = await import('@/server/services/readiness');
    const report = await evaluateCampaignReadiness(campaign.id);
    check('Contrôle de préparation exécuté', report.score > 0,
      `score ${report.score}/100, ${report.blocking.length} point(s) bloquant(s)`);

    // ── 9. Explicit launch ──────────────────────────────────────
    const { buildRecipients, dispatchCampaignBatch, sendRecipient } = await import('@/server/services/sending');
    const beforeLaunch = await prisma.campaignEvent.count({ where: { campaignId: campaign.id, type: 'SENT' } });
    check('Aucun envoi avant lancement explicite', beforeLaunch === 0);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING', startedAt: new Date(), launchedAt: new Date() },
    });
    const built = await buildRecipients(campaign.id);
    check('Destinataires constitués', built.total === 5, `${built.total} destinataires éligibles`);

    // ── 10. Queue + send ────────────────────────────────────────
    const dispatch = await dispatchCampaignBatch(campaign.id);
    check("Lot mis en file d'envoi", dispatch.queued === 5, `${dispatch.queued} emails en file`);

    const queued = await prisma.campaignRecipient.findMany({ where: { campaignId: campaign.id, status: 'QUEUED' } });
    for (const recipient of queued) await sendRecipient(recipient.id);
    const sent = await prisma.campaignRecipient.count({ where: { campaignId: campaign.id, status: 'SENT' } });
    check('Emails envoyés via le fournisseur configuré', sent === 5, `${sent} envois enregistrés`);

    // ── 11. Recipient clicks the CTA (real HTTP request) ────────
    const recipient = await prisma.campaignRecipient.findFirstOrThrow({
      where: { campaignId: campaign.id, status: 'SENT' },
    });
    const clickResponse = await fetch(`${BASE}/c/${recipient.trackingToken}`, { redirect: 'manual' });
    const location = clickResponse.headers.get('location') ?? '';
    check('Clic sur le CTA suivi et redirigé', clickResponse.status === 302 && location.includes(`/p/${page.slug}`), location);

    const clicks = await prisma.campaignEvent.count({ where: { campaignId: campaign.id, type: 'CLICKED' } });
    check('Événement de clic enregistré', clicks === 1);

    // ── 12. Landing page loads over HTTP ────────────────────────
    const pageResponse = await fetch(`${BASE}/p/${page.slug}?r=${recipient.trackingToken}`);
    const html = await pageResponse.text();
    check('Landing page servie', pageResponse.ok && html.includes(template.sections[0].type === 'hero' ? 'assurance' : ''),
      `${html.length} octets`);

    const views = await prisma.campaignEvent.count({ where: { workspaceId: workspace.id, type: 'LANDING_VIEW' } });
    check('Visite de la landing page enregistrée', views >= 1);

    // ── 13. Form submission → lead ──────────────────────────────
    const { intakeSubmission } = await import('@/server/services/lead-intake');
    const contact = await prisma.contact.findUniqueOrThrow({ where: { id: recipient.contactId } });
    const intake = await intakeSubmission({
      workspaceId: workspace.id, formId: form.id, landingPageId: page.id,
      recipientToken: recipient.trackingToken,
      answers: {
        besoin: 'changer', type_vehicule: 'citadine', marque: 'Renault', modele: 'Clio', annee: '2019',
        assureur_actuel: 'AXA', date_echeance: new Date(Date.now() + 20 * 86_400_000).toISOString(),
        prenom: contact.firstName, nom: contact.lastName, email: contact.email,
        telephone: '0612345678', code_postal: '69003', ville: 'Lyon', rappel: 'matin',
      },
      consentGiven: true, consentText: template.consentText,
    });
    check('Formulaire soumis et lead créé', !!intake.leadId, `score ${intake.score}/100 (${intake.band})`);

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: intake.leadId },
      include: { scores: true, activities: true },
    });
    check('Lead scoré avec explication', lead.scores.length === 1 && (lead.scores[0].breakdown as unknown[]).length > 0,
      `${(lead.scores[0].breakdown as unknown[]).length} facteurs`);
    check('Lead qualifié', lead.score >= 60, `statut ${lead.status}`);

    // ── 14. Automations: notification + assignment ──────────────
    const notifications = await prisma.notification.findMany({ where: { workspaceId: workspace.id } });
    check("Équipe commerciale notifiée", notifications.length >= 1,
      `${notifications.length} notification(s) — « ${notifications[0]?.title ?? '—'} »`);

    const assigned = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, select: { ownerId: true } });
    check('Lead assigné automatiquement', assigned.ownerId === salesUser.id, assigned.ownerId ? 'commercial affecté' : 'aucun commercial');

    const urgentTask = await prisma.task.findFirst({ where: { workspaceId: workspace.id, leadId: lead.id } });
    check("Tâche de rappel créée pour un lead chaud", !!urgentTask, urgentTask ? `« ${urgentTask.title} » — ${urgentTask.priority}` : 'aucune tâche');

    // ── 15. CRM + timeline ──────────────────────────────────────
    check('Lead visible dans le CRM', ['NOUVEAU', 'QUALIFIE'].includes(lead.status), `colonne « ${lead.status} »`);
    check('Chronologie du lead alimentée', lead.activities.length >= 1, `${lead.activities.length} activité(s)`);

    // ── 16. Analytics + daily goal ──────────────────────────────
    const { getFunnel, getDailyGoalStatus } = await import('@/server/services/analytics');
    const funnel = await getFunnel({ workspaceId: workspace.id });
    check('Entonnoir analytics mis à jour',
      funnel.counts.sent === 5 && funnel.counts.uniqueClicks === 1 && funnel.counts.formSubmits === 1 && funnel.counts.leads === 1,
      `${funnel.counts.sent} envoyés · ${funnel.counts.uniqueClicks} clic · ${funnel.counts.landingViews} visite · ${funnel.counts.formSubmits} formulaire · ${funnel.counts.qualifiedLeads} lead qualifié`);

    const goal = await getDailyGoalStatus(workspace.id);
    check('Objectif du jour mis à jour', goal.achieved >= (lead.score >= 60 ? 1 : 0),
      `${goal.achieved} / ${goal.minTarget} leads qualifiés`);

    // ── 17. Unsubscribe closes the loop ─────────────────────────
    const unsubPage = await fetch(`${BASE}/u/${recipient.trackingToken}`);
    check('Page de désinscription accessible', unsubPage.ok);

    console.log('\n' + '─'.repeat(60));
    const failed = steps.filter((s) => !s.ok);
    console.log(failed.length === 0
      ? `✓ Parcours complet validé : ${steps.length}/${steps.length} étapes.`
      : `✗ ${failed.length} étape(s) en échec : ${failed.map((f) => f.label).join(', ')}`);
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@exemple.fr` } } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
