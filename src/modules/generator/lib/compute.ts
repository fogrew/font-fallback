import {
  type FitAdjustment,
  FitError,
  fitFont,
  fitFromAverages,
  languageWeights,
  type SystemFont,
  systemFonts,
} from '@/modules/fallback-fit';
import type { FontMetrics } from '@/modules/font-metrics';

const GENERIC_ORDER: Record<SystemFont['genericFamily'], number> = {
  'sans-serif': 0,
  serif: 1,
  monospace: 2,
};

export interface Candidate {
  font: SystemFont;
  adjustment: FitAdjustment;
}

export interface Ranking {
  candidates: Candidate[];
  coverage: number;
}

export function rankFallbacks(web: FontMetrics): Ranking {
  const own = fitFont(web, web, languageWeights('en'));
  const candidates = systemFonts
    .map((font) => ({
      font,
      adjustment: fitFromAverages(web, own.targetWidthEm, font.latinWidthEm),
    }))
    .sort(
      (a, b) =>
        GENERIC_ORDER[a.font.genericFamily] - GENERIC_ORDER[b.font.genericFamily] ||
        Math.abs(Math.log(a.adjustment.sizeAdjust)) - Math.abs(Math.log(b.adjustment.sizeAdjust)),
    );
  return { candidates, coverage: own.coverage };
}

export function isNoCoverage(error: unknown): boolean {
  return error instanceof FitError && error.code === 'no-shared-glyphs';
}
