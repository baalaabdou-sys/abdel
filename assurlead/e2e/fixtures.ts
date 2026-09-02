import { test as base, expect, type Page } from '@playwright/test';

export const TEST_USER = { email: 'owner@assurlead.fr', password: 'Assurlead2026!' };

/** Signs in through the real login form, as a user would. */
export async function signIn(page: Page, credentials = TEST_USER) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(credentials.email);
  await page.getByLabel('Mot de passe').fill(credentials.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
  // The dashboard streams in: wait for its content, not just the URL.
  await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 30_000 });
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await signIn(page);
    await use(page);
  },
});

export { expect };
