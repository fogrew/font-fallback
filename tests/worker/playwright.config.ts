import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'worker.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4322', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    command:
      'pnpm exec astro build --config tests/worker/astro.config.mjs && pnpm exec astro preview --config tests/worker/astro.config.mjs --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
  },
});
