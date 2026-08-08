# Changelog - RuleOfCode

All notable changes to RuleOfCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.17.5] - 2026-08-08

### 🐛 Fixed — three git laws were blind to linked worktrees

In a linked worktree (`git worktree add`) `<root>/.git` is a **file** holding `gitdir: …`,
and the shared config and hooks live in the main repository's git directory. Three laws
joined `.git/hooks` and `.git/config` onto the project root, found nothing, and reported
it as a violation:

- **Git Hooks Standards** — "Git hooks directory missing"
- **Branch Protection Standards** — "Unable to read Git configuration"
- **Git Hook Compliance** — "Git hooks directory not found"

A consumer hit this in a worktree whose husky hooks had **just blocked a push**: the
concern was met and the law said otherwise. The same commit scored 100/100 in the primary
checkout and 90/100 in the worktree.

A new shared resolver asks git (`rev-parse --git-common-dir`) instead of guessing the
layout, and honours **`core.hooksPath`** — a second trap, since husky moves hooks to
`.husky`, which makes `<gitdir>/hooks` the default rather than the answer. A relative
`core.hooksPath` resolves against the working-tree top level, which is what git itself
does. Verified with real `git worktree add` fixtures.

Worktrees are a standard git workflow; if you audit from one, this is the fix. No config
change needed.

## [7.17.4] - 2026-08-07

### 🐛 Fixed — `init` crashed instead of setting up when there is no terminal

`ruleofcode init` asks its questions through inquirer, which needs a real terminal to
answer them. In CI, in a container, or behind a pipe there is none: readline
force-closes and the process dies with an `ERR_USE_AFTER_CLOSE` stack trace and exit 7 —
a setup tool crashing rather than setting anything up.

Three behaviours now, each stated out loud:

- **no terminal, no config yet** — runs the same defaults `--quick` documents, and says
  that is what happened instead of pretending you chose them;
- **no terminal, config already there** — refuses and points at `--force`. Overwriting a
  tuned config because nobody was present to object is the destructive answer to the
  question;
- **`--force`** still overwrites, terminal or not.

The terminal requirement belongs to inquirer specifically, so an embedder that injects
its own prompt function is unaffected. No verdict change: `init` writes configuration,
it does not judge code.

## [7.17.3] - 2026-08-07

First release published to npm as **`ruleofcode`**.

### 🐛 Fixed — Branch Governance failed on every detached-HEAD checkout

`git branch --show-current` prints an EMPTY string when HEAD is detached, and the law
read that as "unable to determine current branch" — an error-severity violation. A
detached HEAD is the normal state in CI: GitHub Actions, GitLab, Jenkins, CircleCI and
Bitbucket Pipelines all check out a commit, not a branch; `git bisect` and tag checkouts
produce one too. So **every CI run of every consumer failed a law about branch naming**,
on repositories whose branches were fine.

