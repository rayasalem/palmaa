/**
 * Cypress E2E configuration for Palma Marketplace.
 * Run against live/production URL by default; override with CYPRESS_BASE_URL for staging.
 */
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://your-app.vercel.app',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    video: true,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // Optionally use env to switch baseUrl (e.g. staging vs production)
      const baseUrl = process.env.CYPRESS_BASE_URL || config.baseUrl;
      config.baseUrl = baseUrl;
      return config;
    },
  },
  env: {
    // Test user credentials – set in CI or .env; use real test account for live runs
    TEST_USER_EMAIL: process.env.CYPRESS_TEST_USER_EMAIL || 'customer@palma.demo',
    TEST_USER_PASSWORD: process.env.CYPRESS_TEST_USER_PASSWORD || 'Customer@123456',
    TEST_ADMIN_EMAIL: process.env.CYPRESS_TEST_ADMIN_EMAIL || 'admin@palma.demo',
    TEST_ADMIN_PASSWORD: process.env.CYPRESS_TEST_ADMIN_PASSWORD || 'Admin@123456',
  },
});
