import { baseLocale, isLocale, type Locale, locales } from './paraglide/runtime.js';

export function localeName(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

export function pickLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    if (isLocale(primary)) {
      return primary;
    }
  }
  return baseLocale;
}

export {
  assertIsLocale,
  baseLocale,
  getTextDirection,
  isLocale,
  localizeHref,
} from './paraglide/runtime.js';
export { type Locale, locales };
