import preact from '@astrojs/preact';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'astro/config';
import { paraglideOptions } from './paraglide.config.mjs';

export default defineConfig({
  srcDir: './src/app',
  trailingSlash: 'always',
  integrations: [preact()],
  vite: {
    plugins: [paraglideVitePlugin(paraglideOptions)],
  },
});
