import { generateFallbackCss } from '@/modules/export';
import type { FitAdjustment, SystemFont } from '@/modules/fallback-fit';

export interface Overrides {
  sizeAdjust: number;
  ascentOverride: number;
  descentOverride: number;
  lineGapOverride: number;
}

export function adjustmentOf(adjustment: FitAdjustment, overrides: Partial<Overrides>): Overrides {
  return {
    sizeAdjust: overrides.sizeAdjust ?? adjustment.sizeAdjust,
    ascentOverride: overrides.ascentOverride ?? adjustment.ascentOverride,
    descentOverride: overrides.descentOverride ?? adjustment.descentOverride,
    lineGapOverride: overrides.lineGapOverride ?? adjustment.lineGapOverride,
  };
}

export function buildCss(targetFamily: string, font: SystemFont, adjustment: Overrides) {
  return generateFallbackCss({
    targetFamily,
    fallbacks: [{ family: `${targetFamily} Fallback`, localNames: font.localNames, adjustment }],
    genericFamily: font.genericFamily,
  });
}
