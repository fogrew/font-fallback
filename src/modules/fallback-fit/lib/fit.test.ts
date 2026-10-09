import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type FitFont, fitFont, fitFromAverages, languageWeights } from '../index';

const font = (widths = [500, 1000], unitsPerEm = 1000): FitFont => ({
  unitsPerEm,
  codePoints: new Uint32Array([65, 66]),
  advances: new Float64Array(widths),
  hhea: { ascent: 800, descent: -200, lineGap: 100 },
  typo: null,
  win: null,
});
const weights = [
  { codePoint: 65, weight: 3 },
  { codePoint: 66, weight: 1 },
] as const;

describe('fallback fitting', () => {
  it('normalizes different em grids and restores target line metrics after adjustment', () => {
    const result = fitFont(font(), font([1000, 1000], 2000), weights, 'hhea');
    expect(result.sizeAdjust).toBe(1.25);
    expect(result.ascentOverride).toBe(0.64);
    expect(result.descentOverride).toBe(0.16);
    expect(result.lineGapOverride).toBe(0.08);
    expect(result.coverage).toBe(1);
  });

  it('uses the same shared subset and reports missing glyphs independently', () => {
    const target = font();
    target.codePoints = new Uint32Array([66, 67]);
    const result = fitFont(target, font(), [...weights, { codePoint: 67, weight: 6 }]);
    expect(result.sizeAdjust).toBe(0.5);
    expect(result.coverage).toBe(0.1);
    expect(result.missingTarget).toEqual([65]);
    expect(result.missingFallback).toEqual([67]);
  });

  it('allows zero-width glyphs but rejects zero aggregates and absent shared coverage', () => {
    expect(fitFont(font([0, 1000]), font(), weights).sizeAdjust).toBe(0.4);
    expect(() => fitFont(font([0, 0]), font(), weights)).toThrow('zero-width');
    expect(() => fitFont(font(), font(), [{ codePoint: 67, weight: 1 }])).toThrow(
      'no-shared-glyphs',
    );
  });

  it('ignores zero weights and normalizes huge finite weights before arithmetic', () => {
    const result = fitFont(font(), font([1000, 1000]), [
      { codePoint: 65, weight: Number.MAX_VALUE },
      { codePoint: 66, weight: Number.MAX_VALUE },
      { codePoint: 67, weight: 0 },
    ]);
    expect(result.sizeAdjust).toBe(0.75);
    expect(result.coverage).toBe(1);
    expect(result.missingTarget).toEqual([]);
  });

  it('selects FreeType metrics explicitly, including the zero hhea fallback', () => {
    const target = font();
    target.typo = { ascent: 750, descent: -250, lineGap: 0, useTypoMetrics: true };
    expect(fitFont(target, target, weights).metricsSource).toBe('typo');
    target.typo.useTypoMetrics = false;
    expect(fitFont(target, target, weights).metricsSource).toBe('hhea');
    target.hhea = { ascent: 0, descent: 0, lineGap: 42 };
    expect(fitFont(target, target, weights).metricsSource).toBe('typo');
    target.typo = null;
    target.win = { ascent: 900, descent: 300 };
    const win = fitFont(target, target, weights);
    expect(win.metricsSource).toBe('win');
    expect(win.lineGapOverride).toBe(0);
    expect(win.descentOverride).toBe(0.3);
    expect(() => fitFont(target, target, weights, 'typo')).toThrow('missing-metrics');
  });

  it('can fit a tiny shared weight even when missing glyphs dominate the corpus', () => {
    const result = fitFont(font(), font([1000, 1000]), [
      { codePoint: 65, weight: Number.MIN_VALUE },
      { codePoint: 67, weight: Number.MAX_VALUE },
    ]);
    expect(result.sizeAdjust).toBe(0.5);
    expect(result.coverage).toBe(0);
    expect(result.missingTarget).toEqual([67]);
  });

  it('reports clamped negative line gaps and accepts zero descent', () => {
    const target = font();
    target.hhea = { ascent: 800, descent: 0, lineGap: -100 };
    const result = fitFont(target, target, weights);
    expect(result.lineGapOverride).toBe(0);
    expect(result.lineGapClamped).toBe(true);
    expect(result.descentOverride).toBe(0);
  });

  it.each([NaN, Infinity, -1])('rejects invalid weights %s', (weight) => {
    expect(() => fitFont(font(), font(), [{ codePoint: 65, weight }])).toThrow('invalid-weights');
  });

  it('rejects duplicate weights, unsorted cmaps and invalid measurements', () => {
    expect(() => fitFont(font(), font(), [weights[0], weights[0]])).toThrow('invalid-weights');
    const invalid = font();
    invalid.codePoints.reverse();
    expect(() => fitFont(invalid, font(), weights)).toThrow('invalid-font');
    expect(() => fitFromAverages(font(), Number.MIN_VALUE, Number.MAX_VALUE)).toThrow();
  });

  it('provides distinct Latin and Cyrillic frequency profiles', () => {
    expect(languageWeights('en').some(({ codePoint }) => codePoint === 101)).toBe(true);
    expect(languageWeights('ru').some(({ codePoint }) => codePoint === 1086)).toBe(true);
    const target = {
      ...font(),
      codePoints: new Uint32Array([65, 1040]),
      advances: new Float64Array([500, 800]),
    };
    const fallback = { ...target, advances: new Float64Array([1000, 400]) };
    expect(fitFont(target, fallback, [{ codePoint: 65, weight: 1 }]).sizeAdjust).toBe(0.5);
    expect(fitFont(target, fallback, [{ codePoint: 1040, weight: 1 }]).sizeAdjust).toBe(2);
  });

  it('preserves identity, scale invariance and target line dimensions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 4 }),
        (a, b, scale) => {
          const target = font([a, b]);
          const result = fitFont(target, font([b, a]), weights);
          expect(fitFont(target, target, weights).sizeAdjust).toBeCloseTo(1, 12);
          const scaled = {
            ...target,
            unitsPerEm: 1000 * scale,
            advances: new Float64Array([a * scale, b * scale]),
            hhea: { ascent: 800 * scale, descent: -200 * scale, lineGap: 100 * scale },
          };
          expect(fitFont(scaled, font([b, a]), weights).sizeAdjust).toBeCloseTo(
            result.sizeAdjust,
            12,
          );
          expect(result.sizeAdjust * result.ascentOverride).toBeCloseTo(0.8, 12);
          expect(result.sizeAdjust * result.descentOverride).toBeCloseTo(0.2, 12);
          expect(result.sizeAdjust * result.lineGapOverride).toBeCloseTo(0.1, 12);
        },
      ),
    );
  });
});
