# AGENTS.md

Static Astro site that generates metric-adjusted fallback font stacks. Full scope and roadmap: [`docs/plan.md`](docs/plan.md).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | Astro dev server, static build to `dist/`, serve the build |
| `pnpm check` | Compile messages, then typecheck (`astro check`) |
| `pnpm i18n:add <locale>` | Scaffold a new locale (settings, `messages/<locale>.json` copied from English, catalog entry) |
| `pnpm i18n:compile` | Regenerate the Paraglide runtime in `src/common/i18n/paraglide/` (gitignored) |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome lint + format |
| `pnpm lint:arch` | FEOD boundary check (`@feod/analyzer`, `.ts`/`.tsx` only; `.astro` is covered by Biome rules) |
| `pnpm test` / `pnpm test:watch` | Vitest unit and property tests (`src/**/*.test.ts`) |
| `pnpm test:e2e` | Build, then Playwright e2e + axe against `astro preview` (first run: `pnpm exec playwright install chromium`) |
| `pnpm verify` | Gate: lint, architecture, typecheck, unit tests, build. E2E is added once the Cloudflare spike (#7) settles |

Git hooks (lefthook, installed by `pnpm install`; reinstall with `pnpm exec lefthook install`): `pre-commit` runs Biome on staged files (fixes re-staged), then the FEOD check and `astro check` on the whole working tree (~6 s); `commit-msg` runs commitlint (~1 s).

## Work tracking

- All work goes through GitHub issues in `fogrew/font-fallback`. No change without an issue; reference it in the branch name and PR (`Closes #N`).
- Milestones map to plan phases. Labels: `type:*`, `area:*`, `priority:*`.
- Scope changes or new findings → new issue (or update the existing one), not silent drift.

## Review loop

Every PR goes through a loop of independent subagent reviews before merge:

1. **Code review** — correctness, readability, FEOD boundaries, tests.
2. **Security review** — untrusted input (font files, URLs, bookmarklet payloads, `postMessage`, stats JSON), XSS, CSP, dependency risks.
3. **Requirements review** — implementation vs the issue's acceptance criteria and `docs/plan.md`.

### Perimeter

Each review verifies the contract of *this* change, not the internals of third-party dependencies. Stay within the changed files and their direct integration points. Do not read library source in `node_modules` — dependency vetting and residual risks are tracked in their own issues. Do not re-run checks another review already ran unless the result is in doubt. Every review is bounded and ends with a verdict, even when some items stay unverified.

Security review scope:
- **In:** limit enforcement and how violations surface; worker/browser isolation (no network, DOM, `eval`, dynamic import); `postMessage` request matching and target/origin; transferable-buffer safety; committed fixtures and their licenses; exclusion of test-only inputs from the production build; dependency inventory (`pnpm audit`, exact pins).
- **Out:** line-by-line audit of vendored parsers, e.g. fontkitten internals (#50, #55).

Reviewers that run builds or probes use an isolated git worktree (`isolation: "worktree"`); remove it afterwards with `git worktree remove --force` (leftover worktrees under `.claude/` break Biome with nested-config errors). Fix findings, re-run the reviews, repeat until all three are clean. Unresolved or deferred findings become issues.

## Git

### Commits — [Conventional Commits](https://www.conventionalcommits.org/)

`<type>(<scope>)!: <subject>` — types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Breaking changes via `!` or a `BREAKING CHANGE:` footer. Subject in imperative mood, no trailing period. Enforced by commitlint in the `commit-msg` hook.

All commits and tags are GPG-signed. Never bypass signing.

### Branches — [Conventional Branch](https://conventional-branch.github.io/) + [git flow](https://nvie.com/posts/a-successful-git-branching-model/)

| Branch | From | Into | Purpose |
|---|---|---|---|
| `main` | — | — | Production; every commit is a tagged release. Cloudflare Workers Builds production branch. |
| `develop` | `main` | — | Integration branch; default PR target. |
| `feature/<issue>-<desc>` | `develop` | `develop` | New functionality, e.g. `feature/12-font-upload`. |
| `bugfix/<issue>-<desc>` | `develop` | `develop` | Non-urgent fixes. |
| `chore/<issue>-<desc>` | `develop` | `develop` | Tooling, deps, docs. |
| `release/v<semver>` | `develop` | `main` + `develop` | Release stabilization: version bump, changelog. |
| `hotfix/v<semver>` | `main` | `main` + `develop` | Urgent production fixes. |

Lowercase, hyphen-separated, issue number first.

### Merging

- Never merge via `gh pr merge` or the GitHub UI — it strips signatures. Merge locally and push:
  - feature/bugfix/chore → `develop`: `git rebase develop <branch>`, then `git switch develop && git merge --ff-only <branch>`.
  - release/hotfix → `main`: `git merge --no-ff`, signed tag `git tag -s v<semver>`, then merge back into `develop`.
- Delete the remote branch after merge: `git push origin --delete <branch>`.

### Versioning — [SemVer](https://semver.org/)

`MAJOR.MINOR.PATCH`; pre-1.0 breaking changes bump MINOR. Version lives in `package.json`, tags are `v<semver>`.

### Changelog — [Keep a Changelog](https://keepachangelog.com/) + conventional changelog

`CHANGELOG.md` is generated from Conventional Commits by git-cliff into Keep a Changelog sections (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`) under `Unreleased`, and stamped with the version on each `release/*` branch. Review the generated entries before release.

## Code

- FEOD architecture: levels `app`, `pages`, `modules`, `common`, `global`; imports only through an entity's root `index.ts`, direction per the [import matrix](https://fractal-oriented.tech/en/reference/import-matrix). Astro `srcDir` is `src/app`, so routes live in `src/app/pages`; `src/pages` is the FEOD pages level.
- Everything in the repo (code, comments, docs, commit messages) is in English.
- Minimal comments: only for non-obvious anti-patterns, one line.
- Every external source of data, code or inspiration is added to [`CREDITS.md`](CREDITS.md) in the same PR.
- UI strings only via i18n messages (`messages/<locale>.json`, English is the source of truth); in components use `messagesFor(locale)` from `@/common/i18n` and pass `locale` explicitly (pages are prerendered, so the global locale must not be relied on). Never hardcode user-visible text.
- Accessibility target: WCAG 2.2 AA.
