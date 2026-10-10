import { describe, expect, it } from 'vitest';
import { PRESETS, presetFor } from './presets';
import { MAX_QUERY_LENGTH, resolveQuery } from './resolve';

describe('resolveQuery', () => {
  it('groups resolved versions by browser and reports the data date', async () => {
    const result = await resolveQuery('chrome 120, firefox 121');
    expect(result).toMatchObject({ ok: true, count: 2 });
    if (!result.ok) return;
    expect(result.groups).toEqual([
      { id: 'chrome', name: 'Chrome', versions: ['120'] },
      { id: 'firefox', name: 'Firefox', versions: ['121'] },
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
