import { generateFallbackCss } from '@/modules/export';
import type { FitAdjustment } from '@/modules/fallback-fit';
import type { Category } from '@/modules/os-fonts';

export interface Overrides {
  sizeAdjust: number;
  ascentOverride: number;
  descentOverride: number;
  lineGapOverride: number;
}

export interface CssFace {
  family: string;
  localNames: readonly string[];
  adjustment: Overrides;
}

export function adjustmentOf(adjustment: FitAdjustment, overrides: Partial<Overrides>): Overrides {
  return {
    sizeAdjust: overrides.sizeAdjust ?? adjustment.sizeAdjust,
    ascentOverride: overrides.ascentOverride ?? adjustment.ascentOverride,
    descentOverride: overrides.descentOverride ?? adjustment.descentOverride,
    lineGapOverride: overrides.lineGapOverride ?? adjustment.lineGapOverride,
  };
}

export function buildCss(targetFamily: string, faces: readonly CssFace[], generic: Category) {
  return generateFallbackCss({
    targetFamily,
    fallbacks: faces.map((face) => ({
      family:
        faces.length === 1 ? `${targetFamily} Fallback` : `${targetFamily} Fallback ${face.family}`,
      localNames: face.localNames,
      adjustment: face.adjustment,
    })),
    genericFamily: generic,
  });
}
