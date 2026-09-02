import { test, expect, signIn } from './fixtures';

test.describe('Authentification', () => {
  test('refuse des identifiants incorrects', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse email').fill('owner@assurlead.fr');
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Email ou mot de passe incorrect').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('connecte un utilisateur valide et affiche le tableau de bord', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Objectif du jour').first()).toBeVisible();
  });

  test('redirige un visiteur non authentifié vers la connexion', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/contacts');
    await expect(page).toHaveURL(/\/login/);
  });
});
