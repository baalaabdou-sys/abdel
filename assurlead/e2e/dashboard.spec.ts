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

    // Inbox placement must never be guaranteed anywhere in the product.
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/garanti.{0,30}(boîte de réception|inbox)/i);
    expect(body).not.toMatch(/100\s*%\s*(inbox|délivrabilité)/i);
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
