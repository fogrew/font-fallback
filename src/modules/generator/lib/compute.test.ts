import { describe, expect, it } from 'vitest';
import type { FontMetrics } from '@/modules/font-metrics';
import { isNoCoverage, rankFallbacks, sampleText } from './compute';
import { adjustmentOf, buildCss } from './css';

function font(codePoints: number[], advance: number): FontMetrics {
  return {
    names: { family: 'Test', fullName: 'Test', postscript: 'Test' },
    unitsPerEm: 1000,
    hhea: { ascent: 900, descent: -200, lineGap: 0 },
    typo: null,
    win: null,
    capHeight: null,
    xHeight: null,
    codePoints: Uint32Array.from(codePoints),
    advances: Float64Array.from(codePoints, () => advance),
    isVariable: false,
  };
}

const ascii = Array.from({ length: 95 }, (_, index) => 0x20 + index);

describe('rankFallbacks', () => {
  it('ranks the fallback with the closest width first and scales by the width ratio', () => {
    const { candidates, coverage } = rankFallbacks(font(ascii, 520));
    expect(coverage).toBeGreaterThan(0.99);
    const arial = candidates.find((candidate) => candidate.font.id === 'arial');
    expect(arial?.adjustment.sizeAdjust).toBeCloseTo(0.52 / (913 / 2048), 6);
    const sans = candidates
      .filter((candidate) => candidate.font.genericFamily === 'sans-serif')
      .map((candidate) => Math.abs(Math.log(candidate.adjustment.sizeAdjust)));
    expect(sans).toEqual([...sans].sort((a, b) => a - b));
    expect(
      candidates.slice(0, sans.length).every((item) => item.font.genericFamily === 'sans-serif'),
    ).toBe(true);
    expect(candidates.at(-1)?.font.genericFamily).toBe('monospace');
  });

  it('reports a font without Latin glyphs', () => {
    expect.assertions(1);
    try {
      rankFallbacks(font([0x410, 0x411], 600));
    } catch (error) {
      expect(isNoCoverage(error)).toBe(true);
    }
  });
});

describe('buildCss', () => {
  it('applies manual overrides over the automatic values', () => {
    const { candidates } = rankFallbacks(font(ascii, 520));
    const [best] = candidates;
    if (!best) throw new Error('no candidates');
    const adjustment = adjustmentOf(best.adjustment, { sizeAdjust: 1.05 });
    expect(adjustment.sizeAdjust).toBe(1.05);
    expect(adjustment.ascentOverride).toBe(best.adjustment.ascentOverride);
    const css = buildCss('Test', best.font, adjustment);
    expect(css.fontFaces).toContain('size-adjust: 105%');
    expect(css.fontFamily).toContain('"Test Fallback"');
  });
});

describe('sampleText', () => {
  it('keeps the preferred text when the font covers it', () => {
    expect(sampleText(font(ascii, 500), 'The quick brown fox')).toBe('The quick brown fox');
  });

  it('builds a sample from the font own glyphs when the preferred text is mostly missing', () => {
    const runes = Array.from({ length: 20 }, (_, index) => 0x16a0 + index);
    const sample = sampleText(font([0x20, ...runes], 500), 'The quick brown fox');
    expect(sample).not.toContain('quick');
    expect(
      [...sample.replaceAll(' ', '')].every((char) => runes.includes(char.codePointAt(0) ?? 0)),
    ).toBe(true);
    expect(sample.split(' ').length).toBeGreaterThan(1);
  });
});
