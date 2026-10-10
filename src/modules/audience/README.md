# audience

Resolves a browserslist query (including the Baseline queries) to browser versions in the browser, lazily loaded on first use. `resolveQuery` never reads files (`path: false`) and rejects empty, oversized and invalid queries. `AudienceEditor` offers presets plus a free-form query and shows the resolved list and the date of the bundled browser data (the newest release date in it).

`lib/os.ts` maps resolved browser versions to operating systems (`computeOsShares`): mobile browsers map to Android or iOS, Safari to macOS, and other desktop browsers are spread across the systems they run on using an editable desktop split (default: StatCounter, June 2026). `OsPanel` also offers a manual mode with relative weights per system. Per-version OS availability belongs to the OS availability dataset (#30).

`lib/support.ts` reports, for the resolved browser versions, the share of the audience supporting `size-adjust`, the three vertical overrides, `font-size-adjust` and `unicode-range`, plus the browsers that lack each one. `data/descriptor-support.json` is compiled from `@mdn/browser-compat-data` by `pnpm compat:build` (first release with the feature enabled by default; flags, prefixes and removed support are ignored; browsers without BCD data, such as Opera Mini, count as unknown). The generator uses it to offer the Safari strategy.
