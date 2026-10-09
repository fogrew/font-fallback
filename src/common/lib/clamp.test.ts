import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('returns the value when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('limits values to the bounds', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('throws when the range is inverted', () => {
    expect(() => clamp(1, 2, 1)).toThrow(RangeError);
  });

  it('always lands within the range', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        fc.double({ noNaN: true }),
        (value, a, b) => {
          const [min, max] = a <= b ? [a, b] : [b, a];
          const result = clamp(value, min, max);
          return result >= min && result <= max;
        },
      ),
    );
  });
});
