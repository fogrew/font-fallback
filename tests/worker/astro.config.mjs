import { defineConfig } from 'astro/config';
import projectConfig from '../../astro.config.mjs';

export default defineConfig({
  ...projectConfig,
  srcDir: './tests/worker/site',
  publicDir: './tests/fixtures',
  outDir: './.worker-test-dist',
  cacheDir: './node_modules/.astro-worker-test',
});
