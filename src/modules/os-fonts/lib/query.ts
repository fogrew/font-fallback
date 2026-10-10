import type { OsFont, OsFontsDataset, OsId } from './model';

export type OsAvailability = 'preinstalled' | 'partial' | 'on-demand' | 'unknown';

export interface OsAvailabilityResult {
  level: OsAvailability;
  present: string[];
  missing: string[];
}

export function osAvailability(
  font: OsFont,
  os: OsId,
  dataset: Pick<OsFontsDataset, 'platforms'>,
): OsAvailabilityResult {
  const versions = dataset.platforms[os].versions;
  const status = new Map<string, 'preinstalled' | 'on-demand'>();
  for (const entry of font.availability) {
    if (entry.os !== os) continue;
    for (const version of entry.versions) {
      if (status.get(version) !== 'preinstalled') status.set(version, entry.status);
    }
  }
  const present = versions.filter((version) => status.has(version));
  const missing = versions.filter((version) => !status.has(version));
  if (present.length === 0) return { level: 'unknown', present, missing };
  if (missing.length > 0) return { level: 'partial', present, missing };
  const allPreinstalled = present.every((version) => status.get(version) === 'preinstalled');
  return { level: allPreinstalled ? 'preinstalled' : 'on-demand', present, missing };
}

export function fontsAvailableOn(
  dataset: OsFontsDataset,
  os: OsId,
  level: OsAvailability = 'preinstalled',
): OsFont[] {
  return dataset.fonts.filter((font) => osAvailability(font, os, dataset).level === level);
}