The branch is now read from the CI environment when git has none to give (pull-request
source branch first; GitHub's synthetic `7/merge` ref names no branch and is skipped).
When nothing names a branch there is nothing to govern: the law reports no violation
instead of inventing one, and says so in its `detectionLimits`.

If you pinned an earlier version because your CI went red on Branch Governance, this is
the fix — no config change needed.

### 🔧 Changed — the project's own CI gate

Our workflow triggered on a branch that no longer existed, so it had never run; and it
checked out a single commit, which would have let the git laws pass vacuously. Both
corrected. This is what surfaced the bug above.

### 📄 Added — pull request template

Encodes the evidence the gate already demands: proven red AND green, a regression test,
updated `detectionLimits`, and the verdict impact of a change.

## [7.17.2] - 2026-08-07

Branch Governance no longer counts the whole history as branch size.

### 🐛 Fixed — Branch Governance measured history depth, not branch size

`git rev-list --count <branch>` counts every ancestor, so in a repo with more than
maxCommitsPerBranch commits total, every branch tripped "N commits (max 1000)" — even a
one-commit feature branch (a consumer saw 1004 for a 7-commit branch). The check now
counts commits UNIQUE to the branch versus its closest integration base
(develop/main/master), skips the integration branches themselves, and skips any repo
without a base (a single-branch CI checkout) rather than falling back to history depth.
Verified with a real-git regression: a small branch in a deep history is not flagged; a
branch with too many of its own commits still is.

## [7.17.1] - 2026-08-06

Name-agnostic package recognition — RoC now recognises itself under any of its
published npm names.

### 🔧 Changed — recognise RuleOfCode under any published package name

RoC is distributed under both the unscoped `ruleofcode` and the scoped
`@ruleofcode/core`. A dependency/self check hard-coded to a single name silently
misfired on a project that installed the tool under the other. A shared helper now
accepts the whole set (plus any `*ruleofcode*` variant):

- The Constitutional Supremacy "install RoC" suggestion recognises either name across
  both dependency maps, with brand-neutral text.
- Continuous Compliance delegates its enforcement-tool check to the same helper.
- `laws --json` now reports `tool` dynamically from the package.json name, so each
  build names the package the consumer actually installed.

No verdict change for existing consumers — the supremacy suggestion is non-blocking
and cleared when there are no violations, and continuous-compliance already recognised
`ruleofcode`. New unit + regression coverage for the recognition helper.

## [7.17.0] - 2026-08-06

Raw-text-blindness release, and the first build prepared for public distribution.

### 🐛 Fixed — the raw-text-blind NgRx / template class of false positives

Three frontend detectors were matching their trigger tokens inside comments, string
literals, CSS blocks and file names — places where the token is not code. A consumer
saw correct code flagged. All three now strip comments and string content before
scanning (new shared `CodeText.stripCommentsAndStrings`) and are gated/scoped so the
match only fires on real code:

- **Root Service No Timer**: a `setInterval`/`setTimeout` written in a comment or a
  string no longer counts; dotted method calls (`this.foo.setTimeout(...)`) are excluded.
- **Stores In Data Access**: NgRx store detection is content-based, not filename-based.
- **Alias Repeated Template Expressions**: Angular-gated, binding-scoped, and no longer
  trips over CSS functions such as `calc()` / `translate()`.

Each verified against the code, proven red AND green, with regression tests. These
change verdicts on frontend projects; no config default changes.

### 📦 Packaging — prepared for public distribution

- `dist` now ships with comments stripped and without source maps — a smaller, cleaner
  package with no build-time noise. No runtime behaviour change.
- Package metadata (description, keywords, author, repository, homepage,
  `publishConfig`) cleaned up for a public registry.
- `laws --json` rationale strings no longer carry internal attribution suffixes; the law
  text is otherwise unchanged.

### 🔧 Changed — husky hooks refreshed to v9-native output

The tracked `.husky/` hooks were migrated off the deprecated husky-v8 boilerplate to the
v9-native form the installer now generates, clearing the "outdated git hooks" notice. The
commit-msg hook grandfathers merge/squash/revert subjects to match the Commit Message
Standards history-scan.

## [7.16.0] - 2026-08-05

Consumer-findings release. A downstream consumer (which runs RoC as its own
gate) reported that after burning its real debt down honestly, the remainder were
detector false-positives on a modern stack (esbuild / Angular 20 / e2e-first / captured
transcripts) — not real debt. Four classes, all fixed: each verified against the code,
proven red AND green, with regression tests. These change verdicts on modern projects;
no config default changes; schemaVersion stays 2.

### 🔴 Fixed — testing laws punished writing more tests (the worst class)

A law that fails harder the more genuine tests you add teaches people not to test — the
exact perverse incentive this tool exists to kill.
- **unit-test-quality-standards** read edge-case testing from it()/describe() TITLE
  strings only (via a regex that missed the canonical multiline `it('…', () => {`), so
  every added spec whose title lacked a keyword raised "No edge case testing". It now
  reads the BODY (toThrow / rejects / toBeNull / null / undefined / NaN). Its
  mock-cleanup check also now accepts clearAllMocks / resetAllMocks / restoreAllMocks.
- **test-data-management** computed factory coverage as files-using-factories / ALL
  test files, so a correct simple spec DILUTED the ratio into a violation — demoted to
  a suggestion. Mock recognition gained jest.fn / Object.defineProperty; cleanup gained
  the jest global resets.
- **test-coverage-constitutional-standard** read jest config root-only (Nx-blind, missing
  apps/<name>/jest.config.ts coverageThreshold) and demanded `.test.` names (blind to
  Angular `.spec.`). Both fixed.

### 🔴 Fixed — parsing false positives

- **magic-number-prevention** flagged "25" in `SEAL_THRESHOLD = 0.25` (split the decimal,
  broke the named-constant exemption) — now matches a full decimal literal.
- **no-risk-literals** flagged `floor = 3` inside a captured-terminal display STRING —
  now blanks string/comment contents before scanning.
- **todo-management-constitutional** counted a `// TODO` inside a display STRING as a
  real TODO — now blanks string contents (comments, where real markers live, are kept).

### 🔴 Fixed — modern Angular / esbuild blindness

- **disclosure-control-aria-state** flagged aria-pressed TOGGLE buttons (theme switch,
  filter chips) for lacking aria-expanded — aria-pressed is the correct ARIA for a
  toggle; those buttons are now exempt.
- **Four bundle laws** (performance-budget-compliance, bundle-size-optimization,
  bundle-optimization-strategy + advanced) demanded webpack / vendorChunk / lighthouse
  from an esbuild `application`-builder project that controls size with `budgets`. New
  shared `AngularBundleConfig` recognises the esbuild builder and budgets across the Nx
  workspace; the webpack-era requirements no longer false-fail a modern project. (CI
  perf gates / production monitoring / bundle-analyzer tooling remain — separate
  concerns.)

## [7.15.0] - 2026-08-05

Angular-20 blindness release. A downstream consumer reported that laws
false-warned on a correct Angular 20 app whose components have no `.component.ts`
suffix (a component is now `home.ts`). Fixing it also surfaced a fix that had shipped
to dead code, and the dead code itself. Each verified against the code, proven red AND
green, with regression tests. These change verdicts on modern Angular projects; no
config default changes; schemaVersion stays 2.

### 🔴 Fixed — "No Angular components found" on a correct Angular 20 app

Angular 20 dropped the mandatory `*.component.ts` suffix. NINE detectors discovered
components with `file.includes('.component.')`, so a modern app read as having no
components and its laws false-warned. New shared `AngularComponentFiles` identifies a
component by its `@Component` decorator (with a `.component.ts` fast path). Rewired:
change-detection-optimization, onpush-change-detection, standalone-components,
image-optimization, generic-angular, observable-cleanup and input-validation. The same
suffix-blindness in the service/module gates now keys on `@Injectable` / `@NgModule`,
so a suffix-less `user.ts` service is no longer silently skipped.

### 🔴 Fixed — a lazy-loading fix that shipped to dead code, and the dead code

Two classes named `LazyLoadingImplementationLaw` existed: the one wired in the registry
(`angular-laws/…`) and a duplicate (`performance-laws/…`) that was only barrel-exported,
never dispatched. The v7.13.0 loadComponent fix landed on the duplicate, so the audit
never ran it. The wired law delegates to a subsystem that knew only `loadChildren`, so
a standalone `loadComponent` route read as "not lazy loaded". Fixed at the source
(`loadComponent` is lazy on its own; preloading recognises the standalone
`withPreloading` / `PreloadAllModules` forms). The dead duplicate, its barrel export and
its (dead) test are removed.

### 🪦 Removed — dead code, not "fixed"

`CodeQualityLawBase.findAngularFiles` filtered artifacts by suffix (Angular-20-blind)
but no subclass ever called it — its only exerciser was a test of itself. Deleted
rather than taught a trick it would never perform in production.

## [7.14.0] - 2026-08-04

Consumer-findings release. A downstream consumer adopted RoC as its own gate and
reported four detector false-positives from real, correct code; all four are fixed here,
each verified against the code, proven red AND green, with regression tests. These change
verdicts (laws that false-warned now pass on correct setups) but do NOT change any
config default. `schemaVersion` stays 2 — the one new `laws --json` field is additive.

### ✨ Added

- `laws --json` now publishes `satisfiedByStacks` `{ keys, stackToKey }` — the
  authoritative mapping from a law's `stack` to its `satisfiedBy` key (e.g.
  `frontend → angular`). `satisfiedBy` is keyed by the language/framework the guidance
  targets, a finer axis than `stack`, so `satisfiedBy[law.stack]` misses on frontend
  laws. Consumers read the mapping from the schema instead of maintaining their own.
  Additive; the `angular` key is kept (the guidance is genuinely Angular-specific).

