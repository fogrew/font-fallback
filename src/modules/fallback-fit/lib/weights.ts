import frequencies from './frequencies.json';
import type { GlyphWeight } from './model';

export function languageWeights(language: 'en' | 'ru'): GlyphWeight[] {
  return frequencies[language].map((entry) => ({ ...entry }));
}
