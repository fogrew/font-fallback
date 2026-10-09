import { describe, expect, it } from 'vitest';
import { fitFromAverages } from '../index';
import reference from './reference.json';

describe('Capsize 4.1.3 reference values', () => {
  it.each(reference.pairs)(
    '$target.familyName → Arial (metrics 4.3.0, Latin)',
    ({ target, fallback, expected }) => {
      const fit = fitFromAverages(
        {
          unitsPerEm: target.unitsPerEm,
          hhea: { ascent: target.ascent, descent: target.descent, lineGap: target.lineGap },
          typo: null,
          win: null,
        },
        target.subsets.latin.xWidthAvg / target.unitsPerEm,
        fallback.subsets.latin.xWidthAvg / fallback.unitsPerEm,
        'hhea',
      );
      for (const key of [
        'sizeAdjust',
        'ascentOverride',
        'descentOverride',
        'lineGapOverride',
      ] as const) {
        expect(Math.abs(fit[key] * 100 - Number.parseFloat(expected[key]))).toBeLessThanOrEqual(
          0.00005,
        );
      }
    },
  );
});
