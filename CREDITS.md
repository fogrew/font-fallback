# Credits

## Inspiration

- [Fallback Font Generator](https://screenspan.net/fallback) by Brian Louis Ramirez — live preview of adjusted fallback fonts.
- [Font Fallback Stack Generator](https://abacktools.com/tools/design/font-tools/font-fallback-stack-generator) by Aback Tools — curated stack presets.
- [CSS Font Stack](https://cssfontstack.com/) — font availability per operating system.

## Data

| Source | Used for | License |
|---|---|---|
| [@capsizecss/metrics](https://github.com/seek-oss/capsize/tree/master/packages/metrics) | System and Google Fonts metrics | MIT |
| [adrg/os-font-list](https://github.com/adrg/os-font-list) | Seed of fonts per OS version | MIT |
| [Modern Font Stacks](https://github.com/system-fonts/modern-font-stacks) | Presets, availability cross-check | CC0-1.0 |
| [Browserslist](https://github.com/browserslist/browserslist) | Audience queries | MIT |
| [caniuse-lite](https://github.com/browserslist/caniuse-lite) / [Can I use](https://caniuse.com/) | Browser usage data | CC BY 4.0 |
| [baseline-browser-mapping](https://github.com/web-platform-dx/baseline-browser-mapping) | Baseline queries | Apache-2.0 |
| [MDN browser-compat-data](https://github.com/mdn/browser-compat-data) | `@font-face` descriptor support | CC0-1.0 |
| [StatCounter Global Stats](https://gs.statcounter.com/) | Default desktop OS share | CC BY-SA 3.0 |

## Tooling

- [Paraglide JS](https://github.com/opral/paraglide-js) by inlang — message compilation and i18n routing (MIT).
- [fontkitten](https://github.com/delucis/fontkitten) — local font parsing in a Web Worker (MIT).
- [fontkitten test fonts](https://github.com/delucis/fontkitten/tree/43c1cfc596292fc59ef3670251a885239c7c625e/packages/fontkitten/test/data) — Source Sans Pro, Fira Sans and Mada fixtures (SIL OFL 1.1; licenses included in `tests/fixtures/fonts`).

## Methodology

- [FEOD — Fractal Entity Oriented Design](https://fractal-oriented.tech/) — project architecture.
- [Vite Web Workers](https://vite.dev/guide/features.html#web-workers) — bundling dedicated module workers.
- [MDN Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate) — watchdog cancellation of parsing.
- [FontTools](https://github.com/fonttools/fonttools) — independent fixture metric checks (MIT).
- [OpenType OS/2 specification](https://learn.microsoft.com/en-us/typography/opentype/spec/os2) — legacy table lengths and vertical metric fields.
