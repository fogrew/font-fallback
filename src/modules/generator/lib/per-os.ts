import {
  type FitAdjustment,
  FitError,
  type FitFont,
  fitFont,
  fitFromAverages,
  languageWeights,
  resolveStack,
  type StackResolution,
  systemFonts,
} from '@/modules/fallback-fit';
import type { FontMetrics } from '@/modules/font-metrics';
import {
  type Category,
  type OsFont,
  type OsId,
  osAvailability,
  osFontMetrics,
  osFontsDataset,
} from '@/modules/os-fonts';

export type Language = 'en' | 'ru';

interface PoolFont {
  id: string;
  family: string;
  localNames: readonly string[];
  category: Category;
  fit: FitFont | null;
  latinWidthEm: number | null;
  dataset: OsFont;
}

export interface Candidate {
  id: string;
  family: string;
  localNames: readonly string[];
  category: Category;
  adjustment: FitAdjustment;
  coverage: number;
  latinOnly: boolean;
}

export interface Ranking {
  candidates: Candidate[];
  coverage: number;
}

let pool: PoolFont[] | undefined;

function fonts(): PoolFont[] {
  if (pool) return pool;
  const result: PoolFont[] = [];
  const measured = new Set<string>();
  for (const metrics of osFontMetrics()) {
    const dataset = osFontsDataset.fonts.find((font) => font.id === metrics.id);
    if (!dataset) continue;
    measured.add(metrics.id);
    result.push({
      id: metrics.id,
      family: dataset.family,
      localNames: metrics.localNames.length > 0 ? metrics.localNames : [dataset.family],
      category: dataset.category,
      fit: metrics,
      latinWidthEm: null,
      dataset,
    });
  }
  for (const system of systemFonts) {
    const dataset = osFontsDataset.fonts.find((font) => font.family === system.family);
    if (!dataset || measured.has(dataset.id)) continue;
    result.push({
      id: dataset.id,
      family: dataset.family,
      localNames: system.localNames,
      category: dataset.category,
      fit: null,
      latinWidthEm: system.latinWidthEm,
      dataset,
    });
  }
  pool = result;
  return result;
}

function preinstalledOn(font: OsFont, os: OsId): boolean {
  return osAvailability(font, os, osFontsDataset).level === 'preinstalled';
}

function presentOn(font: OsFont, os: OsId): boolean {
  return font.availability.some((entry) => entry.os === os && entry.status === 'preinstalled');
}

export function systemsWithFonts(): OsId[] {
  return (['windows', 'macos', 'ios', 'android', 'linux', 'chromeos'] as const).filter((os) =>
    fonts().some((font) => preinstalledOn(font.dataset, os)),
  );
}

export function rankFor(web: FontMetrics, os: OsId, language: Language): Ranking {
  const weights = languageWeights(language);
  const own = fitFont(web, web, weights);
  const candidates: Candidate[] = [];
  for (const font of fonts()) {
    if (!preinstalledOn(font.dataset, os)) continue;
    try {
      if (font.fit) {
        const result = fitFont(web, font.fit, weights);
        candidates.push({
          id: font.id,
          family: font.family,
          localNames: font.localNames,
          category: font.category,
          adjustment: result,
          coverage: own.coverage > 0 ? Math.min(1, result.coverage / own.coverage) : 0,
          latinOnly: false,
        });
      } else if (font.latinWidthEm !== null && language === 'en') {
        candidates.push({
          id: font.id,
          family: font.family,
          localNames: font.localNames,
          category: font.category,
          adjustment: fitFromAverages(web, own.targetWidthEm, font.latinWidthEm),
          coverage: 1,
          latinOnly: true,
        });
      }
    } catch (failure) {
      if (!(failure instanceof FitError)) throw failure;
    }
  }
  candidates.sort(
    (a, b) =>
      Number(b.coverage >= 0.95) - Number(a.coverage >= 0.95) ||
      Math.abs(Math.log(a.adjustment.sizeAdjust)) - Math.abs(Math.log(b.adjustment.sizeAdjust)),
  );
  return { candidates, coverage: own.coverage };
}

export interface SystemPick {
  os: OsId;
  share: number;
  faceId: string;
}

export interface Plan {
  order: string[];
  resolution: StackResolution;
}

export function rankKey(os: string, rank: number): string {
  return rank === 0 ? os : `${os}#${rank + 1}`;
}

export function planStack(picks: readonly SystemPick[], order?: readonly string[]): Plan {
  const ranked = [...picks].sort((a, b) => b.share - a.share);
  const defaults = [...new Set(ranked.map((pick) => pick.faceId))];
  const valid =
    order &&
    order.length === defaults.length &&
    defaults.every((id) => order.includes(id)) &&
    new Set(order).size === order.length;
  const finalOrder = valid ? [...order] : defaults;
  const byId = new Map(fonts().map((font) => [font.id, font]));

  const bySystem = new Map<OsId, string[]>();
  for (const pick of picks) bySystem.set(pick.os, [...(bySystem.get(pick.os) ?? []), pick.faceId]);

  const availability = new Map<string, string[]>(finalOrder.map((id) => [id, []]));
  const preferences: { platform: string; preferredFace: string }[] = [];
  for (const [os, list] of bySystem) {
    for (const [rank, faceId] of list.entries()) {
      const key = rankKey(os, rank);
      preferences.push({ platform: key, preferredFace: faceId });
      const earlier = new Set(list.slice(0, rank));
      for (const id of finalOrder) {
        const font = byId.get(id);
        if (font && presentOn(font.dataset, os) && !earlier.has(id))
          availability.get(id)?.push(key);
      }
    }
  }
  const faces = finalOrder.map((id) => ({ id, availableOn: availability.get(id) ?? [] }));
  return { order: finalOrder, resolution: resolveStack(faces, preferences) };
}

export function candidateById(id: string) {
  return fonts().find((font) => font.id === id);
}
