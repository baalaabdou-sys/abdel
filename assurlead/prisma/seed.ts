/**
 * Base seed: creates the test accounts and an empty production-style workspace.
 * Run with `npm run seed`. Demo content lives in `seed-demo.ts`.
 */
import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS: { email: string; name: string; password: string; role: Role }[] = [
  { email: 'owner@assurlead.fr', name: 'Camille Fournier', password: 'Assurlead2026!', role: 'OWNER' },
  { email: 'admin@assurlead.fr', name: 'Yanis Bertrand', password: 'Assurlead2026!', role: 'ADMIN' },
  { email: 'marketing@assurlead.fr', name: 'Léa Marchand', password: 'Assurlead2026!', role: 'MARKETING' },
  { email: 'sales@assurlead.fr', name: 'Thomas Reynaud', password: 'Assurlead2026!', role: 'SALES' },
  { email: 'sales2@assurlead.fr', name: 'Nadia Belkacem', password: 'Assurlead2026!', role: 'SALES' },
  { email: 'viewer@assurlead.fr', name: 'Paul Girard', password: 'Assurlead2026!', role: 'VIEWER' },
];

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'cabinet-assurances-demo' },
    update: {},
    create: {
      name: 'Cabinet Assurances Léman',
      slug: 'cabinet-assurances-demo',
      isDemo: true,
      onboardingDone: true,
      onboardingStep: 10,
    },
  });

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { email: u.email, name: u.name, passwordHash: await bcrypt.hash(u.password, 11) },
    });
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role: u.role },
      create: { workspaceId: workspace.id, userId: user.id, role: u.role },
    });
  }

  const { bootstrapWorkspace } = await import('../src/server/services/workspace-bootstrap');
  await bootstrapWorkspace(workspace.id);

  await prisma.compliancePolicy.update({
    where: { workspaceId: workspace.id },
    data: {
      legalNotice:
        "Vous recevez cet email car vous avez demandé une information ou un devis d'assurance auprès de notre cabinet. Cabinet Assurances Léman — 12 rue de la République, 69002 Lyon.",
      privacyUrl: 'https://exemple.fr/confidentialite',
      dpoEmail: 'dpo@exemple.fr',
      // Demo default: unknown consent is allowed but flagged, so the compliance
      // warnings are visible in the UI. Tighten this for real production use.
      requireExplicitConsent: true,
      allowUnknownConsent: true,
      blockOnUnknownConsent: false,
    },
  });

  console.log(`✓ Workspace « ${workspace.name} » (${workspace.id})`);
  console.log('✓ Comptes de test :');
  for (const u of USERS) console.log(`  ${u.role.padEnd(9)} ${u.email}  /  ${u.password}`);
  console.log('\nLancez `npm run seed:demo` pour générer les données de démonstration.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
