import { describe, expect, it } from 'vitest';
import { font } from './font.test-util';
import { aspectOf, safariStrategyCss } from './safari';

describe('aspectOf', () => {
  it('divides the x-height by the em and rejects missing or absurd values', () => {
    expect(aspectOf({ ...font([97], 500), xHeight: 486 })).toBeCloseTo(0.486);
    expect(aspectOf({ ...font([97], 500), xHeight: null })).toBeNull();
    expect(aspectOf({ ...font([97], 500), xHeight: 5000 })).toBeNull();
    expect(aspectOf({ ...font([97], 500), xHeight: 0 })).toBeNull();
  });
});

describe('safariStrategyCss', () => {
  it('emits font-size-adjust and a fixed line height', () => {
    const css = safariStrategyCss(0.48774, 1.4);
    expect(css).toContain('font-size-adjust: 0.4877;');
    expect(css).not.toContain('{');
    expect(css).toContain('line-height: 1.4;');
  });

  it('rejects invalid numbers', () => {
    expect(() => safariStrategyCss(Number.NaN, 1.4)).toThrow();
    expect(() => safariStrategyCss(0.5, 0)).toThrow();
  });
});
