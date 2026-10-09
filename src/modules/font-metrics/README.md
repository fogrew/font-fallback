# Font metrics

`createFontParser()` exposes an asynchronous, browser-only parser. Construct it lazily in client code, call `parse(buffer)`, and call `dispose()` when the owner unmounts. Expected failures are returned as `{ ok: false, error: { code } }`; the UI must translate the code through i18n. No font bytes or metadata are sent over the network.

Accepted formats: single-face TTF, OTF, WOFF and WOFF2. Font collections are rejected. The input limit is 10 MiB, declared decoded size is capped at 64 MiB, and the main thread terminates parsing after 5 seconds. WOFF table sizes are checked as well as the container header. These checks and a dedicated worker reduce denial-of-service exposure; they are not a browser memory quota for a hostile decoder input. Decoder-level allocation hardening is tracked in [#55](https://github.com/fogrew/font-fallback/issues/55).

Each request owns a fresh worker, which is terminated on success, error, timeout or disposal. A parser accepts one request at a time; concurrent requests return `busy`. A new request after a failure starts a new worker. The input buffer is **transferred** and becomes detached once parsing starts; validation failures and `busy` preserve it. Keep a separate copy if the font must later be loaded for preview.

The result retains hhea, typo and Windows vertical metrics in font units; hhea/typo descenders retain their original signs. Absent OS/2 metrics and unspecified cap/x heights are `null`. A length-guarded adapter reads the legacy version-zero OS/2 tail omitted by fontkitten 1.0.3; shortened 68-byte tables retain null typo/Windows metrics. USE_TYPO_METRICS is recognized only from OS/2 version 4 onward. The cmap is sorted and deduplicated, with a parallel `Float64Array` of raw glyph advances. Missing glyphs are absent, not substituted with `.notdef`. The current extraction limit is 100,000 cmap entries per face.

Variable fonts use their default instance and set `isVariable`; choosing variation axes is a later extension. Glyph advances do not include shaping, kerning or language weighting. Per-language averages and browser metric selection belong to #12. This follows the font parsing findings in [PR #54](https://github.com/fogrew/font-fallback/pull/54).

Unit tests read OFL fixtures locally. `pnpm test:e2e` additionally builds a separate test-only Astro site and exercises the bundled worker in Chromium, including transferable arrays and a watchdog against an infinite loop. The test site and its fonts are excluded from the production build.
