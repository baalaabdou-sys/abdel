import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

/**
 * Some environments ship a pre-installed Chromium whose build number does not
 * match the one this Playwright version downloads. Point at it when present so
 * the suite runs without a browser download.
 */
const PRESET_CHROMIUM = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].find((candidate) => candidate && fs.existsSync(candidate));

/**
 * Browser tests for the flows a real user performs. They run against a running
 * dev server and a seeded database (`npm run seed && npm run seed:demo`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], ...(PRESET_CHROMIUM ? { launchOptions: { executablePath: PRESET_CHROMIUM } } : {}) },
    },
    {
      // The login form itself is exercised with a fresh, unauthenticated context.
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(PRESET_CHROMIUM ? { launchOptions: { executablePath: PRESET_CHROMIUM } } : {}) },
    },
    {
      name: 'chromium',
      testIgnore: [/auth\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/state.json',
        ...(PRESET_CHROMIUM ? { launchOptions: { executablePath: PRESET_CHROMIUM } } : {}),
      },
    },
    {
      name: 'mobile',
      testIgnore: [/auth\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        storageState: '.playwright/state.json',
        ...(PRESET_CHROMIUM ? { launchOptions: { executablePath: PRESET_CHROMIUM } } : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: process.env.APP_URL ?? 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
