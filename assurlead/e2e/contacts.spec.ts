import { test, expect } from './fixtures';

test.describe('Contacts', () => {
  test('filtre la base et pagine côté serveur', async ({ authedPage: page }) => {
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    // Never more than one page of contacts is sent to the browser.
    expect(await rows.count()).toBeLessThanOrEqual(50);

    await page.getByPlaceholder('Nom, email, téléphone, ville…').fill('zzz-aucune-correspondance');
    await expect(page.getByText('Aucun contact ne correspond').first()).toBeVisible({ timeout: 20_000 });
  });

  test('l’assistant d’import affiche un aperçu avant toute écriture', async ({ authedPage: page }) => {
    await page.goto('/contacts/import');
    await expect(page.getByText('1. Choisissez votre fichier').first()).toBeVisible();
    await expect(page.getByText(/Aucun contact n’est importé à cette étape/).first()).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: 'contacts-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'Email,Prénom,Nom,Ville,Code postal\n' +
        'import-a@exemple.fr,Alice,Martin,Lyon,69003\n' +
        'import-b@exemple.fr,Bruno,Durand,Paris,75011\n' +
        'invalide-sans-arobase,Chloé,Petit,Nice,06000\n',
      ),
    });

    await expect(page.getByText('2. Vérifiez la correspondance des colonnes').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Emails invalides').first()).toBeVisible();
    // The mapping was inferred from the French headers.
    await expect(page.getByText('→ Email').first()).toBeVisible();
  });
});
