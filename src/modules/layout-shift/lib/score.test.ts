import { describe, expect, it } from 'vitest';
import { layoutShiftScore, unionArea } from './score';

const viewport = { width: 1000, height: 1000 };
const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('unionArea', () => {
  it('counts overlapping area once', () => {
    expect(unionArea([box(0, 0, 100, 100), box(50, 50, 100, 100)])).toBe(17500);
    expect(unionArea([box(0, 0, 10, 10), box(0, 0, 10, 10)])).toBe(100);
    expect(unionArea([box(0, 0, 10, 10), box(20, 20, 10, 10)])).toBe(200);
    expect(unionArea([])).toBe(0);
  });
});

describe('layoutShiftScore', () => {
  it('matches a hand-computed single shift', () => {
    const result = layoutShiftScore(
      [{ before: box(0, 0, 100, 100), after: box(0, 50, 100, 100) }],
      viewport,
    );
    expect(result.impactFraction).toBeCloseTo(0.015);
    expect(result.distanceFraction).toBeCloseTo(0.05);
    expect(result.score).toBeCloseTo(0.00075);
    expect(result.shifted).toBe(1);
  });

  it('unions the regions of several elements and uses the largest distance', () => {
    const result = layoutShiftScore(
      [
        { before: box(0, 0, 100, 100), after: box(0, 100, 100, 100) },
        { before: box(0, 100, 100, 100), after: box(0, 200, 100, 100) },
      ],
      viewport,
    );
    expect(result.impactFraction).toBeCloseTo(0.03);
    expect(result.distanceFraction).toBeCloseTo(0.1);
    expect(result.score).toBeCloseTo(0.003);
  });

  it('clips regions to the viewport and ignores elements entirely outside it', () => {
    const result = layoutShiftScore(
      [
        { before: box(0, 950, 100, 100), after: box(0, 1000, 100, 100) },
        { before: box(0, 2000, 100, 100), after: box(0, 2100, 100, 100) },
      ],
      viewport,
    );
    expect(result.shifted).toBe(1);
    expect(result.impactFraction).toBeCloseTo(0.005);
    expect(result.distanceFraction).toBeCloseTo(0.05);
  });

  it('ignores elements that only change size or move less than half a pixel', () => {
    const result = layoutShiftScore(
      [
        { before: box(0, 0, 100, 100), after: box(0, 0, 100, 200) },
        { before: box(10, 10, 50, 50), after: box(10.2, 10.1, 50, 50) },
      ],
      viewport,
    );
    expect(result).toMatchObject({ score: 0, shifted: 0 });
  });

  it('uses the larger viewport dimension and horizontal movement for the distance', () => {
    const result = layoutShiftScore(
      [{ before: box(0, 0, 100, 100), after: box(200, 0, 100, 100) }],
      { width: 400, height: 800 },
    );
    expect(result.distanceFraction).toBeCloseTo(0.25);
    expect(result.impactFraction).toBeCloseTo(20000 / 320000);
  });

  it('rejects invalid viewports and oversized inputs', () => {
    expect(() => layoutShiftScore([], { width: 0, height: 100 })).toThrow();
    expect(() => layoutShiftScore([], { width: Number.NaN, height: 100 })).toThrow();
    const many = Array.from({ length: 1001 }, () => ({
      before: box(0, 0, 1, 1),
      after: box(0, 1, 1, 1),
    }));
    expect(() => layoutShiftScore(many, viewport)).toThrow();
  });
});
