import { test, expect } from './fixtures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Cycle de vie d’une campagne', () => {
  test('crée un brouillon sans déclencher aucun envoi', async ({ authedPage: page }) => {
    const name = `Test Playwright ${Date.now()}`;

    await page.goto('/campaigns/new');
    await page.getByLabel('Nom *').fill(name);
    await page.getByRole('button', { name: 'Générer des demandes de devis' }).click();
    await page.getByRole('button', { name: 'Assurance Auto', exact: true }).click();
    await page.getByRole('button', { name: 'Créer le brouillon' }).click();

    await page.waitForURL(/\/campaigns\/[a-z0-9]+/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText('Brouillon', { exact: true }).first()).toBeVisible();

    // A draft exposes a launch button but has sent nothing.
    await expect(page.getByRole('button', { name: 'Lancer la campagne' })).toBeVisible();
    await page.getByRole('tab', { name: 'Suivi' }).click();
    await expect(page.getByText(/aucune statistique n’est disponible/i).first()).toBeVisible();
  });

  test('le lancement exige une confirmation explicite', async ({ authedPage: page }) => {
    const campaign = await prisma.campaign.findFirst({
      where: { status: { in: ['DRAFT', 'SCHEDULED'] } },
      orderBy: { createdAt: 'desc' },
    });
    test.skip(!campaign, 'Aucune campagne lançable.');
    await page.goto(`/campaigns/${campaign!.id}`);

    const launch = page.getByRole('button', { name: 'Lancer la campagne' });
    if (await launch.isVisible().catch(() => false)) {
      await launch.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Lancer la campagne ?')).toBeVisible();
      // The confirm button stays disabled until the word is typed.
      await expect(dialog.getByRole('button', { name: 'Lancer la campagne' })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Annuler' }).click();
    }
  });

  test('le contrôle de préparation liste des vérifications concrètes', async ({ authedPage: page }) => {
    // Audience-related checks only exist once a segment is attached, so target a
    // configured campaign rather than whichever row happens to be first.
    const campaign = await prisma.campaign.findFirst({
      where: { NOT: { segmentId: null }, emailAccountId: { not: null } },
      orderBy: { launchedAt: 'desc' },
    });
    test.skip(!campaign, 'Aucune campagne configurée — lancez `npm run seed:demo`.');

    await page.goto(`/campaigns/${campaign!.id}`);

    await page.getByRole('button', { name: 'Vérifier la campagne' }).click();
    await expect(page.getByText('Score de préparation').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Mécanisme de désinscription').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Vérification de la liste de suppression').first()).toBeVisible();
  });
});
