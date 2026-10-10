# os-fonts

Which fonts ship with which operating system, as a schema-validated dataset (`data/os-fonts.json`) with a source URL on every entry. Only positive evidence is recorded: a missing entry means the version is unknown, not that the font is absent.

- `lib/model.ts`: types. `lib/validate.ts`: `validateDataset` / `assertDataset` (unit-tested, run against the bundled data).
- `lib/query.ts`: `osAvailability(font, os, dataset)` reports `preinstalled` (all known versions), `partial`, `on-demand` (Windows Feature on Demand) or `unknown`; `fontsAvailableOn` lists fonts per system.

The dataset covers a curated list of fallback-relevant families (`scripts/os-fonts/families.ts`) and is regenerated with `pnpm os-fonts:import` (network access required):

| System | Versions | Source |
|---|---|---|
| Windows | 10, 11 | Microsoft Learn font lists |
| macOS | 10.15, current | adrg/os-font-list (MIT), Apple system fonts page |
| iOS | current | Apple system fonts page |
| Android | 10 to 16 | AOSP `fonts.xml` at release tags |
| Linux | Ubuntu 20.04 to 26.04 | desktop ISO manifests, mapped from package to families |
| ChromeOS | none yet | |

Gaps to fill: macOS 11 to the current release, ChromeOS, vendor Android builds and per-font local names.
