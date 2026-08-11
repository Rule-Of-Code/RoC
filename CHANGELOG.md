# Changelog - RuleOfCode

All notable changes to RuleOfCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.18.2] - 2026-08-11

Four consumer reports, every one of them a follow-up to a fix we closed while
it was still incomplete. A PATCH: nothing changes for a project that was
passing.

The pattern is worth stating plainly, because it is the reason this release
exists. An issue that lists four fixes was closed on the first one. Another was
closed after routing one of four detectors. Both looked done and were not. The
sweep below is the answer to that, not an extra.

### 🐛 Fixed — one CI discovery for the whole tool, not twelve

A report named **three** laws still detecting CI/CD through their own hardcoded
provider lists after the shared module landed. Searching for the shape found
**twelve** places in total, each with a different subset of providers and none
of them honouring a declared config path:

- reported: code review quality, automated quality gates, pre-PR status checks
- found by sweeping: feature branch protection, git history integrity, branch
  protection standards, performance monitoring (three separate methods), unit
  test automation standards

All of them ask the shared discovery now, so adding a provider — or declaring
`pathMappings.cicdConfig` — reaches every law at once. A search for an
independent CI list in the source tree returns nothing.

Two defects surfaced while proving it, neither of them reported:

- **Package scripts were matched against their COMMANDS only.** The
  conventional `"build": "tsc"` was invisible, as was every toolchain whose
  binary is not spelled "build" — `ng build`, `vite build`, `esbuild`. Script
  names are read as well now. This was half of one report's "Missing build
  validation gates" against a project with a real build.
- **Required status checks were recognised only in a GitHub-shaped pipeline.**
  On hosts that configure "required for merge" in repository settings there is
  nothing in the build file for a keyword to match, however real the gate is.
  The sibling branch-protection check already accepted a server-side host as
  evidence; this one does too.

### 🐛 Fixed — the rest of the Nx and static-host discovery

The previous release fixed the Firebase header misreading in **one** analyzer
out of four named in the report. The rest:

- **Build configuration is read from `project.json`** when a workspace has no
  root `angular.json`. Both the asset-optimization and named-chunks checks go
  through that one iterator, so a classic Nx workspace stopped being unable to
  satisfy either regardless of what its production build actually configures.
- **The service-worker lookup resolves through the workspace**, not the
  repository root — `ngsw-config.json` sits beside the app.
- **`.webmanifest` is accepted** alongside `manifest.json`, including under
  `public/`. That is the extension `ng add @angular/pwa` scaffolds today, so a
  PWA built the way Angular's own generator builds it had no manifest as far as
  this law could see.
- **Caching headers are read from the static-host config**, not only from
  `nginx.conf`. A site behind a CDN had "no browser caching strategy" by
  construction, whatever its configuration said — a defect independent of the
  Firebase one, in the same law package.

The header reader is now one shared helper. It had been fixed once, in one
place, while two other analyzers kept the same misreading.

### 🐛 Fixed — a service is what a project runs, not what it installs

`http-server` and packages like it serve pre-built files: they run no
application code, own no database, and expose nothing a liveness probe could
mean. They are gone from the server-framework list.

The match is also restricted to **runtime** dependencies. A framework in
devDependencies is tooling — a preview server, a fixture in a test harness —
and scanning both lists made any repository that serves its own build for an
end-to-end run look like a backend, which was then asked for database
connectivity and Kubernetes probes.

### 🐛 Fixed — the Markdown footer is the block after the LAST rule

The boundary matched the **first** `---` with no multiline flag, so the lazy
capture ran to end of file. A document using `---` as an ordinary section
divider had its whole body read as the footer, and the first line of prose
containing `Rating:` was judged as the rating — while the real footer sat
further down, valid and unread. Long documents, ADRs and changelogs use `---`
that way as a matter of course.

The rating is also read from the last such line in the footer: where the field
appears more than once, the entry that closes the document is the canonical
one.

### 📄 Documentation

