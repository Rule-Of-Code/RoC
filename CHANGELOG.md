# Changelog - RuleOfCode

All notable changes to RuleOfCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.21.0] - 2026-08-18

**If you work in an Nx workspace, five laws have been lying to you — and
lying in the same direction.** No config edit is required; nothing was
removed; the law count is unchanged at 169. Every change below makes a law
report *less*, so a law you parked because of one of these can be unparked.

Five consumer reports, and four of them turned out to be one defect wearing
different names: **a config read from the project root, while an Nx workspace
deliberately keeps it somewhere else.** In three of those four, the shared
reader that looks across the workspace was *already written* — the law simply
did not ask it.

That is worth stating as its own finding. The shape is not "a detector is
wrong"; it is **"a detector did not ask the module that already knew"**, and
that is a different thing to go hunting for.

### 🐛 Fixed — the test count, which was counting almost none of them

The recursive walk asked the directory filter without the `includeTests` flag,
so it resolved the ignore set for a scan that *excludes* tests — which prunes
`**/*-e2e/**`, `**/e2e/**`, `**/test/**`, `**/tests/**` and `**/cypress/**`.
Whole directories of specs were removed before the file validator meant to
accept them ever ran. That validator asked correctly, with `true`; nothing
reached it.

| layout | before | after |
| --- | --- | --- |
| six typical spec locations | **1 of 6** | 6 of 6 |
| Nx: 9 unit + 18 Playwright | **9 of 27** | 27 of 27 |

The ratio was computed from a numerator that had never seen most of the tests,
and its advice — "add test files" — could not move it.

The audit now also names **which** test files it counted: *"If a test you have
is missing from this list, the ratio is wrong rather than your coverage."*
Until now the only way to see that was to re-implement the scan by hand against
the compiled output, which the reporter did.

### 🐛 Fixed — Angular states its environments in the build system

`configurations.production` and `configurations.development` are what select the
production budgets, output hashing and optimisation. That **is**
environment-specific configuration — the thing `environment-parity-standards`
asks for — so a project that had it was told to "use environment-specific config
files" and could not make the finding move by doing so. Adding `NODE_ENV` would
have added a variable nothing reads.

A **single** configuration is still reported: that genuinely is a
single-environment build.

### 🐛 Fixed — the performance family contradicted itself in one run

Four laws reported three things as absent that were present, and two of them
were contradicted by other laws in the same audit, on the same commit.

| check | before | after |
| --- | --- | --- |
| budgets (`performance-monitoring-policy`) | not configured | found |
| budgets (`performance-monitoring-standards`) | not configured | found |
| bundle optimization (`performance-standards`) | not configured | satisfied |
| resource hints (`core-web-vitals-compliance`) | missing | found |

Three separate causes: two of **six** budget readers asked only for a root
`angular.json`; bundle optimization demanded a literal `"optimization": true`
that the esbuild builder makes unnecessary; and resource hints were read from
source alone.

That last one deserves its own line. **A preload hint for a content-hashed
asset cannot exist in source** — `font-<hash>.woff2` has no name until the
bundler has run, so the tag is stamped in afterwards. The more carefully a
project preloads its own fonts, the more certain the false finding was. The
build output is read now, honouring a declared `outputPath` including Angular
17's `{ base, browser, server }` form; source is still read, so hand-written
hints in an unbuilt project are unaffected.

### 🐛 Fixed — a waiver the law could not reach

There is no `laws.notApplicable` entry for "the auth clause of the checklist
law". So a project that had declared Authentication Security and Health Check
Monitoring inapplicable — with written reasons the audit **accepted** — was
asked for both again, inside `pre-deployment-checklist-mandatory`, where the
waiver could not reach. The audit agreed the project had no authentication
surface and demanded one, in the same run.

Each of the four sub-checks now defers to the law that owns its concern:
authentication, health checks, benchmarking and logging. Three boundaries are
held deliberately, and tested:

- **The checklist clauses are untouched.** The document is that law's own
  subject; delete it and the law still fails, waivers or not.
- A waiver answers **its own** clause and no other.
- **An empty reason is not a waiver.** A waiver without a justification is the
  disarmed gate this tool exists to refuse.

