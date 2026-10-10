import { describe, expect, it } from 'vitest';
import { displayedFitValue, type FitValue, pinFitValue } from '../index';

describe('fit value controls', () => {
  it('tracks automatic values until a manual edit pins the result', () => {
    let value: FitValue = { mode: 'auto' };
    expect(displayedFitValue(value, 105)).toBe(105);
    value = pinFitValue(108);
    expect(displayedFitValue(value, 120)).toBe(108);
    value = { mode: 'auto' };
    expect(displayedFitValue(value, 120)).toBe(120);
  });

  it('clamps automatic values into the bounds and falls back to the minimum for nonfinite ones', () => {
    const bounds = { min: 50, max: 150 };
    expect(displayedFitValue({ mode: 'auto' }, 200, bounds)).toBe(150);
    expect(displayedFitValue({ mode: 'auto' }, 10, bounds)).toBe(50);
    expect(displayedFitValue({ mode: 'auto' }, Number.NaN, bounds)).toBe(50);
    expect(displayedFitValue({ mode: 'auto' }, Number.POSITIVE_INFINITY, bounds)).toBe(50);
  });

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite manual values %s', (value) => {
    expect(() => pinFitValue(value)).toThrow('Invalid fit value');
  });
});
