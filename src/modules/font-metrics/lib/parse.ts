import { create } from 'fontkitten';
import { legacyVerticalMetrics } from './legacy-os2';
import { type FontMetrics, FontParseError, MAX_CMAP_ENTRIES } from './model';
import { validateFontBuffer } from './validate';

const LIMIT_MESSAGE = 'fontkitten-limit:';

function metric(value: number): number {
  if (!Number.isFinite(value)) throw new FontParseError('invalid-font');
  return value;
}

function height(value: number | undefined): number | null {
  return value === undefined || value === 0 ? null : metric(value);
}

function name(value: string | null): string | null {
  if (value !== null && (typeof value !== 'string' || value.length > 1024)) {
    throw new FontParseError('invalid-font');
  }
  return value;
}

export function parseFontBuffer(buffer: ArrayBuffer): FontMetrics {
  validateFontBuffer(buffer);
  try {
    // fontkitten accepts Uint8Array at runtime but declares the Node Buffer type.
    const font = create(new Uint8Array(buffer) as Parameters<typeof create>[0]);
    if (font.isCollection) throw new FontParseError('unsupported-format');
    const unitsPerEm = font.unitsPerEm;
    if (!Number.isInteger(unitsPerEm) || unitsPerEm < 16 || unitsPerEm > 16384) {
      throw new FontParseError('invalid-font');
    }
    const points = font.characterSet;
    if (points.length === 0) throw new FontParseError('invalid-font');
    if (points.length > MAX_CMAP_ENTRIES) throw new FontParseError('too-large');
    for (const point of points) {
      if (
        !Number.isInteger(point) ||
        point < 0 ||
        point > 0x10ffff ||
        (point >= 0xd800 && point <= 0xdfff)
      ) {
        throw new FontParseError('invalid-font');
      }
    }
    const coveredPoints = points.filter((point) => font.hasGlyphForCodePoint(point));
    if (coveredPoints.length === 0) throw new FontParseError('invalid-font');
    const codePoints = Uint32Array.from([...new Set(coveredPoints)].sort((a, b) => a - b));
    const advances = Float64Array.from(codePoints, (point) => {
      const width = metric(font.glyphForCodePoint(point).advanceWidth);
      if (width < 0 || width > 65535) throw new FontParseError('invalid-font');
      return width;
    });
    const os2 = font['OS/2'];
    const vertical =
      os2?.version === 0
        ? legacyVerticalMetrics(font)
        : {
            typo: os2
              ? {
                  ascent: metric(os2.typoAscender),
                  descent: metric(os2.typoDescender),
                  lineGap: metric(os2.typoLineGap),
                  useTypoMetrics: os2.version >= 4 && os2.fsSelection.useTypoMetrics,
                }
              : null,
            win: os2 ? { ascent: metric(os2.winAscent), descent: metric(os2.winDescent) } : null,
          };
    return {
      names: {
        family: name(font.familyName),
        fullName: name(font.fullName),
        postscript: name(font.postscriptName),
      },
      unitsPerEm,
      hhea: {
        ascent: metric(font.hhea.ascent),
        descent: metric(font.hhea.descent),
        lineGap: metric(font.hhea.lineGap),
      },
      ...vertical,
      capHeight: height(os2?.capHeight),
      xHeight: height(os2?.xHeight),
      codePoints,
      advances,
      isVariable: Object.keys(font.variationAxes).length > 0,
    };
  } catch (error) {
    if (error instanceof FontParseError) throw error;
    if (error instanceof Error && error.message.startsWith(LIMIT_MESSAGE)) {
      throw new FontParseError('too-large');
    }
    throw new FontParseError('invalid-font');
  }
}
