import { browserName } from './names';
import type { WeightedEntry } from './os';
import type { UsageStats } from './stats';

export const MAX_QUERY_LENGTH = 512;

export interface BrowserGroup {
  id: string;
  name: string;
  versions: string[];
}

export type Resolution =
  | {
      ok: true;
      groups: BrowserGroup[];
      entries: WeightedEntry[];
      count: number;
      dataDate: string;
      coverage?: number;
    }
  | { ok: false; code: 'empty' | 'too-long' | 'invalid' | 'no-match'; detail: string };

export async function resolveQuery(query: string, stats?: UsageStats): Promise<Resolution> {
  const text = query.trim();
  if (text === '') return { ok: false, code: 'empty', detail: '' };
  if (text.length > MAX_QUERY_LENGTH) return { ok: false, code: 'too-long', detail: '' };
  const { default: browserslist } = await import('browserslist');
  let entries: string[];
  try {
    entries = browserslist(text, { path: false, ...(stats ? { stats } : {}) });
  } catch (failure) {
    const detail = failure instanceof Error ? failure.message : String(failure);
    return { ok: false, code: 'invalid', detail: detail.slice(0, 300) };
  }
  if (entries.length === 0) return { ok: false, code: 'no-match', detail: '' };
  const groups = new Map<string, BrowserGroup>();
  for (const entry of entries) {
    const space = entry.indexOf(' ');
    const id = space < 0 ? entry : entry.slice(0, space);
    const version = space < 0 ? '' : entry.slice(space + 1);
    let group = groups.get(id);
    if (!group) {
      group = { id, name: browserName(id), versions: [] };
      groups.set(id, group);
    }
    group.versions.push(version);
  }
  return {
    ok: true,
    groups: [...groups.values()],
    entries: weigh(entries, stats ? flatten(stats) : (browserslist.usage.global ?? {})),
    count: entries.length,
    dataDate: latestReleaseDate(browserslist.data),
    ...(stats ? { coverage: browserslist.coverage(entries, stats) } : {}),
  };
}

function latestReleaseDate(
  data: Record<string, { releaseDate: Record<string, number | null | undefined> } | undefined>,
): string {
  let latest = 0;
  for (const browser of Object.values(data)) {
    if (!browser) continue;
    for (const seconds of Object.values(browser.releaseDate)) {
      if (seconds && seconds > latest) latest = seconds;
    }
  }
  return new Date(latest * 1000).toISOString().slice(0, 10);
}

function flatten(stats: UsageStats): Record<string, number> {
  const table: Record<string, number> = {};
  for (const [browser, versions] of Object.entries(stats)) {
    for (const [version, share] of Object.entries(versions)) table[`${browser} ${version}`] = share;
  }
  return table;
}

function weigh(entries: string[], table: Record<string, number | undefined>): WeightedEntry[] {
  return entries.map((entry) => {
    const direct = table[entry];
    if (direct !== undefined) return { entry, usage: direct };
    const space = entry.indexOf(' ');
    const id = entry.slice(0, space);
    const usage = entry
      .slice(space + 1)
      .split('-')
      .reduce((sum, version) => sum + (table[`${id} ${version}`] ?? 0), 0);
    return { entry, usage };
  });
}
