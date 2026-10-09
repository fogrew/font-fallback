import type { Font } from 'fontkitten';
import type { FontMetrics } from './model';

interface TableStream {
  pos: number;
  readInt16BE(): number;
  readUInt16BE(): number;
}

export function legacyVerticalMetrics(font: Font): Pick<FontMetrics, 'typo' | 'win'> {
  // fontkitten 1.0.3 skips the optional version-zero OS/2 tail.
  const legacyFont = font as unknown as {
    directory: { tables: Record<string, { length: number } | undefined> };
    _getTableStream(tag: string): TableStream | null;
  };
  if ((legacyFont.directory.tables['OS/2']?.length ?? 0) < 78) return { typo: null, win: null };
  const stream = legacyFont._getTableStream('OS/2');
  if (!stream) return { typo: null, win: null };
  const position = stream.pos;
  try {
    stream.pos += 68;
    return {
      typo: {
        ascent: stream.readInt16BE(),
        descent: stream.readInt16BE(),
        lineGap: stream.readInt16BE(),
        useTypoMetrics: false,
      },
      win: { ascent: stream.readUInt16BE(), descent: stream.readUInt16BE() },
    };
  } finally {
    stream.pos = position;
  }
}
