import { describe, expect, it } from 'vitest';
import { resolveQuery } from './resolve';
import { descriptorSupport, FEATURES, lacksVerticalOverrides, supportData } from './support';

const entry = (name: string, usage: number) => ({ entry: name, usage });
const find = (list: ReturnType<typeof descriptorSupport>, feature: string) => {
  const found = list.find((item) => item.feature === feature);
  if (!found) throw new Error(feature);
  return found;
};

describe('descriptorSupport', () => {
  it('weighs support by usage and names the browsers lacking a feature', () => {
    const list = descriptorSupport([
      entry('chrome 130', 60),
      entry('safari 16.4', 20),
      entry('ios_saf 17.0-17.1', 20),
    ]);
    expect(find(list, 'size-adjust').supported).toBeCloseTo(80);
    expect(find(list, 'size-adjust').unsupportedBrowsers).toEqual(['Safari']);
    expect(find(list, 'ascent-override').supported).toBeCloseTo(60);
    expect(find(list, 'ascent-override').unsupportedBrowsers).toEqual(['Safari', 'Safari on iOS']);
    expect(find(list, 'font-size-adjust').supported).toBeCloseTo(100);
    expect(lacksVerticalOverrides(list)).toBeCloseTo(40);
  });

  it('treats browsers missing from the data as unknown and weighs equally without usage', () => {
    const list = descriptorSupport([entry('op_mini all', 0), entry('chrome 120', 0)]);
    expect(find(list, 'unicode-range').unknown).toBeCloseTo(50);
    expect(find(list, 'unicode-range').unknownBrowsers).toEqual(['Opera Mini']);
    expect(find(list, 'unicode-range').supported).toBeCloseTo(50);
  });

  it('compares versions by lower bound and handles preview builds', () => {
    const list = descriptorSupport([
      entry('chrome 86', 1),
      entry('chrome 87', 1),
      entry('safari TP', 1),
    ]);
    expect(find(list, 'ascent-override').supported).toBeCloseTo(33.3, 0);
    expect(find(list, 'size-adjust').supported).toBeCloseTo(33.3, 0);
  });

  it('marks ranges that straddle the first supporting release as unknown', () => {
    const list = descriptorSupport([
      entry('ios_saf 16.0-16.3', 1),
      entry('ios_saf 16.4-16.7', 1),
      entry('ios_saf 16.0-16.6', 1),
    ]);
    const adjust = find(list, 'font-size-adjust');
    expect(adjust.supported).toBeCloseTo(33.3, 0);
    expect(adjust.unsupported).toBeCloseTo(33.3, 0);
    expect(adjust.unknown).toBeCloseTo(33.3, 0);
  });

  it('covers every feature and keeps the data fresh and complete', () => {
    expect(descriptorSupport([entry('chrome 120', 1)]).map((item) => item.feature)).toEqual([
      ...FEATURES,
    ]);
    for (const feature of FEATURES) expect(supportData.features[feature]).toBeDefined();
    expect(supportData.bcdVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('works on a real resolved audience', async () => {
    const result = await resolveQuery('baseline widely available');
    if (!result.ok) throw new Error('expected a resolution');
    const list = descriptorSupport(result.entries);
    expect(find(list, 'size-adjust').supported).toBeGreaterThan(80);
    expect(find(list, 'unicode-range').supported).toBeGreaterThan(95);
  });
});
