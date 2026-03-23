import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests expect the app reachable at PLAYWRIGHT_BASE_URL (default http://localhost:5173)
 * with the backend API available (same origin via nginx in Docker, or Vite dev proxy).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
});
