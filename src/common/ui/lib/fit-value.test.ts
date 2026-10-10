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

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite manual values %s', (value) => {
    expect(() => pinFitValue(value)).toThrow('Invalid fit value');
  });
});
