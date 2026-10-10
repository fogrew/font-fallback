import raw from '../data/metrics.json';

export interface MetricsSource {
  kind: 'local' | 'download';
  file: string;
  sha256: string;
  url?: string;
  license?: string;
}

export interface OsFontMetrics {
  id: string;
  family: string;
  localNames: string[];
  unitsPerEm: number;
  hhea: { ascent: number; descent: number; lineGap: number };
  typo: { ascent: number; descent: number; lineGap: number; useTypoMetrics: boolean } | null;
  win: { ascent: number; descent: number } | null;
  isVariable: boolean;
  codePoints: Uint32Array;
  advances: Float64Array;
  source: MetricsSource;
}

interface RawMetrics {
  id: string;
  family: string;
  source: MetricsSource;
  localNames: string[];
  unitsPerEm: number;
  hhea: OsFontMetrics['hhea'];
  typo: OsFontMetrics['typo'];
  win: OsFontMetrics['win'];
  isVariable: boolean;
  codePoints: number[];
  advances: number[];
}

export function decodeMetrics(entry: RawMetrics): OsFontMetrics {
  const points: number[] = [];
  for (let index = 0; index + 1 < entry.codePoints.length; index += 2) {
    const start = entry.codePoints[index] ?? 0;
    const length = entry.codePoints[index + 1] ?? 0;
    for (let offset = 0; offset < length; offset++) points.push(start + offset);
  }
  if (points.length !== entry.advances.length) {
    throw new Error(`Metrics for ${entry.id}: code points and advances differ in length`);
  }
  return {
    id: entry.id,
    family: entry.family,
    localNames: entry.localNames,
    unitsPerEm: entry.unitsPerEm,
    hhea: entry.hhea,
    typo: entry.typo,
    win: entry.win,
    isVariable: entry.isVariable,
    codePoints: Uint32Array.from(points),
    advances: Float64Array.from(entry.advances),
    source: entry.source,
  };
}

let decoded: OsFontMetrics[] | undefined;

export function osFontMetrics(): readonly OsFontMetrics[] {
  decoded ??= (raw as { fonts: RawMetrics[] }).fonts.map(decodeMetrics);
  return decoded;
}
