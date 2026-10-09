import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dirname;
const settings = JSON.parse(readFileSync(join(root, 'project.inlang/settings.json'), 'utf8'));

const prefixed = (locale) => [locale, `/${locale}/:path(.*)?`];

export const paraglideOptions = {
  project: join(root, 'project.inlang'),
  outdir: join(root, 'src/common/i18n/paraglide'),
  emitTsDeclarations: true,
  strategy: ['url', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/:path(.*)?',
      localized: settings.locales.map(prefixed),
    },
  ],
};