Resolution is by name identity only — `legacyId` is shared by 51 laws, and an
ambiguous key must never widen a waiver silently.

### 🐛 Fixed — coverage thresholds live where Jest resolves them

Jest resolves coverage thresholds **per project** when `projects` is used, so
the root config of an Nx workspace cannot hold one; it is an aggregator. This
law read the root and nowhere else, so a project gating on 100% branches was
reported as having no coverage gate.

Duplicating the threshold at the root would have gated nothing — a decoration
added to be seen, which is precisely the box-ticking this tool refuses. The
shared reader already existed; the law now asks it, and the root-only helper is
deleted rather than left beside the fix.

## [7.20.0] - 2026-08-18

**No config edit is required.** Nothing was removed, the law count is
unchanged, and every fix below makes a law report less, not more — except one,
which is `info` and cannot fail your audit.

Six consumer reports. Four of them named one site; sweeping for the shape found
six, four, four and two. That ratio is the reason these releases keep saying
it: a reported defect is usually one instance of something repeated.

**The one change that reports MORE:** Seeded Randomness now recognises
`secrets.*`, `os.urandom` and `random.SystemRandom()` in Python domain code. It
is an `info` law, so a new finding there does not fail an audit — and the advice
attached to it changed, see below.

### 🐛 Fixed — a git path is not the repository

`<root>/.git` is a directory only in a primary checkout. In a linked worktree it
is a FILE holding a `gitdir:` pointer, so every detector that joined
`.git/config` or `.git/hooks` onto the project root read nothing there — and
concluded the absence of what it looked for.

The reported symptom was the worst kind: **a verdict that depends on which
directory you commit from**. The same law, same commit, same version, scored 80
in the primary checkout and 45 in a worktree of that repository.

One site was reported; six were found. The second is worse than the report:

> **Git History Integrity looked for a force-push guard in
> `.git/hooks/pre-push`.** That misses the hook in *every husky project*,
> worktree or not, because husky moves `core.hooksPath` to `.husky`. It drives a
> violation, so it accused projects of having no force-push protection while
> their hook sat there working — including projects that installed husky because
> we told them to.

Worktrees are how two agents avoid sharing one working directory. A gate that
changes its verdict when you adopt that isolation penalises the safer setup, and
reads as a code problem while doing it.

### 🐛 Fixed — one branch-name rule, and `chore/` decided in one place

Two laws validated the branch name independently with rules that disagreed. The
sharpest consequence was ours: one law listed `chore/` as valid **and printed it
as remediation advice**, while the other rejected it. Following our own
suggestion produced our own violation — which is how it was found, when a
back-merge branch named `chore/backmerge-v7.19.0` failed our CI.

| branch | before | now |
| --- | --- | --- |
| `chore/update-deps` | one law rejected it | both accept |
| `feature/Add_User_Auth` | `_` and uppercase rejected | both accept |
| `feature/roc/sub-scope` | `/` rejected | both accept |
| `feature/ABC-123` | **unreported** — uppercase rejected | both accept |

A character class had been deciding policy by accident: nobody chose to reject a
branch named after a ticket, a regex did. The accepted set is explicit now, and
configurable via `thresholds.git.branchNaming.allowedPrefixes` — and **the
suggestion string is generated from it**, so advice and policy cannot diverge
again.

### 🐛 Fixed — commit size measures authored change, not generated lines

A lockfile cannot be split across two commits, and splitting it from the
manifest that caused it lands an inconsistent tree. Counting its lines made a
dependency update uncommittable — the report was a security patch held up by
17,980 generated lines, with only two ways past: raise the limit for every
commit and lose the law everywhere, or leave the advisory unpatched.

- Generated files no longer contribute **lines**. Sixteen lockfile formats by
  default, replaceable via `thresholds.git.commitSize.generatedFiles`.
- They still contribute **files**. Twelve lockfiles in one commit is still
  oversized: the exemption is for content nobody reads, not for the size of a
  change.
- **`baseline` is honoured**, as the two sibling commit-history laws already
  did. Three laws read commit history and one of them could not be scoped to
  commits made after adopting RoC.

