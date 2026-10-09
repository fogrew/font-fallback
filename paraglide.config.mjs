import { readFileSync } from 'node:fs';

const settings = JSON.parse(readFileSync('./project.inlang/settings.json', 'utf8'));

const prefixed = (locale) => [locale, `/${locale}/:path(.*)?`];

export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/common/i18n/paraglide',
  emitTsDeclarations: true,
  strategy: ['url', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/:path(.*)?',
      localized: settings.locales.map(prefixed),
    },
  ],
};
