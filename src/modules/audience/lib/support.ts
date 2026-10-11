import raw from '../data/descriptor-support.json';
import { browserName } from './names';
import type { WeightedEntry } from './os';

export const FEATURES = [
  'size-adjust',
  'ascent-override',
  'descent-override',
  'line-gap-override',
  'font-size-adjust',
  'unicode-range',
] as const;

export type Feature = (typeof FEATURES)[number];

export interface SupportData {
  bcdVersion: string;
  features: Record<string, Record<string, string | false | null>>;
}

export interface FeatureSupport {
  feature: Feature;
  supported: number;
  unsupported: number;
  unknown: number;
  unsupportedBrowsers: string[];
  unknownBrowsers: string[];
}

export const supportData = raw as SupportData;

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function bounds(version: string): [string, string] | null {
  if (version === 'TP') return [String(Number.MAX_SAFE_INTEGER), String(Number.MAX_SAFE_INTEGER)];
  const parts = version.split('-');
  const [low, high = low] = parts;
  const valid = (value: string | undefined): value is string =>
    value !== undefined && /^\d+(\.\d+)*$/.test(value);
  return parts.length <= 2 && valid(low) && valid(high) ? [low, high] : null;
}

export type Verdict = 'yes' | 'no' | 'unknown';

function verdictFor(entry: string, row: Record<string, string | false | null>): Verdict {
  const space = entry.indexOf(' ');
  const id = entry.slice(0, space);
  const added = row[id];
  if (added === undefined || added === null) return 'unknown';
  if (added === false) return 'no';
  const range = bounds(entry.slice(space + 1));
  if (range === null) return 'unknown';
  if (compareVersions(range[0], added) >= 0) return 'yes';
  return compareVersions(range[1], added) < 0 ? 'no' : 'unknown';
}

export function verdictsOf(
  entry: string,
  data: SupportData = supportData,
): Record<Feature, Verdict> {
  return Object.fromEntries(
    FEATURES.map((feature) => [feature, verdictFor(entry, data.features[feature] ?? {})]),
  ) as Record<Feature, Verdict>;
}

export function descriptorSupport(
  entries: readonly WeightedEntry[],
  data: SupportData = supportData,
): FeatureSupport[] {
  const total = entries.reduce((sum, item) => sum + item.usage, 0);
  return FEATURES.map((feature) => {
    const row = data.features[feature] ?? {};
    const shares = { yes: 0, no: 0, unknown: 0 };
    const unsupported = new Set<string>();
    const unknown = new Set<string>();
    for (const { entry, usage } of entries) {
      const verdict = verdictFor(entry, row);
      shares[verdict] += total > 0 ? usage : 1;
      const name = browserName(entry.slice(0, entry.indexOf(' ')));
      if (verdict === 'no') unsupported.add(name);
      if (verdict === 'unknown') unknown.add(name);
    }
    const sum = shares.yes + shares.no + shares.unknown;
    const percent = (value: number) => (sum > 0 ? (value / sum) * 100 : 0);
    return {
      feature,
      supported: percent(shares.yes),
      unsupported: percent(shares.no),
      unknown: percent(shares.unknown),
      unsupportedBrowsers: [...unsupported],
      unknownBrowsers: [...unknown],
    };
  });
}

export const VERTICAL_OVERRIDES: readonly Feature[] = [
  'ascent-override',
  'descent-override',
  'line-gap-override',
];

export function lacksVerticalOverrides(support: readonly FeatureSupport[]): number {
  const found = support.find((item) => item.feature === 'ascent-override');
  return found ? found.unsupported + found.unknown : 0;
}