### 🐛 Fixed — two heuristics that reported on code they never read

**Awaiting non-promise values** excluded one- and two-level calls and nothing
deeper, and could not see past the end of a line. It reported
`await page.keyboard.press('Escape')` — any fluent API produces three-level
calls — and reported `await expect` because the formatter had wrapped `.poll(…)`
onto the next line, making the finding depend on line width rather than on the
code. It is narrowed to literals: a number, a string, a boolean,
`null`/`undefined`, or an array where `Promise.all` was meant. That is the whole
set the check can be right about.

**HTTP calls should be mocked** fired on `content.includes('http')` over the
whole file, so a URL in a comment was read as a network request. It requires an
actual call now.

Both sit in laws that carry real debt, so these counted as test-quality debt
that could not be paid — satisfiable only by abandoning a fluent API or fighting
the formatter.

### ✨ Added — the commit laws say which scope they resolved

A `baseline` resolves against the **local** ref, so a branch that has not been
pulled puts commits already merged upstream inside the scanned range. The output
named a position and nothing else, which made a correct result
indistinguishable from a broken one.

A reporter read the finding the only way it could be read — a foreign commit in
shared history — rebased (which could not help, the commit being upstream
already), lost two of their own commits, recovered them from the reflog, told
their team lead the gate was blocking every branch, and began drafting an issue
against a tool that was working correctly. `git pull` was the fix.

All three history laws now lead their advice with the scope:

```
Scope: 3 commits in develop..HEAD — and 'develop' is 2 behind origin/develop,
so commits already merged upstream are inside this range.
Run 'git pull' on develop before trusting these findings.
```

It appears only when a law has something to report, so a clean run gains no
noise.

### ✨ Added — reproducible randomness and unpredictable randomness are not the same request

`random.choice()` in domain logic should be **reproducible**; seeding is the
answer. But `uuid4`, `secrets` and `os.urandom` are chosen precisely because
their output **cannot** be predicted — an identifier travelling in a share URL,
an invite code, a token. "Seed or inject the RNG" there is not a testability
improvement, it is a security defect, and a sequential replacement leaks how
many records exist and lets anyone walk the collection.

| source | requirement | advice |
| --- | --- | --- |
| `random.*` | reproducible | inject a **seedable** generator |
| `uuid4`, `secrets`, `os.urandom`, `random.SystemRandom` | unpredictable | inject an id/token factory — a test substitutes a stub, it does **not** seed the source or swap in a counter |

`random.SystemRandom()` is recognised now; it was declared in our own
`detectionLimits` as uncaught. This is the one change in this release that
reports more, and the law is `info`.

The Law Card states the exception too: a cryptographic source at a boundary
declared in `thresholds.python.randomnessBoundary` is a **correct answer, not
debt**. Nothing previously said the knob was the sanctioned path rather than a
way to silence the law.

## [7.19.0] - 2026-08-13

**Read this before upgrading. Three changes move numbers you may have written
into your config.** None of them is a defect in your project; all three will
look like one if the note is not read.

**1. The law count drops by four.** Four laws were duplicates of laws that
remain — two entries running one detector, unable to disagree. They are
retired:

| retired | the law that remains |
| --- | --- |
| Advanced Bundle Optimization Policy | Bundle Optimization Strategy Policy |
| Extended Core Web Vitals Compliance | Core Web Vitals Compliance |
| NgRx State Structure Patterns | NgRx State Normalization Mandate |
| Extended Performance Monitoring Standards | Performance Monitoring Standards |

Applicable laws per stack: **frontend 136 → 132 · python 100 → 99 · node 78 →
77**. If your `laws.minLawsChecked` equals the count you see today, the audit
will refuse to report — correctly, because it can no longer prove the floor.
**Lower it by the same amount.** The number to set it against is printed on
every run: `of which count for the liveness floor: N`.

**2. Those four names, if they appear in your config, are now dead keys.**
A key in `laws.severity` or `laws.notApplicable` that resolves to no law gates
nothing, and Config Integrity Guard reports it — by design, since a config that
looks strict while being disarmed is the failure this tool exists to prevent.
Remove the retired names. Our own config and both recommended templates carried
them; that is how we found this half.

