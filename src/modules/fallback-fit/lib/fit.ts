import {
  type FitAdjustment,
  FitError,
  type FitFont,
  type FitMetrics,
  type FontFit,
  type GlyphWeight,
  type LineMetrics,
  type MetricsPolicy,
  type MetricsSource,
} from './model';

const MAX_GLYPHS = 100_000;
const isScalar = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0x10ffff && (value < 0xd800 || value > 0xdfff);
const isPositive = (value: number) => Number.isFinite(value) && value > 0;

function validateEm(unitsPerEm: number) {
  if (!Number.isInteger(unitsPerEm) || unitsPerEm < 16 || unitsPerEm > 16384)
    throw new FitError('invalid-font');
}

function glyphWidths(font: FitFont): Map<number, number> {
  validateEm(font.unitsPerEm);
  if (font.codePoints.length !== font.advances.length || font.codePoints.length > MAX_GLYPHS)
    throw new FitError('invalid-font');
  const widths = new Map<number, number>();
  let previous = -1;
  for (let index = 0; index < font.codePoints.length; index++) {
    const codePoint = font.codePoints[index];
    const advance = font.advances[index];
    if (
      codePoint === undefined ||
      advance === undefined ||
      !isScalar(codePoint) ||
      codePoint <= previous ||
      !Number.isFinite(advance) ||
      advance < 0 ||
      advance > 65535
    )
      throw new FitError('invalid-font');
    widths.set(codePoint, advance / font.unitsPerEm);
    previous = codePoint;
  }
  return widths;
}

function verticalMetrics(
  font: FitMetrics,
  policy: MetricsPolicy,
): { source: MetricsSource; metrics: LineMetrics } {
  let source: MetricsSource;
  if (policy === 'freetype') {
    if (font.typo?.useTypoMetrics) source = 'typo';
    else if (font.hhea.ascent !== 0 || font.hhea.descent !== 0) source = 'hhea';
    else if (font.typo && (font.typo.ascent !== 0 || font.typo.descent !== 0)) source = 'typo';
    else source = font.win ? 'win' : 'hhea';
  } else if (policy === 'hhea' || policy === 'typo' || policy === 'win') source = policy;
  else throw new FitError('missing-metrics');
  const metrics = source === 'win' ? font.win && { ...font.win, lineGap: 0 } : font[source];
  if (!metrics) throw new FitError('missing-metrics');
  if (
    ![metrics.ascent, metrics.descent, metrics.lineGap].every(
      (value) => Number.isFinite(value) && Math.abs(value) <= 65535,
    ) ||
    metrics.ascent < 0
  )
    throw new FitError('invalid-font');
  return { source, metrics };
}

export function fitFromAverages(
  target: FitMetrics,
  targetWidthEm: number,
  fallbackWidthEm: number,
  policy: MetricsPolicy = 'freetype',
): FitAdjustment {
  validateEm(target.unitsPerEm);
  if (!isPositive(targetWidthEm) || !isPositive(fallbackWidthEm)) throw new FitError('zero-width');
  const sizeAdjust = targetWidthEm / fallbackWidthEm;
  const { source, metrics } = verticalMetrics(target, policy);
  const ascentOverride = metrics.ascent / target.unitsPerEm / sizeAdjust;
  const descentOverride = Math.abs(metrics.descent) / target.unitsPerEm / sizeAdjust;
  const lineGapOverride = Math.max(0, metrics.lineGap) / target.unitsPerEm / sizeAdjust;
  if (
    !isPositive(sizeAdjust) ||
    ![ascentOverride, descentOverride, lineGapOverride].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  )
    throw new FitError('invalid-adjustment');
  return {
    sizeAdjust,
    ascentOverride,
    descentOverride,
    lineGapOverride,
    metricsSource: source,
    lineGapClamped: metrics.lineGap < 0,
  };
}

export function fitFont(
  target: FitFont,
  fallback: FitFont,
  weights: readonly GlyphWeight[],
  policy: MetricsPolicy = 'freetype',
): FontFit {
  if (weights.length === 0 || weights.length > MAX_GLYPHS) throw new FitError('invalid-weights');
  const seen = new Set<number>();
  let maxWeight = 0;
  for (const { codePoint, weight } of weights) {
    if (!isScalar(codePoint) || seen.has(codePoint) || !Number.isFinite(weight) || weight < 0)
      throw new FitError('invalid-weights');
    seen.add(codePoint);
    maxWeight = Math.max(maxWeight, weight);
  }
  if (maxWeight === 0) throw new FitError('invalid-weights');
  const targetWidths = glyphWidths(target);
  const fallbackWidths = glyphWidths(fallback);
  let maxSharedWeight = 0;
  for (const { codePoint, weight } of weights) {
    if (targetWidths.has(codePoint) && fallbackWidths.has(codePoint))
      maxSharedWeight = Math.max(maxSharedWeight, weight);
  }
  if (maxSharedWeight === 0) throw new FitError('no-shared-glyphs');
  const missingTarget: number[] = [];
  const missingFallback: number[] = [];
  let requested = 0;
  let shared = 0;
  let coveredWeight = 0;
  let targetTotal = 0;
  let fallbackTotal = 0;
  for (const { codePoint, weight } of weights) {
    if (weight === 0) continue;
    const coverageWeight = weight / maxWeight;
    requested += coverageWeight;
    const targetWidth = targetWidths.get(codePoint);
    const fallbackWidth = fallbackWidths.get(codePoint);
    if (targetWidth === undefined) missingTarget.push(codePoint);
    if (fallbackWidth === undefined) missingFallback.push(codePoint);
    if (targetWidth === undefined || fallbackWidth === undefined) continue;
    const normalizedWeight = weight / maxSharedWeight;
    coveredWeight += coverageWeight;
    shared += normalizedWeight;
    targetTotal += targetWidth * normalizedWeight;
    fallbackTotal += fallbackWidth * normalizedWeight;
  }
  const targetWidthEm = targetTotal / shared;
  const fallbackWidthEm = fallbackTotal / shared;
  return {
    ...fitFromAverages(target, targetWidthEm, fallbackWidthEm, policy),
    targetWidthEm,
    fallbackWidthEm,
    coverage: Math.min(1, coveredWeight / requested),
    missingTarget,
    missingFallback,
  };
}