### 🔴 Fixed — false positives on correct, modern code

- **angular-testing-excellence** matched `it`/`test` inside other words: `(?:it|test)\(`
  hit the `it(` in `split(`, `emit(`, `commit(`, so `text.split('\n')` read as a test
  named `\n` and raised a phantom "should start with" violation. This broke the site's
  live dogfood build. The matcher is now word-bounded (`\b(?:fit|xit|it|test)\s*\(`),
  keeping the legitimate focused/skipped `fit`/`xit`.
- **Four laws blind to the standard Nx `apps/<name>/` layout.** A monorepo app at
  `apps/web/` (arbitrary name, flat ESLint, per-app jest, Angular-20 short filenames)
  met every concern but was false-warned. New shared `NxWorkspace.resolveSourceFiles`
  resolves a path across the workspace by LAYOUT, never by hardcoded name:
  - *error-handling-completeness* hardcoded `apps/client-app|master-app|admin-web/...`;
  - *jest-100-coverage* read `coverageThreshold` (and jest config) only at the root;
  - *onpush-change-detection* filtered components by the `*.component.ts` filename, so
    an Angular-20 short-named component (`law-card.ts`) read as "No Angular components
    found" — now identified by its `@Component` decorator;
  - *professional-excellence* demanded legacy `.eslintrc.js` by exact name and missed
    flat config (`eslint.config.mjs`), and `.prettierrc.json`.
