import config from '../../astro.config.mjs';

export default {
  ...config,
  srcDir: './tests/ui/site',
  outDir: './.ui-test-dist',
  cacheDir: './.astro/ui-tests',
};
