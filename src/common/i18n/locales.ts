import { baseLocale, type Locale, locales } from './paraglide/runtime.js';

export function localeName(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

function matchLocale(tag: string): Locale | undefined {
  const lowered = tag.toLowerCase();
  return locales.find((locale) => locale.toLowerCase() === lowered);
}

export function pickLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const match = matchLocale(language) ?? matchLocale(language.split('-')[0] ?? '');
    if (match) {
      return match;
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
