import type { FontMetrics } from '@/modules/font-metrics';
import type { PredictFont } from '@/modules/layout-shift';
import type { Overrides } from './css';
import type { SpacingEm } from './loading';
import type { Candidate, Ranking } from './per-os';

export function webPredictFont(web: FontMetrics, ranking: Pick<Ranking, 'web'>): PredictFont {
  return {
    unitsPerEm: web.unitsPerEm,
    codePoints: web.codePoints,
    advances: web.advances,
    scale: 1,
    ascent: ranking.web.ascent,
    descent: ranking.web.descent,
    lineGap: ranking.web.lineGap,
    letterEm: 0,
    wordEm: 0,
  };
}

export function fallbackPredictFont(
  candidate: Candidate,
  adjustment: Overrides,
  spacing: SpacingEm,
): PredictFont | null {
  if (!candidate.fit) return null;
  const scale = adjustment.sizeAdjust;
  return {
    unitsPerEm: candidate.fit.unitsPerEm,
    codePoints: candidate.fit.codePoints,
    advances: candidate.fit.advances,
    scale,
    ascent: adjustment.ascentOverride * scale,
    descent: adjustment.descentOverride * scale,
    lineGap: adjustment.lineGapOverride * scale,
    letterEm: spacing.letter,
    wordEm: spacing.word,
  };
}
