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

Known limits of the checks:
- `@feod/analyzer` does not parse `.astro` files. Biome matches `@/` alias imports there, and `pnpm lint:arch` additionally rejects relative `.astro` imports that leave their entity (`scripts/lint-arch.ts`). Keep logic in `.ts`/`.tsx` and use `@/` imports in `.astro` files.
- The Biome rules ban alias imports of an entity's internals, including your own (`@/common/ui/x` from inside `src/common/ui`); inside an entity use relative imports.

Astro treats `src/pages` as the routes folder by default; `srcDir: ./src/app` in `astro.config.mjs` moves routes to `src/app/pages` so that FEOD `pages` can live at `src/pages`.

## Internationalization

[Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) compiles `messages/<locale>.json` into typed message functions (`src/common/i18n/paraglide/`, generated, gitignored). All locales are URL-prefixed (`/en/`, `/ru/`); `/` redirects to the browser's language, falling back to English.

- Use messages through `messagesFor(locale)` from `@/common/i18n`; a missing translation key is a TypeScript error (`catalog.ts`) and a failing unit test.
- Add a language: `pnpm i18n:add <locale>`, then translate `messages/<locale>.json` and run `pnpm lint:fix`. Language names in the switcher come from `Intl.DisplayNames`.

## Development

Requires Node 24 (`.node-version`) and pnpm (`packageManager` in `package.json`).

```sh
pnpm install   # also installs git hooks
pnpm dev
pnpm build
pnpm check     # typecheck
pnpm lint      # Biome
pnpm lint:arch # FEOD boundaries
pnpm test      # unit tests (Vitest)
pnpm test:e2e  # e2e + accessibility (Playwright, axe); first: pnpm exec playwright install chromium
pnpm verify    # lint + architecture + typecheck + unit tests + build
```
