import { describe, expect, it } from 'vitest';
import { catalogs } from './catalog';
import { locales } from './locales';

type Catalog = Record<string, string>;

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const keysOf = (catalog: Catalog) => Object.keys(catalog).filter((key) => key !== '$schema');

describe('message catalogs', () => {
  const base: Catalog = catalogs.en;

  it('has a catalog for every configured locale', () => {
    expect(Object.keys(catalogs).sort()).toEqual([...locales].sort());
  });

  for (const locale of locales) {
    const catalog: Catalog = catalogs[locale];

    it(`${locale} has the same keys as the base locale`, () => {
      expect(keysOf(catalog).sort()).toEqual(keysOf(base).sort());
    });

    it(`${locale} uses the same placeholders as the base locale`, () => {
      for (const key of keysOf(base)) {
        expect(placeholders(catalog[key] ?? '')).toEqual(placeholders(base[key] ?? ''));
      }
    });
  }
});
