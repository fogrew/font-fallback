import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: './src/app',
  integrations: [preact()],
});