Comments that narrated who reported a defect and what they were doing now
describe the mechanism instead. A tool used by anyone should not read like the
support log of one project.

## [7.18.1] - 2026-08-11

Eleven consumer reports. **Four of them are against fixes that shipped in
7.18.0** — that is the part worth reading first, and the reason this release
exists a day later.

A PATCH: every change here stops a law being wrong. Nothing changes for a
project that was passing.

### 🐛 Fixed — what 7.18.0 got wrong

- **The footer rating broke on a bolded label.** The check was rewritten last
  release to accept any declared scale, then proved against
  `Investment Rating: A`. Real footers bold the label, and `Rating:` matches
  *inside* the bold span — so the captured value was `** A` and every
  letter-grade test failed on the asterisks rather than on the grade. 83 of one
  reporter's 84 files. Emphasis markers are now stripped before the value is
  judged. (#52)
- **The health-check gate accepted a filename as evidence.** `projectIsAService`
  returned true the moment a file named `health.ts` existed, with a comment
  arguing this was a safeguard. It was the defect it claimed to prevent: a
  browser client keeps its readiness probe — the code that calls
  `GET /api/health` and reads the answer — in exactly such a file, and the law
  then demanded an endpoint, a database connection and Kubernetes probes from a
  PWA. The evidence is now serving: a web framework, a container that opens a
  port, a Procfile `web:` entry, or a deployment manifest. "Any Python project
  is a service" is gone too — that accused every Python CLI and library. (#50)
- **i18n discovery was rooted, and could not have worked anywhere.** Last
  release fixed how files inside translation directories are enumerated and
  left the directory list root-relative, so an Nx workspace keeping catalogs
  under `libs/**/i18n/locale/` had none. Worse: the file test paired
  `getBasename` (strips the extension) with `isTranslationFile` (decides *by*
  the extension), so `en.json` arrived as `en` and matched nothing — that
  pairing could never return true, at any path, for any project. (#51)
- **The shared CI module was the eighth copy of the list.** A consumer moved CI
  to Google Cloud Build and six unrelated laws failed on the commit that removed
  `bitbucket-pipelines.yml`. They traced it to one hardcoded list; there were
  eight — five inline in laws, one in `DeploymentLawBase`, one in
  `project-discovery`, and one in `CiCdDetector`, an already-existing shared
  module whose own docstring says the constitution must not assume a single
  vendor. `project-discovery` was added last release *as* the shared module
  without noticing it. There is one list now. (#48)

### ✨ Added — declare where your CI lives

`pathMappings.cicdConfig` accepts a path or glob. A provider allowlist is
incomplete by construction, and Google Cloud Build defeats it outright: the
trigger names the config path, so there is no filename to add. A project can
now say where its CI is instead of keeping a decoy pipeline file around to look
compliant.

```json
"pathMappings": { "cicdConfig": "infra/cloudbuild/*.yaml" }
```

Optional. Nothing changes for a project that does not set it.

### 🐛 Fixed — a crash reported as a clean result

`isPerformanceTestFile` read `this.PATTERNS` and was handed to the file walker
as a bare reference, so `this` was undefined and every call threw. The
enclosing `catch` returned an empty result, which the law printed as **"No
performance test files found"** — indistinguishable from a project that
genuinely has none. The sibling API-testing call site already binds; this one
was missed.

The predicates no longer read `this` at all, so no call style can break them,
and the `catch` rethrows `TypeError`/`ReferenceError` instead of reporting them
as an answer. Filesystem errors stay swallowed — those are expected. (#49)

### 🐛 Fixed — merge commits failed their own hook

`merge-conflict-prevention` flagged a violation whenever `.git/MERGE_HEAD`
existed. That file answers "is this commit a merge", not "is there an
unresolved conflict": git writes it when a real merge commit is needed and
removes it only *after* `git commit` creates that commit. A pre-commit hook runs
before the commit exists by definition — so it was present on every merge, for
every user, with nothing unresolved. A repository wiring this law into
pre-commit, which the law's own suggestion recommends, could not complete a
local merge at all.

The two checks above it — conflict markers via `git grep`, and `UU`/`AA`/`DD`
via `git status --porcelain` — already answer the real question and still fail a
genuinely unresolved conflict. (#56)

### 🐛 Fixed — the commit hook now enforces what the audit enforces

Two ways the generated `commit-msg` hook disagreed with the law that scans
history afterwards:

- It never measured the **subject length**. A 77-character subject passed the
  hook, landed in history, and then failed Commit Message Standards — at which
  point fixing it means rewriting history. That is how a team arrives at
  `--no-verify`. The hook now reads the same config key the law reads. (#46)
- The pattern had no `!`, so `feat(events)!:` — the Conventional Commits
  breaking-change marker, clause 11 of the spec summary — was refused. That
  pushes an author to the footer form or to dropping the marker, and an unmarked
  breaking change is the failure the convention exists to prevent. It also
  erases the marker from `git log --oneline`, which is where a reviewer scans
  for it. Added to the history law's pattern too. (#47)

### 🐛 Fixed — three checks that could not read what was in front of them

- **Firebase Hosting headers.** `hosting.headers[].headers` is an ARRAY of
  `{key, value}` — the only shape `firebase deploy` accepts. Two analyzers read
  it as a dictionary: `headers['Cache-Control']` is `undefined` for every array,
  and `'Link' in headers` asks whether the array object has a property by that
  name. Both were false for every `firebase.json` ever written, so no valid
  config could pass. (#53)
- **Comment ratio.** Lines were classified by their own prefix with no notion of
  being inside a block, so every `*`-prefixed JSDoc continuation line counted as
  *code*. A file carrying two full doc blocks measured 3.6% commented where the
  honest figure was 38%, and the law then asked it for more documentation. (#54)
- **Performance-test discovery** — see the crash above. (#49)

### 🔒 Fixed — the results cache is keyed by audit mode

The cache key was files + config + git state, with one cache file per project.
None of those change with the mode, but the modes audit different law sets on
purpose: `pre-commit` skips the three git-history laws, a Pareto run checks a
subset. So a verdict computed under one mode could be served for another — and
the direction that matters is a **narrower** `pre-commit` verdict answering a
full audit: PASSED reported over laws nobody ran.

Entries written before this release invalidate safely.

This was found while investigating a report of a flapping `pre-commit` law
count. It is a real hole, proven by construction — but it is **not** confirmed
to be the cause of that report, which stays open. Their numbers do not fit a
simple explanation: `full` reports 110 and `pre-commit` excludes exactly three
laws, which should give 107, while they observe 106 and 108.

## [7.18.0] - 2026-08-09

Sixteen consumer reports, closed together. The version is a **MINOR** for one
reason: installing the package no longer runs a script. Everything else here
only stops laws being wrong.

### 💥 Changed — the package no longer runs a postinstall script

Adding `ruleofcode` as a dependency executed a script that scanned the
consumer's project and wrote a recommended config. A tool that inspects your
repository the moment you install it has to be asked, not assumed — and package
scanners flag install scripts for exactly that reason.

The recommender is unchanged and still shipped. It now runs only when you
invoke it. A regression test forbids `preinstall`, `install` and `postinstall`
returning to `package.json`.

**If you relied on the config appearing at install time**, run the recommend
command once. Nothing else changes. (#22)

### 🐛 Fixed — six laws only knew one project layout

The same finding arrived six times from one reporter, in six shapes: an
artefact looked for at a single-project root, while an Nx workspace keeps it
under `apps/*`, `libs/*/*`, or states it once in a shared preset.

- **Coverage thresholds** were read by joining every candidate config into one
  string, anchoring on the **first** `coverageThreshold` and reading a fixed
  800-character window after it. With the per-project configs sitting between
  the root config and `jest.preset.js`, the file holding the numbers fell
  outside the window — so a workspace pinned to 100 on all four metrics was told
  "100% coverage thresholds not configured". The scan also required inline
  literals, so `coverageThreshold: { global: COVERAGE_CONTRACT }` — stating the
  contract once instead of copying it into eighteen files — was unreadable.
  Threshold reading is now one shared reader: every config on its own, every
  block, delimited by **brace balance** rather than a character budget, and a
  same-file constant followed. (#40)
- **CI and build discovery** was a hardcoded list per law, and each list missed
  a different part of the same workspace: providers other than GitHub Actions,
  Python build configuration, monorepo project folders. Now one shared
  resolver. (#24, #32, #38)
- **i18n configuration** was read from a root `angular.json` that an Nx
  workspace does not have, and translation files were discovered through a scan
  that honoured `includes` — so a narrow include list hid the very files the law
  is about. (#34)
- `libs/*/*/` is now resolved as a project folder. Nx nests libraries by domain
  and a one-level pattern saw none of them.

### 🐛 Fixed — an audit named a count and never the artefacts

A violation said "21 source files lack corresponding test files" and stopped
there. `--verbose` changed nothing.

The information was never missing. **Most laws already resolve the file names
and put them in `suggestions` — the console renderer printed `violations` and
dropped `suggestions` entirely.** Two places in the engine touch that field and
both set it to an empty array. The reporter reimplemented a law's discovery in a
script to recover the list, got a different count, could not tell which of the
two was wrong, and parked the law.

That is the failure mode worth naming: an unexplained violation pushes a project
toward a waiver rather than a fix, and a compliance tool that quietly rewards
waivers is working against itself.

Failing and warning laws now print what the law is asking for — three entries,
then a pointer to `--verbose` for all of them and `--export json` for the full
result. `--verbose` lifts every truncation. Its `--help` text described more
than it did and now describes what it does. (#42)

**Not fixed here:** the structured `violationDetails` channel — file, line,
column, already rendered — is populated by **2 law files out of 225**. Filling
it in is per-law work with a per-law judgement about what the evidence actually
is, and a mass edit that filled it with something vague would be worse than the
current honest silence. Tracked as its own issue.

### 🐛 Fixed — laws that could not be satisfied without lying

- **Health Check Monitoring** judged every project as if it served traffic, so a
  library, a CLI or a component package was told to expose `/health`. It now
  establishes that the project is a service first — a health file, a Python
  service, a server dependency, an `EXPOSE`d Dockerfile, or a deployment
  manifest — and reports nothing when it is not. (#34)
- **The Markdown footer** accepted one literal rating line, so a document rated
  8/10, graded B+, or marked `needs-review` failed a check named "has a rating".
  It now accepts an N/10 score, a letter grade, or a status word. (#33)
- **Code Complexity Control** summed every decision point in a file and compared
  the total against a threshold documented as a per-function limit. A file of
  many simple functions failed it, and the only escape was splitting modules
  that had nothing wrong with them. The threshold now measures the worst single
  function, which is what it says it measures; a file-wide budget is available
  as an opt-in `thresholds.codeQuality.maxFileComplexity`. (#35)
- **Git-history laws in the pre-commit hook** blocked a commit on the state of
  the past, which deadlocks the rewrite that would fix it. They now run on
  pre-push and in CI; the commit-msg hook still checks the message being
  written. (#37)

### 🐛 Fixed — detectors that misread what was in front of them

- `test-coverage-constitutional-standard` had **no code path for
  `ignores.byRule`** — its private ignore check read `ignores.global` only, and
  read it by stripping the glob wildcards and testing whether the path contained
  the remainder. Discovery now goes through the shared filter every other law
  consults. Three more surfaced while proving it: the ignore check was handed a
  bare filename joined to the scan root, so nothing below the top level was
  matched against its real path; `jest.preset.js` was reported as a source file
  lacking a test; and barrels and configs counted in the ratio denominator,
  which made "test coverage ratio" a measure of project layout. (#39)
- `typescript-strict` required `moduleResolution: "node"`, so `bundler`,
  `node16` and `nodenext` — what current toolchains generate — were reported as
  not strict. (#28)
- The class-documentation check matched a doc comment only when it sat
  immediately above the `class` keyword, so every decorated Angular class
  counted as undocumented. (#36)
- `angular-testing-excellence` matched only quoted test descriptions, so a title
  written as a template literal was reported as having none. (#30)

### 🐛 Fixed — configuration that looked like it worked

- A `laws.severity` value the engine does not recognise fell back to **error**
  with no warning, and a `notApplicable` entry naming a law that does not exist
  parked nothing at all. Both are now reported. (#25)
- Two sacred laws decided whether a project was governed by testing for a
  literal `ruleofcode.config.json` in the repository root, while the loader
  accepts several names across several directories. Both now ask the resolver
  the loader uses. (#27)

### 🐛 Fixed — the version stamped into git hooks was maintained by hand

The hook installer wrote its own version into every hook it generated, from a
literal in the source that a human had to remember to bump. It had drifted: the
hooks committed in this repository announced 7.17.6 while the package moved on,
and `package-lock.json` was two releases behind on top of that.

The stamp is now read from `package.json`. A regression test asserts the stamp,
the lockfile and the package agree — a tool whose subject is claims matching
reality should not ship a version claim it maintains by hand.

### 📄 Documentation — detectionLimits

Two of the defects above (#33, #28) were **already recorded in our own
`detectionLimits`**, and the `typescript-strict` test asserted the wrong
behaviour with a comment explaining why. The honest field had become a place to
hide. New entries state what the complexity and coverage checks still do not
see — as limits to fix, not as cover.

## [7.17.6] - 2026-08-08

### 🐛 Fixed — the hook executable bit is read from the git index, not the filesystem

Git Hook Compliance called **every hook of every Windows project** non-executable, and
the consumer could not act on it. NTFS carries no POSIX execute bit: `fs.stat().mode` is
`0o666` for every file there and `chmod` is a no-op, so `chmod +x` — the fix the law
printed — changes nothing. It also judged files git never runs: husky keeps
`.gitignore`, `husky.sh` and `h` in its hooks directory.

The bit now comes from the **git index** (`100755` / `100644`), which answers the same
question identically on every platform and only for files a consumer can commit a mode
for. Untracked hooks are not judged at all — husky ignores its generated `_` directory
wholesale, so no mode exists there for anyone to set. Only names git actually runs as
hooks are considered.

**The concern behind the law was real and is kept.** Hooks committed at `100644` are not
executable when the repository is cloned on Linux. The committed layout is
`.husky/<hook>`, not the resolved hooks directory, so the check reads both — removing
the false positive without removing the true one. The suggestion is now actionable:
`git update-index --chmod=+x <path>`.

Three new `detectionLimits` entries declare what is consequently **not** checked.

If a Windows build was failing this law, this is the fix — no config change needed.

### 🔒 Security — dependency lockfile refreshed

Development installs pinned minimatch 9.0.5, brace-expansion 2.0.2 and lodash 4.17.21 —
three high-severity advisories between them. **Consumers were never exposed**: the
package's caret ranges resolve the patched versions on a fresh install, verified against
the published tarball. Only this repository's lockfile was stale, which meant CI tested
against vulnerable dependencies. `npm audit` now reports zero.

### 📄 Documentation — the law card schema

`roc laws --json` exposes two fields that look like one vocabulary and are not: `stack`
answers **selection** (does this law run here), a `satisfiedBy` key answers **guidance**
(which technology the instructions are written for). They are orthogonal — no key maps
onto a single stack, and `angular` sits on TypeScript-stack and universal laws too. The
README now documents both axes and points renderers at `satisfiedByStacks.stackToKey`,
which the JSON already shipped undocumented. It also states plainly that all 58 frontend
laws carry Angular guidance only.

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
