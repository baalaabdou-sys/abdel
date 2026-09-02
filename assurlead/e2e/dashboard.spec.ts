import { test, expect } from './fixtures';

test.describe('Tableau de bord', () => {
  test('affiche l’objectif, l’entonnoir et les indicateurs du jour', async ({ authedPage: page }) => {
    await page.goto('/dashboard');
    await page.locator('main h1').first().waitFor({ timeout: 30_000 });

    await expect(page.getByText('Objectif du jour').first()).toBeVisible();
    await expect(page.getByText('Entonnoir de conversion').first()).toBeVisible();
    await expect(page.getByText('Speed-to-lead').first()).toBeVisible();
    await expect(page.getByText('Total base').first()).toBeVisible();

    // Forecasts must always be presented as estimates, never as promises.
    await expect(page.getByText(/Estimation, pas une garantie/i).first()).toBeVisible();

    // Inbox placement must never be claimed. The page may — and does — state the
    // opposite, so match affirmative claims only, not the disclaimer denying them.
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/placement garanti/i);
    expect(body).not.toMatch(/(boîte de réception|inbox)\s+garantie?/i);
    expect(body).not.toMatch(/garantie de (placement|délivrabilité)/i);
    expect(body).not.toMatch(/100\s*%\s*(inbox|délivrabilité|en boîte)/i);
    // And the honest statement must actually be present.
    expect(body).toMatch(/aucun outil ne peut garantir le placement/i);
  });

  test('navigue vers les modules principaux depuis la barre latérale', async ({ authedPage: page }) => {
    await page.goto('/dashboard');
    await page.locator('main h1').first().waitFor({ timeout: 30_000 });
    for (const [label, url] of [
      ['Contacts', /\/contacts/],
      ['Segments', /\/segments/],
      ['Campagnes', /\/campaigns/],
      ['Leads', /\/leads/],
      ['CRM', /\/crm/],
    ] as const) {
      await page.getByRole('link', { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(url);
    }
  });
});