- **XSS detectors flagged `[innerHTML]` mentioned in a comment.** After a consumer
  removed a real binding and left a note, the word in a `// comment` still raised two
  XSS violations. New shared `CodeText.stripComments` blanks comments (not strings — an
  inline `template: '<div [innerHTML]="x">'` is a real sink), and the `[innerHTML]`
  pattern now requires the binding `=`, so a mention no longer fires while every real
  binding still does.

## [7.13.0] - 2026-08-04

Detector-correctness release. Authoring the Law-Card model in v7.12.0 surfaced a batch
of laws that were quietly lying — some always green, some impossible to pass without a
lie, some false-failing modern code. Each was fixed grounded in the real detector,
proven red AND green, with `detectionLimits` updated in lockstep. **These change
verdicts**: a project that "passed" a broken law may now see it fire (or stop firing).
No config-default or schema change (`schemaVersion` stays 2).

### 🔴 Fixed — laws whose verdict contradicted their own findings

- **Git History Integrity** returned `passed: true` for ANY git repository — all three
  of its analyzers pushed only to `suggestions` and never appended a violation. It now
  requires force-push protection shown one of two ways (a pre-push guard OR a declared
  policy), because a server-side ruleset is invisible from a clone.
- **Strategic Document Updates** and **MD Footer Template** were score-threshold laws
  that could print a green ✅ message over a failing verdict. Now violations-driven.