**3. Magic Number Prevention reports more, because it was over-exempting.**
The unit patterns matched a substring of any nearby word: `em` inside
"element", `ms` inside "params", `s` at the end of any plural. `arr.slice(0,
250)` was silently exempt because of the "s" in "items". On this repository
alone the finding count went from 114 to 125. Those are not new violations —
they were always there.

### 🐛 Fixed — four duplicate laws retired

One pair was reported. Sweeping for the shape found four, and all four were
already declared in our own `detectionLimits` as redundant: written down
instead of fixed. Each pair was verified empirically — both laws run against
one project, results compared — not by reading the descriptions.

The dilution was not cosmetic. The liveness floor is measured against the
number of laws that ran, so a duplicate raised the floor a project trusted
above the number of distinct checks protecting it.

### 🐛 Fixed — a database layer is proved by use, not by a dependency name

`database-query-optimization` tested a regex against the raw text of the
manifest. `firebase` is a meta-package covering Auth, Analytics, Messaging and
more, and the substring also matched unrelated packages such as
`@capacitor-firebase/authentication`. A client that only ever calls
`initializeApp()` and a sign-in method was told to add composite indexes, query
batching and cursor pagination for a database it never opens.

Evidence is now an actual import — `from '…'`, `require('…')`, `import('…')` —
or a call that opens a connection, read through the project's own file
discovery. Two consequences worth knowing:

- A module name that is merely **listed** proves nothing. A dependency-audit
  script naming `mongoose` is not a database layer.
- A file the analysis will never read cannot prove the substrate either. A test
  fixture describing Firestore code is a description, not a database.

### 🐛 Fixed — a git tag is a ref, not a version string

`release/v1.2.3` carries the version in its last segment; the namespace before
it is what deployment triggers match on — a Cloud Build `tag: ^release/v.*$`,
a GitHub Actions `on.push.tags: 'release/v*'`. Two laws tested the **whole
ref** against SemVer, so every namespaced release tag failed on its namespace
alone, however correct the version inside it.

The advice was the sharper half: *"Use semantic version tags: v1.2.3 or
1.2.3"* — a rename that would disconnect a release from the pipeline that
deploys it. The namespaced form is now named as acceptable in both laws'
suggestions.

A third site went unreported and is fixed with them: **tag-prefix
consistency** read the whole ref too, so `release/v1.2.3` was not
"v-prefixed". A project moving its tags under a namespace was told it was
inconsistent with itself while every one of its tags was v-prefixed.

A fourth surfaced while proving the third: a tag carrying **no** version —
`nightly` — produced *"package.json version (0.1.0) is behind the latest git
tag (nightly) — bump it"*. You cannot be behind a tag that names no version,
and the tag's format is already reported by the check beside it.

The root cause is the reason two issues were needed for one defect: the two
laws held **their own copies** of the same rule. Four copies of the SemVer
grammar had accumulated across the tool, in dialects that disagreed at the
edges. There is one definition now — SemVer 2.0.0 as specified, including the
no-leading-zeros rule for numeric prerelease identifiers. `1.2.3-01` is
rejected where the loosest of the four accepted it.

### 🐛 Fixed — declared budgets count as a bundle-size policy

`bundle-optimization-strategy-policy` demanded a webpack-era analyzer from
projects that have no webpack. On the esbuild builder there is nothing to
install and no reason to install it — vendor splitting is automatic — so no
configuration both satisfied the law and stayed correct for the toolchain.

Budgets declared in the build configuration are now accepted: they are a
bundle-size policy, and an enforced one, since the build fails on them. The
analyzers for esbuild, rollup, vite and Next.js are recognised alongside
webpack's.

### 🔒 Security

`minimatch` reached the audit through a lint plugin at a version with three
ReDoS advisories. Pinned via an override; `npm audit` reports zero
vulnerabilities. Nothing changes for you: it is a development dependency, and
the tarball ships no dependency tree — the `overrides` declaration appears in
the published `package.json` but npm honours only the root project's.

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
