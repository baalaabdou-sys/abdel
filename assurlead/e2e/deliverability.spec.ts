import { test, expect } from './fixtures';

test.describe('Délivrabilité', () => {
  test('n’annonce jamais de garantie de placement en boîte de réception', async ({ authedPage: page }) => {
    await page.goto('/deliverability');
    await expect(page.getByRole('heading', { name: 'Délivrabilité' })).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Aucune garantie de placement en boîte de réception/i);
    expect(body).toMatch(/Aucun contournement des filtres anti-spam/i);
    expect(body).not.toMatch(/placement garanti/i);
    expect(body).not.toMatch(/(boîte de réception|inbox)\s+garantie?/i);
    expect(body).not.toMatch(/100\s*%\s*(inbox|délivrabilité|en boîte)/i);
  });

  test('affiche les enregistrements DNS à créer', async ({ authedPage: page }) => {
    await page.goto('/deliverability');
    const details = page.getByText('Enregistrements DNS à créer chez votre hébergeur').first();
    test.skip(!(await details.isVisible().catch(() => false)), 'Aucun domaine enregistré.');
    await details.click();
    await expect(page.getByText('v=spf1', { exact: false }).first()).toBeVisible();
  });
});
