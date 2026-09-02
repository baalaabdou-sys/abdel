import { test, expect } from './fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Landing page publique et formulaire', () => {
  test('affiche la page publiée et valide le formulaire multi-étapes', async ({ page }) => {
    const landing = await prisma.landingPage.findFirst({
      where: { status: 'PUBLISHED' },
      include: { form: { include: { fields: { orderBy: [{ step: 'asc' }, { order: 'asc' }] } } } },
    });
    test.skip(!landing, 'Aucune landing page publiée — lancez `npm run seed:demo`.');

    await page.goto(`/p/${landing!.slug}`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer|Envoyer ma demande/ })).toBeVisible();

    // Required fields must block progression: validation is not cosmetic.
    await page.getByRole('button', { name: /Continuer|Envoyer ma demande/ }).click();
    await expect(page.getByText(/Ce champ est obligatoire|case doit être cochée/).first()).toBeVisible();
  });

  test('soumet une demande et crée un lead scoré', async ({ page }) => {
    const landing = await prisma.landingPage.findFirst({
      where: { status: 'PUBLISHED', form: { multiStep: false } },
      include: { form: { include: { fields: true } } },
    }) ?? await prisma.landingPage.findFirst({
      where: { status: 'PUBLISHED' },
      include: { form: { include: { fields: { orderBy: [{ step: 'asc' }, { order: 'asc' }] } } } },
    });
    test.skip(!landing?.form, 'Aucun formulaire disponible.');

    const email = `playwright-${Date.now()}@exemple.fr`;
    const before = await prisma.lead.count({ where: { workspaceId: landing!.workspaceId } });

    await page.goto(`/p/${landing!.slug}`);

    const maxStep = Math.max(1, ...landing!.form!.fields.map((f) => f.step));
    for (let step = 1; step <= maxStep; step++) {
      for (const field of landing!.form!.fields.filter((f) => f.step === step)) {
        const control = page.locator(`#f-${field.key}`);
        if (field.type === 'checkbox') {
          await control.check().catch(() => undefined);
        } else if (field.type === 'radio') {
          await page.locator(`input[name="${field.key}"]`).first().check().catch(() => undefined);
        } else if (field.type === 'select') {
          const options = (field.options as { value: string }[]) ?? [];
          if (options[0]) await control.selectOption(options[0].value).catch(() => undefined);
        } else if (field.type === 'email') {
          await control.fill(email).catch(() => undefined);
        } else if (field.type === 'tel') {
          await control.fill('0612345678').catch(() => undefined);
        } else if (field.type === 'postal') {
          await control.fill('69003').catch(() => undefined);
        } else if (field.type === 'date') {
          await control.fill('2026-11-15').catch(() => undefined);
        } else if (field.type === 'number') {
          await control.fill('2019').catch(() => undefined);
        } else {
          await control.fill('Playwright').catch(() => undefined);
        }
      }
      await page.getByRole('button', { name: step < maxStep ? 'Continuer' : 'Envoyer ma demande' }).click();
    }

    await expect(page.getByText('Demande enregistrée').first()).toBeVisible({ timeout: 30_000 });

    const after = await prisma.lead.count({ where: { workspaceId: landing!.workspaceId } });
    expect(after).toBe(before + 1);

    const lead = await prisma.lead.findFirst({
      where: { workspaceId: landing!.workspaceId, email },
      include: { scores: true },
    });
    expect(lead).not.toBeNull();
    expect(lead!.score).toBeGreaterThan(0);
    expect(lead!.scores.length).toBeGreaterThan(0);
  });

  test('la désinscription est confirmée explicitement', async ({ page }) => {
    const recipient = await prisma.campaignRecipient.findFirst({ where: { status: 'SENT' } });
    test.skip(!recipient, 'Aucun destinataire envoyé — lancez `npm run seed:demo`.');

    await page.goto(`/u/${recipient!.trackingToken}`);
    await expect(page.getByRole('heading', { name: 'Se désinscrire' })).toBeVisible();
  });
});
