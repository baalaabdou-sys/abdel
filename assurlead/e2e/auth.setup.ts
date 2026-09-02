import { test as setup } from '@playwright/test';
import { signIn } from './fixtures';

export const STORAGE_STATE = '.playwright/state.json';

/**
 * Signs in once and saves the session for the whole suite. Logging in for every
 * test would (rightly) trip the login rate limiter.
 */
setup('authentification', async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
