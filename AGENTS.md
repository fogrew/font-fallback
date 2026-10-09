# AGENTS.md

Static Astro site that generates metric-adjusted fallback font stacks. Full scope and roadmap: [`docs/plan.md`](docs/plan.md).

## Work tracking

- All work goes through GitHub issues in `fogrew/font-fallback`. No change without an issue; reference it in the branch name and PR (`Closes #N`).
- Milestones map to plan phases. Labels: `type:*`, `area:*`, `priority:*`.
- Scope changes or new findings → new issue (or update the existing one), not silent drift.

## Review loop

Every PR goes through a loop of independent subagent reviews before merge:

1. **Code review** — correctness, readability, FEOD boundaries, tests.
2. **Security review** — untrusted input (font files, URLs, bookmarklet payloads, `postMessage`, stats JSON), XSS, CSP, dependency risks.
3. **Requirements review** — implementation vs the issue's acceptance criteria and `docs/plan.md`.

Fix findings, re-run the reviews, repeat until all three are clean. Unresolved or deferred findings become issues.

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

- FEOD architecture: levels `app`, `pages`, `modules`, `common`, `global`; imports only through an entity's root `index.ts`, direction per the [import matrix](https://fractal-oriented.tech/en/reference/import-matrix). Astro routes live in `src/pages`; page internals go in `_`-prefixed folders.
- Everything in the repo (code, comments, docs, commit messages) is in English.
- Minimal comments: only for non-obvious anti-patterns, one line.
- Every external source of data, code or inspiration is added to [`CREDITS.md`](CREDITS.md) in the same PR.
- UI strings only via i18n messages; `messages/en.json` is the source of truth.
- Accessibility target: WCAG 2.2 AA.
