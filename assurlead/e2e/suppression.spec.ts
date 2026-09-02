import { test, expect } from './fixtures';

test.describe('Liste de suppression', () => {
  test('affiche les statuts et l’engagement de contrôle au moment de l’envoi', async ({ authedPage: page }) => {
    await page.goto('/suppression');
    await expect(page.getByRole('heading', { name: 'Liste de suppression' })).toBeVisible();
    await expect(page.getByText(/Le contrôle est refait au moment de chaque envoi/).first()).toBeVisible();
    await expect(page.getByText('Total supprimé').first()).toBeVisible();
  });

  test('le retrait d’une adresse demande une confirmation', async ({ authedPage: page }) => {
    await page.goto('/suppression');
    const remove = page.locator('table tbody tr button[aria-label="Retirer"]').first();
    test.skip(!(await remove.isVisible().catch(() => false)), 'Liste vide.');

    await remove.click();
    await expect(page.getByText('Retirer de la liste de suppression ?')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
  });
});
