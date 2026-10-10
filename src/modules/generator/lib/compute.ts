import { FitError } from '@/modules/fallback-fit';
import type { FontMetrics } from '@/modules/font-metrics';

export function isNoCoverage(error: unknown): boolean {
  return error instanceof FitError && error.code === 'no-shared-glyphs';
}

export const LOW_COVERAGE = 0.9;

export function sampleText(web: FontMetrics, preferred: string): string {
  const covered = new Set(web.codePoints);
  const letters = [...preferred].filter((char) => char.trim() !== '');
  const present = letters.filter((char) => covered.has(char.codePointAt(0) ?? -1)).length;
  if (letters.length === 0 || present / letters.length >= 0.8) return preferred;
  const own = [...web.codePoints]
    .map((codePoint) => String.fromCodePoint(codePoint))
    .filter((char) => /\p{L}|\p{N}/u.test(char));
  const pool = own.length > 0 ? own : [...web.codePoints].map((cp) => String.fromCodePoint(cp));
  const chunks: string[] = [];
  for (let index = 0; index < Math.min(pool.length, 40); index += 8) {
    chunks.push(pool.slice(index, index + 8).join(''));
  }
  return chunks.join(' ') || preferred;
}
