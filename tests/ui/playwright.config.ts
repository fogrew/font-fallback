import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4323', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    command:
      'pnpm exec astro build --config tests/ui/astro.config.mjs && pnpm exec astro preview --config tests/ui/astro.config.mjs --port 4323',
    url: 'http://localhost:4323/en/',
    reuseExistingServer: false,
  },
});
