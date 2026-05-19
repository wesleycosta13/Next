import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
console.log("DEBUG PLAYWRIGHT CONFIG - process.env.BASE_URL:", process.env.BASE_URL);

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:4000',

    /* Collect trace on failure */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // ─── Projeto exclusivo para testes de API ───────────────────────────
    {
      name: 'api',
      testMatch: '**/tests/api/**/*.spec.ts',
      use: {
        baseURL: process.env.API_URL || 'http://localhost:3000',
      },
    },

    // ─── Projetos de browser (apenas testes de UI) ─────────────────────
    {
      name: 'chromium',
      testMatch: '**/tests/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testMatch: '**/tests/ui/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testMatch: '**/tests/ui/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
