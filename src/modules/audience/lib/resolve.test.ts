import { describe, expect, it } from 'vitest';
import { PRESETS, presetFor } from './presets';
import { MAX_QUERY_LENGTH, resolveQuery, versionRanges } from './resolve';

describe('resolveQuery', () => {
  it('groups resolved versions by browser and reports the data date', async () => {
    const result = await resolveQuery('chrome 120, firefox 121');
    expect(result).toMatchObject({ ok: true, count: 2 });
    if (!result.ok) return;
    expect(result.groups).toEqual([
      { id: 'chrome', name: 'Chrome', versions: ['120'], ranges: ['120'] },
      { id: 'firefox', name: 'Firefox', versions: ['121'], ranges: ['121'] },
    ]);
    expect(result.dataDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects empty, oversized and malformed queries', async () => {
    expect(await resolveQuery('   ')).toMatchObject({ ok: false, code: 'empty' });
    expect(await resolveQuery('a'.repeat(MAX_QUERY_LENGTH + 1))).toMatchObject({
      ok: false,
      code: 'too-long',
    });
    const invalid = await resolveQuery('not a query');
    expect(invalid).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('reports unknown versions and queries without matches', async () => {
    expect(await resolveQuery('chrome 1')).toMatchObject({ ok: false, code: 'invalid' });
    expect(await resolveQuery('chrome 120 and firefox 121')).toMatchObject({
      ok: false,
      code: 'no-match',
    });
  });

  it('cannot read the file system for config or extends queries', async () => {
    expect(await resolveQuery('extends some-config')).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('resolves every preset to at least one browser', async () => {
    for (const preset of PRESETS) {
      const result = await resolveQuery(preset.query);
      expect(result, preset.id).toMatchObject({ ok: true });
      if (result.ok) expect(result.count, preset.id).toBeGreaterThan(0);
    }
  });

  it('matches presets regardless of spacing', () => {
    expect(presetFor('  baseline   widely available ')?.id).toBe('widely');
    expect(presetFor('chrome 120')).toBeUndefined();
  });
});

describe('resolved usage weights', () => {
  it('weighs entries with global usage, summing joined iOS ranges', async () => {
    const result = await resolveQuery('chrome 120, ios_saf 17.0-17.1');
    if (!result.ok) throw new Error('expected a resolution');
    const ios = result.entries.find((item) => item.entry.startsWith('ios_saf'));
    expect(ios?.usage).toBeGreaterThan(0);
    expect(result.entries.find((item) => item.entry === 'chrome 120')?.usage).toBeGreaterThan(0);
  });
});

describe('versionRanges', () => {
  const released = ['15', '16', '17', '18', '19', '20'];

  it('merges consecutive releases and keeps gaps', () => {
    expect(versionRanges(['16', '17', '18', '20'], released)).toEqual(['16–18', '20']);
    expect(versionRanges(['20', '15'], released)).toEqual(['15', '20']);
    expect(versionRanges(['15', '16'], released)).toEqual(['15–16']);
  });

  it('keeps joined releases and unknown versions', () => {
    const ios = ['16.6', '17.0-17.1', '17.2-17.3', '18.0'];
    expect(versionRanges(['16.6', '17.0-17.1', '17.2-17.3'], ios)).toEqual(['16.6–17.3']);
    expect(versionRanges(['17.0-17.1'], ios)).toEqual(['17.0–17.1']);
    expect(versionRanges(['18.0', 'TP'], ios)).toEqual(['18.0', 'TP']);
    expect(versionRanges([], released)).toEqual([]);
  });

  it('collapses a real default query into a few ranges', async () => {
    const result = await resolveQuery('baseline widely available');
    if (!result.ok) throw new Error('expected a resolution');
    const safari = result.groups.find((group) => group.id === 'safari');
    expect(safari?.ranges.length).toBeLessThan(3);
    expect(safari?.ranges[0]).toContain('–');
  });
});