- Phantom score deductions removed from **MD Footer Consistency**, **TODO Management
  Standards**, **Incident Response Protocol** and **i18n** — advisory checks that
  lowered the score without a violation, so the number argued with the green verdict.

### 🔴 Fixed — three laws no Python project could pass without a lie

- **Semantic Versioning** and **Project Structure Standards** pushed "package.json not
  found" as a violation, failing every Python repo unconditionally. They now read
  `pyproject.toml` (PEP 621 `[project]` / Poetry).
- **Git Ignore Standards** demanded `node_modules`/`dist` from every project; required
  entries now follow the stack (`__pycache__`/`.venv` for Python, Node artifacts only
  for a repo carrying a package.json).

### 🔴 Fixed — VERSION_CONTROL correctness

- **Git Hooks Standards** and **Git Hook Compliance** gave OPPOSITE verdicts on the
  same repo; they now share one hook-status resolver and agree.
- **Commit Size Control**'s size threshold was mathematically unreachable (dead by
  arithmetic) — it only ever checked for a doc. Now a real per-commit check with config
  keys `thresholds.git.maxFilesPerCommit` (default 10) and `maxLinesPerCommit` (500).
- **Branch Governance** / **Feature Branch Protection** stopped folding source-identifier
  naming (CodeNamingAnalyzer) into a branch verdict — that belongs to Naming Convention
  Enforcement, which already runs it.

### 🔴 Fixed — modern Angular was failing laws it had already satisfied

- **Standalone Components Architecture** false-failed every v19 component (v19 makes
  standalone the default and omits the flag). Now version-aware.
- **Lazy Loading Implementation** was permanently red in EVERY project — `getBasename()`
  stripped the extension, so every `endsWith('.ts')` predicate was false and no file was
  ever inspected. Fixed, plus it now recognises `loadComponent`, `*.routes.ts` and
  standalone preloading (`provideRouter(routes, withPreloading(...))`).
- Three exact-substring import checks (**Signal Adoption**, DestroyRef, **Service Layer**
  Observable) false-failed grouped imports like `import { signal, computed }`. They now
  parse named specifiers.

### 🐕 Dogfood

RoC declared MIT in three places but shipped no `LICENSE` — its own newly-authored
Documentation Standards law caught it. Added `LICENSE` and `CONTRIBUTING.md`; fixed the
`constitutional-check` script (it ran `node dist/cli.js` with no `audit` subcommand, so
it printed help and exited 1, and `security-check` chained it); graduated Documentation
Standards from warning to error, proven red/green.

## [7.12.0] - 2026-07-15

Law-model **COMPLETE** — the Law-Card fields are now authored across **all 173 laws**,
so `roc laws --json` describes every law honestly: why it exists, how to pass it per
stack, and what it does NOT catch. Ships with a batch of detector-correctness fixes
found while authoring.

### ⚠️ Changed — `schemaVersion` 1 → 2 (the one potentially-breaking item)

The three Law-Card fields (`rationale`, `satisfiedBy`, `detectionLimits`) landed in
7.11.0 but the schema signal stayed at `1`. It is now **`2`**, marking the model
complete. A consumer whose generator pins `schemaVersion === 1` **must update it to
accept `2`**. Requested by downstream consumers so their generator-guard can
tell the complete model apart from the partial one.

### ✨ Added — the Law-Card model, now 173/173

- `rationale` (why the law exists): **173 / 173**
- `detectionLimits` (what the law does NOT claim to catch): **173 / 173**
- `satisfiedBy` (how to pass, per stack): **172 / 173** — Branch Protection Standards
  omits it on purpose (the fix is a host-side branch-protection setting, identical
  across languages, noted inline in its rationale).
- Every field is grounded in a read of the actual detector, never invented. A ratchet
  test (`detection-limits-ratchet`) fails the build if a count regresses or a field is
  a placeholder; floors are 173/173/172 with exact-match assertions.

### 🔴 Fixed — detector bugs that change verdicts (found while authoring)

These correct real false-passes and false-fails, so a consumer may see verdicts move:

- **SACRED / TypeScript Strict** silently PASSED a JSONC `tsconfig` (comments, trailing
  commas) — a disarmed gate. Now parsed JSONC-tolerant and fail-closed.
- **TESTING** killed a green-✅-message-on-a-failing-verdict and a "100%" coverage
  threshold check that never actually verified 100%.
- **PYTHON** — seven detectors that false-failed (or false-passed) legitimate code:
  pre-commit ruff/mypy/bandit discovery, async module/class markers, global
  `xfail_strict`, `requests` timeout, and pyproject cross-table lookups.
- **SECURITY** — five detectors: line splitting, custom-crypto primitives, per-header
  security-header checks, XSS sink scoping, and rate-limiting surface detection.

### 📝 Documented — honest limits now visible on every law

Authoring surfaced these and recorded them in `detectionLimits` rather than normalising
them away:

- **Git History Integrity** never appends a violation → it passes for ANY git repo.
- **Git Hooks Standards** and **Git Hook Compliance** reach OPPOSITE verdicts on the
  same stock repo (`.sample` hooks: one passes, one fails).
- **Commit Size Control**'s size threshold is mathematically unreachable → it really
  only checks for an atomic-commit doc.
- **MD Footer Template** and **Strategic Document Updates** are score-threshold laws
  with a green-message-on-a-failing-verdict path.
- Node-blindness on Python: **Semantic Versioning** and **Project Structure** hard-fail
  on a missing `package.json`; **Git Ignore** demands `node_modules`/`dist`.

## [7.11.0] - 2026-07-15

Law-model v1 for a downstream consumer — new fields on `roc laws --json`, all additive
(nothing breaks). Verified against a downstream consumer's contract at v7.10.0.

### 🔴 Fixed — a law was unreachable at `/laws/:slug` by construction

`slug` only replaced whitespace, so 17 of 173 slugs carried a `/` or `()`:
`no-explicit-any-/-non-null-assertion` has a **slash**, which a router reads as a
nested path — so that law had no reachable URL at all, and 16 `(SACRED LAW)` names
carried parentheses.

New field **`urlSlug`**: URL-safe (`^[a-z0-9-]+$`) and **unique across the
registry** — 173/173, zero collisions. Route `/laws/:slug` by this.

- It is deliberately **separate from `configKeys`**: the URL drops the parentheses,
  but the config key keeps every spelling the engine accepts. Merging them would
  hand out config keys the gate rejects.
- A regression test **fails the build** if a future law name breaks URL-safety or
  uniqueness. A URL that silently collides or 404s is worse than a build that stops;
  URLs are eternal, and the test makes them so.

### ✨ Added — `detectionLimits`: what a law does NOT claim

The "Detection Limits" section of the Law Card, authored **next to the detector**
in `src/data/*.ts` and reviewed as code — never as prose on a site that drifts from
the detector (that drift is the `unauthorized_401` metric that fed nothing).

**8 of 173 laws** now declare their limits — the ones whose boundaries are known
precisely (Database Query Optimization is JS/TS-only; Dependency Security Scanning
checks the scanner is *in the gate*, it does not run it; Branch Protection is
server-side with no repo file; Memory Leak Prevention is pattern, not proof; …).

- `null` means **not declared yet** — honest debt, rendered as such, never as "no
  limits". An empty array `[]` is refused.
- A **ratchet test** pins the count: it may never regress, and it is meant to grow
  in public. The declared/total number is published on `/dogfood`.

### 🧹 Fixed — stale comments describing behaviour that no longer exists

Both law-model types documented `legacyId` as *"usable as a notApplicable key"*. It
is not — 25 legacyIds are shared by 51 laws, and v7.10.0 refuses ambiguous keys.
The comment now says so. (Documentation that describes a detector which no longer
does what it claims is the exact failure this tool exists to catch.)


---

_Changelog entries prior to v7.11.0 predate the public release and are not included here._
