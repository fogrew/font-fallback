# Font Fallback

Generator of metric-adjusted fallback font stacks with live preview and layout-shift (CLS) estimation. Static [Astro](https://astro.build) site. Scope and roadmap: [`docs/plan.md`](docs/plan.md). Contribution rules: [`AGENTS.md`](AGENTS.md).

## Architecture

Source is organized by [FEOD](https://fractal-oriented.tech/en/) levels under `src/`:

| Level | Path | Role |
|---|---|---|
| `app` | `src/app` | Astro `srcDir`: routes (`src/app/pages`), layouts, styles, i18n wiring. Composes everything below. |
| `pages` | `src/pages` | Page entities, each with a root `index.ts`. Routes in `src/app/pages` render them. |
| `modules` | `src/modules` | Product modules with a root `index.ts` public API. |
| `common` | `src/common` | Reusable entities not tied to a product scenario. |
| `global` | `src/global` | Environment declarations and shims. Never imported by application code. |

Rules: imports follow the [import matrix](https://fractal-oriented.tech/en/reference/import-matrix) and go through an entity's root `index.ts`. Enforced by `pnpm lint:arch` ([`@feod/analyzer`](https://fractal-oriented.tech/en/tools/feod-analyzer)) and by Biome `noRestrictedImports` overrides in `biome.json`.

Astro treats `src/pages` as the routes folder by default; `srcDir: ./src/app` in `astro.config.mjs` moves routes to `src/app/pages` so that FEOD `pages` can live at `src/pages`.

## Development

Requires Node 24 (`.node-version`) and pnpm (`packageManager` in `package.json`).

```sh
pnpm install   # also installs git hooks
pnpm dev
pnpm build
pnpm check     # typecheck
pnpm lint      # Biome
pnpm lint:arch # FEOD boundaries
```
