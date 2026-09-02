import crypto from 'crypto';
import { PrismaClient, type InsuranceType } from '@prisma/client';

export const prisma = new PrismaClient();

/** Creates an isolated workspace so tests never interfere with each other. */
export async function createWorkspace(name = 'Test') {
  const slug = `test-${crypto.randomBytes(6).toString('hex')}`;
  const workspace = await prisma.workspace.create({ data: { name: `${name} ${slug}`, slug } });
  await prisma.compliancePolicy.create({
    data: {
      workspaceId: workspace.id,
      requireExplicitConsent: true,
      allowUnknownConsent: false,
      requireSourceRecorded: false,
    },
  });
  return workspace;
}

export async function createEmailAccount(workspaceId: string) {
  return prisma.emailAccount.create({
    data: {
      workspaceId,
      provider: 'DEMO',
      label: 'Test',
      fromEmail: 'test@exemple.fr',
      fromName: 'Test',
      status: 'CONNECTED',
      dailyLimit: 10_000,
      warmupEnabled: false,
    },
  });
}

export async function createContact(
  workspaceId: string,
  overrides: Partial<{
    email: string; suppressed: boolean; unsubscribed: boolean;
    verificationStatus: 'VALID' | 'INVALID' | 'UNVERIFIED' | 'CATCH_ALL' | 'RISKY';
    consentEmail: 'GRANTED' | 'UNKNOWN' | 'DENIED';
    emailMarketingAllowed: boolean; source: string; insuranceInterests: InsuranceType[];
  }> = {},
) {
  const email = overrides.email ?? `contact-${crypto.randomBytes(6).toString('hex')}@exemple.fr`;
  return prisma.contact.create({
    data: {
      workspaceId,
      email,
      emailNormalized: email.toLowerCase(),
      firstName: 'Test',
      lastName: 'Contact',
      source: overrides.source ?? 'test',
      consentEmail: overrides.consentEmail ?? 'GRANTED',
      emailMarketingAllowed: overrides.emailMarketingAllowed ?? true,
      verificationStatus: overrides.verificationStatus ?? 'VALID',
      suppressed: overrides.suppressed ?? false,
      unsubscribed: overrides.unsubscribed ?? false,
      insuranceInterests: overrides.insuranceInterests ?? ['AUTO'],
    },
  });
}

export async function createSegment(workspaceId: string) {
  return prisma.segment.create({
    data: {
      workspaceId,
      name: 'Tous les contacts',
      kind: 'DYNAMIC',
      rules: { match: 'AND', conditions: [] },
    },
  });
}

export async function createLandingPage(workspaceId: string, published = true) {
  const form = await prisma.form.create({
    data: {
      workspaceId,
      name: 'Formulaire test',
      product: 'AUTO',
      multiStep: false,
      steps: [{ key: 'contact', title: 'Contact', description: '' }],
      consentText: "J'accepte d'être contacté.",
      successMessage: 'Merci !',
      fields: {
        create: [
          { key: 'prenom', label: 'Prénom', type: 'text', step: 1, order: 1, required: true },
          { key: 'email', label: 'Email', type: 'email', step: 1, order: 2, required: true },
          { key: 'telephone', label: 'Téléphone', type: 'tel', step: 1, order: 3, required: true },
          { key: 'consentement', label: "J'accepte d'être contacté.", type: 'checkbox', step: 1, order: 4, required: true },
        ],
      },
    },
  });
  const page = await prisma.landingPage.create({
    data: {
      workspaceId,
      name: 'Page test',
      slug: `test-${crypto.randomBytes(5).toString('hex')}`,
      product: 'AUTO',
      status: published ? 'PUBLISHED' : 'DRAFT',
      publishedAt: published ? new Date() : null,
      sections: [],
      formId: form.id,
    },
  });
  return { form, page };
}

export async function createCampaign(
  workspaceId: string,
  options: { segmentId: string; emailAccountId: string; landingPageId?: string; status?: 'DRAFT' | 'SENDING' },
) {
  return prisma.campaign.create({
    data: {
      workspaceId,
      name: 'Campagne test',
      objective: 'QUOTE_REQUEST',
      product: 'AUTO',
      status: options.status ?? 'DRAFT',
      segmentId: options.segmentId,
      emailAccountId: options.emailAccountId,
      landingPageId: options.landingPageId,
      batchSize: 100,
      variants: {
        create: [{
          label: 'A', weight: 100, isControl: true,
          subject: 'Test {{first_name}}',
          bodyText: 'Bonjour {{first_name}},\n\nCeci est un test suffisamment long pour passer les contrôles.\n\n[[CTA]]\n\nCordialement,',
          ctaLabel: 'Voir',
        }],
      },
    },
    include: { variants: true },
  });
}

export async function cleanupWorkspace(workspaceId: string) {
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => undefined);
}
