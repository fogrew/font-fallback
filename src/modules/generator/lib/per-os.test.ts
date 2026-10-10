import { describe, expect, it } from 'vitest';
import { font } from './font.test-util';
import { planStack, rankFor, systemsWithFonts } from './per-os';

const ascii = Array.from({ length: 95 }, (_, index) => 0x20 + index);
const cyrillic = Array.from({ length: 64 }, (_, index) => 0x410 + index);

describe('rankFor', () => {
  it('lists only fonts preinstalled on the system, closest width first within full coverage', () => {
    const windows = rankFor(font(ascii, 520), 'windows', 'en').candidates.map((item) => item.id);
    expect(windows).toContain('arial');
    expect(windows).toContain('segoe-ui');
    expect(windows).not.toContain('roboto');
    expect(windows).not.toContain('helvetica');

    const android = rankFor(font(ascii, 520), 'android', 'en').candidates.map((item) => item.id);
    expect(android).toContain('roboto');
    expect(android).not.toContain('arial');

    const sizes = rankFor(font(ascii, 520), 'windows', 'en').candidates.map((item) =>
      Math.abs(Math.log(item.adjustment.sizeAdjust)),
    );
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });

  it('offers the Latin-only Helvetica on Apple systems for English only', () => {
    const english = rankFor(font(ascii, 520), 'macos', 'en').candidates;
    const helvetica = english.find((item) => item.id === 'helvetica');
    expect(helvetica?.latinOnly).toBe(true);
    const russian = rankFor(font([...ascii, ...cyrillic], 520), 'macos', 'ru').candidates;
    expect(russian.some((item) => item.id === 'helvetica')).toBe(false);
  });

  it('measures Cyrillic coverage from real advances', () => {
    const web = font([...ascii, ...cyrillic], 520);
    const ranking = rankFor(web, 'windows', 'ru');
    const arial = ranking.candidates.find((item) => item.id === 'arial');
    expect(arial?.coverage).toBeGreaterThan(0.95);
    expect(arial?.latinOnly).toBe(false);
  });

  it('knows which systems have candidates', () => {
    const systems = systemsWithFonts();
    expect(systems).toEqual(
      expect.arrayContaining(['windows', 'macos', 'ios', 'android', 'linux']),
    );
    expect(systems).not.toContain('chromeos');
  });
});

describe('planStack', () => {
  it('orders faces by share and matches every system when nothing overlaps', () => {
    const plan = planStack([
      { os: 'android', share: 60, faceId: 'roboto' },
      { os: 'windows', share: 30, faceId: 'segoe-ui' },
    ]);
    expect(plan.order).toEqual(['roboto', 'segoe-ui']);
    expect(plan.resolution.platforms.every((item) => item.status === 'matched')).toBe(true);
    expect(plan.resolution.suggestion).toBeNull();
  });

  it('reports shadowing and proposes a reorder when a font exists on another system', () => {
    const picks = [
      { os: 'windows' as const, share: 60, faceId: 'arial' },
      { os: 'macos' as const, share: 30, faceId: 'helvetica' },
    ];
    const plan = planStack(picks);
    expect(plan.order).toEqual(['arial', 'helvetica']);
    const macos = plan.resolution.platforms.find((item) => item.platform === 'macos');
    expect(macos?.status).toBe('shadowed');
    expect(plan.resolution.suggestion?.order).toEqual(['helvetica', 'arial']);
    const fixed = planStack(picks, plan.resolution.suggestion?.order);
    expect(fixed.resolution.platforms.every((item) => item.status === 'matched')).toBe(true);
  });

  it('reports a cycle when two systems need opposite orders', () => {
    const plan = planStack([
      { os: 'windows', share: 60, faceId: 'arial' },
      { os: 'macos', share: 30, faceId: 'georgia' },
    ]);
    expect(plan.resolution.blockedBy).toBe('cycle');
    expect(plan.resolution.suggestion).toBeNull();
  });

  it('ignores an order that does not list the same faces', () => {
    const plan = planStack([{ os: 'android', share: 1, faceId: 'roboto' }], ['nope']);
    expect(plan.order).toEqual(['roboto']);
  });
});
