# Spike: font parsing in a Web Worker (#8)

Goal: pick a parser for woff2/woff/ttf/otf that runs in a worker and exposes `OS/2`, `hhea`, `cmap` and glyph advances.

## Candidates

| | fontkit 2.0.4 | `@capsizecss/unpack` 4.0.1 | fontkitten 1.0.3 | opentype.js 2.0.0 |
|---|---|---|---|---|
| License | MIT | MIT | MIT | MIT |
| Browser bundle (min / gzip) | 357 / 145 KB | 244 / 95 KB | 241 / 93 KB | 240 / 66 KB |
| woff2 | yes | yes | yes | no, needs an external decompressor (wawoff2 is ~1.2 MB of WASM glue) |
| woff / ttf / otf | yes | yes | yes | yes |
| cmap + per-glyph advances | yes | no (aggregated metrics only) | yes (fontkit-compatible API) | yes |
| `OS/2`, `hhea`, names | yes | yes | yes | yes |

Measured on Inter (latin 23 KB, cyrillic 7.5 KB) and Noto Sans JP variable (CJK subset, 81 KB), Node 26: parse + average advance over the whole cmap takes 4–20 ms (first call includes woff2 decompression).

## Findings

- `@capsizecss/unpack` is a thin layer over fontkitten and returns a single Latin-weighted `xWidthAvg`. On a Cyrillic-only file it reports 1226 for "latin" (the font has no Latin glyphs), which is meaningless. We need per-script, per-language weighted averages, so we need raw cmap + advances.
- opentype.js 2 cannot read woff2 without extra WASM; rejected.
- fontkit and fontkitten expose the same API (`create(buffer)`, `characterSet`, `glyphForCodePoint(cp).advanceWidth`, `ascent`/`descent`/`lineGap` from hhea, `['OS/2']` with `fsSelection.useTypoMetrics`, `capHeight`, `xHeight`). fontkitten is 1.5x smaller in gzip.
- Variable fonts: the default instance is parsed (Noto Sans JP reports "Thin"). Weight-specific metrics need explicit variation handling; out of scope for the first version (use the default instance, document it).

## Decision

Use **fontkitten** directly (not `@capsizecss/unpack`), inside a dedicated Web Worker, and compute our own metrics from cmap + advances.

## Worker RPC sketch

```ts
// requests (transferable ArrayBuffer in, structured-clone result out)
type ParseRequest = { id: number; buffer: ArrayBuffer; limits?: { maxBytes: number } };
type ParseResponse =
  | { id: number; ok: true; font: FontMetrics }
  | { id: number; ok: false; error: { code: 'too-large' | 'invalid-font' | 'timeout'; message: string } };

interface FontMetrics {
  names: { family: string; fullName: string; postscript: string };
  unitsPerEm: number;
  hhea: { ascent: number; descent: number; lineGap: number };
  typo: { ascent: number; descent: number; lineGap: number; useTypoMetrics: boolean };
  win: { ascent: number; descent: number };
  capHeight: number;
  xHeight: number;
  codePoints: Uint32Array;      // sorted cmap, for unicode-range
  advances: Uint16Array;        // advance per code point, same order
  isVariable: boolean;
}
```

The main thread wraps this in a typed promise-based client (`common/lib`, #11). Size limit and a watchdog timeout (terminate and respawn the worker) cover hostile input; font strings are treated as plain text everywhere.
