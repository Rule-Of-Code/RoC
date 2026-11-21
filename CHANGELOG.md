# Changelog - RuleOfCode

All notable changes to RuleOfCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Internal — `noUnusedLocals` is on

This repository's `tsconfig.json` now sets `noUnusedLocals: true`, one of the
flags TypeScript Strict Mode (SACRED LAW) asks for. The 82 declarations it found
are gone: unused imports, private helpers no code calls (a second copy of a
test-file finder in two services, four project-type checks, an "old" README
assessor, five performance helpers whose callers had moved on), `Config`
aliases nothing read, and locals computed and dropped. Exported code is not
touched here.

Three of them were not plain dead code:

- The engine filtered the laws to run inline, while the tests asserted on a
  private `getLawsToAudit()` that only they called. The engine now calls it, so
  the tests check the selection the audit really runs.
- `PathOperations.findWorkspaceRoot` walked the parent directories, built a
  path per marker file, looked at none of them and returned its argument. It now
  just returns its argument and says so; `ConfigFileUtils.findWorkspaceRoot` is
  the one that searches.
- `RuleOfCodeAuditor` stored the `suggestExceptions` option and never read it,
  so `audit --suggest-exceptions` changes nothing. The field is gone; the
  constructor keeps the positional parameter because the constructor is public.

### Internal — eslint is a direct devDependency

`npm run lint` runs `eslint .`, but `eslint` was only installed as a peer of
`@typescript-eslint/parser` and `eslint-plugin-sonarjs`, never named in
`devDependencies`. Investment-Grade Quality ("Quality tool missing: eslint")
and Professional Excellence ("Missing eslint for Code linting") reported that
on the self-audit, and they were right. `eslint` `^9.39.5` — the version
already in the lockfile — is now a devDependency; the lockfile changes only
by dropping the `peer` flag from eslint and its dependencies.

### Internal — this repository keeps MD Footer Template on

MD Footer Template became opt-in in this release (#468). This repository does
not drop a law from its own config to reach a clean self-audit, so it turns it
on again, at the severity it ran at before (`"MD Footer Template (MANDATORY)":
"warning"`). Its includes name only source (`src/**/*.ts`, `scripts/**/*.js`,
`tests/**/*.ts`), which select no Markdown file; `includes.byRule` gives this
law `**/*.md`, or it would judge nothing.

Every tracked Markdown file now ends with the footer the law asks for. The
values are facts, not claims: the version points at the file's git history,
and the rating is a status word — `reviewed` only where the file was checked
against the code or the process that day, `current` for the CHANGELOG,
`needs-review` everywhere else.

### 🐛 Fixed — Test Data Management read an exact expected value as hardcoded test data (#439)

Any string of 20 or more characters inside `expect(…).toBe(…)` matched the
"hardcoded test data" pattern, so `expect(result.lawName).toBe('angular-testing-excellence')`
was reported as test data to replace with a factory. The value a test expects
back is the assertion itself; no factory can produce it.

Before: a file was "hardcoded test data" if it held an inline array of records
with string ids, a `mockReturnValue` of a 4+ digit number, or any long exact
string in `toBe(…)`. After: the first two only; an expected value is not data.

Self-audit of this repository: Test Data Management "Found hardcoded test data"
— before 102 files (101 of them for a long expected string), after 1 (a
detector test whose fixture strings hold the two remaining patterns).

### 🐛 Fixed — Absolute Zero Tolerance judged text as code, and a CLI's output as debug logging (#424, #425)

Every check ran a regex over the raw file, so a `console.log` in a message,
`any` in a comment's prose, `TODO` in a string or in a sentence about the
TODO law, and `eslint-disable` in a string were all findings. The checks now
read the TypeScript parse.

| | before | after |
|---|---|---|
| `console.*`, `: any`, empty `catch (e) {}` | anywhere in the text | in code only |
| `as any` cast | not counted (the regex matched only `: any`) | counted with the `: any` annotations |
| TODO/FIXME/XXX/HACK | any `//` line containing the word, any case | a tag in capitals at the start of a `//` comment |
| `eslint-disable` | anywhere in the text | in comments only |
| `unknown[]` | a strict-type violation | not a violation (the safe type for data of unknown shape) |
| `constructor(...args: any[])` of a mixin | a violation | not counted (TypeScript requires it, TS2545) |
| package with `bin` in package.json | every `console.*` counted | `console.log/info` is the command's output in the whole package; `console.warn` only in the command's entry modules (the source of each `bin` target, the directory named after it, a `commands/` beside it); elsewhere `warn`, and `debug/trace` everywhere, still count |
| a logging module (`logger.*`, `logging*`, `log.*`) | its `console.*` counted | not counted |
| no loadable `typescript` | text scanned | ".ts file(s) were NOT read" — judged nothing |

Findings name the file relative to the project on Windows too (they carried
the absolute path when the project root was written with backslashes).

### 🐛 Fixed — Magic Number Prevention reported numbers that are already named, and missed some that are not (#431)

The law scanned text: a regex literal was skipped but not blanked, so
`{0,300}` was a magic number; a name was accepted only in `const X = N` or
`key: N` on the same line; and whole template literals were blanked, so
`${text.slice(0, 57)}` was never seen. Literals are now read from the
TypeScript parse.

| | before | after |
|---|---|---|
| digits in a regex literal | reported | not code |
| `config.x ?? 50` (also with `??` on the line before) | reported | named by the left side |
| parameter / destructuring default `before = 50` | reported | named |
| `MAX_AGE = 24 * 60 * 60 * 1000`, `SIZES = [16, 32]` | later factors / elements reported | named |
| `const CODES = new Set([401, 403])`, a class field `= new Map([...])` | elements reported | named by the const / field |
| a Set/Map built anywhere else (parameter default, object property, argument) | elements reported | still reported |
| `parseInt(s, 16)` | reported | the radix is not a magic number |
| `${t.slice(0, 57)}` inside a template | never seen | reported |
| no loadable `typescript` | scanned as text | "code file(s) were NOT read" — judged nothing |

Score deductions, unnamed length limits and other unnamed literals in code
are reported as before.

### 🐛 Fixed — Centralized Logging counted a CLI's output, strings and the logging module itself (#424, #425)

| | before | after |
|---|---|---|
| `console.log(` inside a string | a call | not code |
| package with `bin` in package.json | every `console.*` counted | `console.log/info` is the command's output in the whole package; `console.warn/error` only in the command's entry modules (the source of each `bin` target, the directory named after it, a `commands/` beside it); elsewhere `warn/error`, and `debug/trace` everywhere, still count |
| where console is allowed | files named `logger.service.ts` and `main.ts` | also any logging module: `logger.*`, `logging*`, `log.*` |
| no loadable `typescript` | text scanned | ".ts file(s) were NOT read" — judged nothing |

The Python branch is unchanged.

### ⚠️ BREAKING — Code Documentation Standards judges each exported class and function, not ratios (#439)

The law asked for JSDoc but measured something else: a comment-to-code ratio
per file, a README in every `src/app` / `src/lib` directory, and two coverage
percentages over regex counts of classes and of every function and method.
It could pass a file of undocumented exports and fail a well-documented one
for being short on `//` lines. In the self-audit of this repository 81 of its
82 findings were "Low comment ratio"; the one coverage finding (classes,
50.4%) did not count a JSDoc block at the top of a file for the file's only
exported class (97.5% when counted). Its messages also carried absolute paths
on Windows: the root (`D:\…`) was stripped from file paths written `D:/…`.

Before: comment ratio, README presence, class coverage ≥ 80 %, function and
method coverage ≥ 60 %. After: one rule, one finding per declaration —
`src/x.ts:12: exported class X has no JSDoc`:

- every exported class and exported function (a function declaration, or a
  `const`/`let`/`var` initialised with an arrow or function expression;
  `export default`, and a local declaration named in `export { … }`) needs a
  non-empty JSDoc block above it — above its decorators, where the compiler,
  IDEs and TypeDoc read it;
- a JSDoc block at the top of the file documents the file's only exported
  class/function;
- methods, interfaces, types, enums, non-function constants, non-exported
  code and `.d.ts` files are not judged.

The files are read with the project's own `typescript`, not a regex (an
`export class` in a template string is no longer a class); without it they
are reported as not read, and a file that does not parse is named. Paths in
the messages are relative, with forward slashes, on every platform.
`ignores.byRule` keyed by this law now applies.

`thresholds.codeQuality.minCommentRatioPercent`, `minFileSizeForComments`,
`thresholds.documentation.minClassDocumentationPercent` and
`minFunctionDocumentationPercent` are no longer read (marked deprecated in the
config types).

Self-audit of this repository: 82 findings before → 171 after (40 classes,
131 functions, in 68 files).

### 🐛 Fixed — a committed PRE_DEPLOYMENT_CHECKLIST.md was reported missing when `includes` name only source (#476)

Pre-Deployment Checklist looked the checklist up through the source scan,
which applies `includes.global`. A project whose includes name only its
source (this repository: `src/**/*.ts`, `scripts/**/*.js`, `tests/**/*.ts`)
was told "PRE_DEPLOYMENT_CHECKLIST.md missing" with the file committed at its
root. A file of that name anywhere (`docs/…`) counted as found and was then
read from the root, where it is not.

Before: found only when the includes cover the root `.md`, or anywhere by
name. After: the root `PRE_DEPLOYMENT_CHECKLIST.md`, whatever the includes
say; `ignores.global` can still leave it out. What it must cover is unchanged
(build & tests, security, rollback / recovery).

This repository now commits its checklist: the release process it actually
follows — candidate, build and tests, security, GO from QA and the site on the
untagged candidate, tag, publish by the founder, and rollback by
`npm deprecate` and a new patch.

### Changed — Commit Size Control does not count generated files at all

Generated files count neither lines nor files; asciinema `.cast` recordings
join the built-in lockfile list, and `thresholds.git.commitSize.generatedFiles`
now ADDS to that list instead of replacing it. Test files count like any
other code. This repository declares its demo captures and recorded goldens
as generated, and CONTRIBUTING states the atomic-commit policy.

Self-audit of this repository: Commit Size Control — before 2 findings (4 of the last 10 commits oversized; no atomic-commit policy), after 1 (2 of the last 10: two hand-written commits of 534 and 597 lines, tests included; they leave the window as new commits land).
### ⚠️ BREAKING — laws about a running product run only where there is one; MD Footer Template is opt-in

Five laws had no `requires` and judged every TypeScript project; a CLI tool or
a library was asked for a CDN, an APM, an incident runbook, a launch checklist
and an Nx workspace. They are now gated by shared, exported requirements
(`src/utils/production-subject-requirements.ts`, `REQUIRES_NX_OR_ANGULAR` in
`src/utils/framework-requirements.ts`). **A project that does not meet the
condition no longer runs the law, and nothing is printed about it** — except
when its config names the law in `laws.severity` or `laws.notApplicable`, which
prints one ℹ️ line saying the law is requirement-gated (#428).

| law | not selected without | lawId |
|---|---|---|
| CDN and Caching Strategy | `REQUIRES_WEB_SURFACE`: a browser framework (`react-dom`, `@angular/core`, `vue`, `svelte`, `next`, `nuxt`, `astro`, `lit` …), a web build or hosting config (angular.json, next.config.*, firebase.json, vercel.json, netlify.toml, wrangler.toml, nginx.conf), or an HTML page outside test trees | `performance_664dd2d3` |
| Performance Monitoring Standards | `REQUIRES_PRODUCTION_SUBJECT`: a Node HTTP framework (`next`, `express`, `fastify`, `koa`, `hono`, `@nestjs/core`, `@hapi/hapi`), a Python one (fastapi, flask, django, starlette, aiohttp …), a web surface, a mobile app shell (`react-native`, `expo`, `@capacitor/core`, `@nativescript/core`), or a deploy target (Dockerfile, Procfile, compose, app.yaml, fly.toml, render.yaml, firebase.json, vercel.json, netlify.toml, wrangler.*, serverless.yml, Chart.yaml, a serverless deploy command) | `performance_351f896e` |
| Incident Response Protocol | `REQUIRES_PRODUCTION_SUBJECT` | `docs_cd2817cb` |
| Launch Readiness Checklist | `REQUIRES_PRODUCTION_SUBJECT` | `deployment_b1c8dba1` |
| NX Commands Only Policy | `REQUIRES_NX_OR_ANGULAR`: nx.json, `nx` / `@nx/workspace` / `@nrwl/workspace`, or `@angular/core` (an Angular project without Nx is still asked to use Nx) | `quality_f66318df` |

Pre-Deployment Checklist (MANDATORY) (`deployment_37c13d47`) asks its
authentication, benchmarking, health-check and production-logging clauses only
where `REQUIRES_PRODUCTION_SUBJECT` holds; the checklist, build, test and
security-scan clauses are asked everywhere.

**MD Footer Template (MANDATORY) is opt-in** (#436). A project that wants it
turns it on with `laws.severity: { "MD Footer Template (MANDATORY)": "warning" }`
(or its lawId `docs_5ef46de8`), or lists it in `laws.enabled`. Without that the
law does not run, and nothing is printed. MD Footer Footer Consistency stays on
by default.

If `includes.global` does not select Markdown (it names only source, e.g.
`src/**/*.ts`), the law finds no file to judge and says so ("N Markdown file(s)
exist, but the configured includes / ignores select none of them — nothing was
judged"), which makes the run partial. Give it the Markdown files with
`includes.byRule: { "md-footer-template-mandatory": ["**/*.md"] }`.

Laws selected per release-canary profile, before → after, and what leaves:

| profile | before → after | no longer selected |
|---|---|---|
| python | 97 → 92 | CDN, Performance Monitoring, Incident Response, Launch Readiness (no production subject); MD Footer (opt-in) |
| angular | 120 → 119 | MD Footer (opt-in) |
| ngrx | 131 → 130 | MD Footer (opt-in) |
| ionic | 150 → 149 | MD Footer (opt-in) |
| react | 134 → 132 | NX Commands Only (no Nx, no Angular); MD Footer (opt-in) |
| node | 77 → 71 | CDN, Performance Monitoring, Incident Response, Launch Readiness (no production subject); NX Commands Only (no Nx, no Angular); MD Footer (opt-in) |

Fast mode core before → after: unchanged, except that Launch Readiness
Checklist enters it where `REQUIRES_PRODUCTION_SUBJECT` holds (its own gated
group's 20% share), and the laws above leave it where they are no longer
selected. A CRITICAL `error` law that every project selects (no stack, no
`requires`) is now protected from the quota, so CI/CD Constitutional Tribunal
stays in the core: the share of the ungated universal group shrank with the
laws that moved to their subject, and it would have cut it as a side effect.

Self-audit of this repository, before → after: CDN and Caching Strategy 5
findings, Performance Monitoring Standards 3, Incident Response Protocol 3,
Launch Readiness Checklist 1, NX Commands Only Policy 1 → not selected;
Pre-Deployment Checklist 4 → 2.

### Changed — MD Footer Template is opt-in, and says when it judged nothing (#436)

The footer is a house convention, so the law is opt-in (`defaultEnabled:
false`): turn it on with a severity in `laws.severity` or in `laws.enabled`.
When no Markdown file is left to read — none in the project, or
`includes.global` that lists only code — it reports that nothing was judged
(and which case), never "No markdown files found in project". This
repository's config no longer enables it.

Self-audit of this repository: MD Footer Template — before 1 finding ("No markdown files found in project"), after not selected (opt-in, not enabled).
### Fixed — a checklist clause defers to an owning law the audit would not select (#428)

Pre-Deployment Checklist consults the law that owns each runtime concern.
That law was run even when the audit would not select it for the project
(its `stack` or `requires` unmet), so it inspected an absent subject, failed,
and the clause was reported. An owning law the audit would not select now
answers "satisfied", like a written `notApplicable`.

Self-audit of this repository: no change — the four owning laws are selected here, so they still run (measured).
### Fixed — Async Cache Single-Flight reads a check as a one-key get / has (#437)

The selection pattern matched `constants.set(` as `s.set(` (no left boundary
on the back-reference). In TS/JS a check is now a `get` / `has` with the key
as its only argument (the Map signature), so a file-backed API such as
`Cache.get(root, key, mode)` is not judged as an in-memory map.

Self-audit of this repository: Async Cache Single-Flight — before 1 finding (`src/core/auditing/audit-engine.ts`, a file-backed `AuditCache.get(…)` / `.set(…)`), after pass: 3 files read, 0 async check-then-store sites.
### Fixed — the audit run from git hooks and CI counts as running it (#434)

Constitutional Supremacy, Continuous Compliance and Pull Request Workflow
read one place each (package scripts, a `ruleofcode` dependency, scripts
named `precommit` / `prepush`). One shared probe, `auditInvocations`, now
reads package scripts, committed git hooks (`.husky`, `.githooks`, lefthook,
pre-commit, simple-git-hooks) and CI steps; comments, `echo` lines and step
titles do not count.

| law (self-audit of this repository) | before | after |
|---|---|---|
| Constitutional Supremacy Doctrine | 1 finding (no enforcement script) | pass (.husky/pre-commit, .husky/pre-push run the audit) |
| Continuous Compliance Doctrine | 1 finding (no enforcement tool) | pass |
| Pull Request Workflow Standards | 1 finding (missing precommit, prepush) | pass |
### Fixed — Pre-PR Quality Gates: GitHub and GitLab keep branch protection server-side (#435)

A github.com or gitlab.com remote is now a server-side protection host, as
bitbucket.org and Azure DevOps already were (inferred from the host, not
verified). The message is built from the violations; it printed "Missing "
with an empty list when branch protection was the only one.

Self-audit of this repository: Pre-PR Quality Gates — before 1 finding ("Missing branch protection configuration", message "Missing "), after pass (github.com remote).
### Changed — Strategic Document Updates: a CHANGELOG and an issue tracker are a status record

The status clause is met by a PROJECT_STATUS / STATUS / ROADMAP file, or by
a CHANGELOG together with an issue tracker (`bugs` in package.json, an Issues
URL in pyproject.toml, GitHub or GitLab issue templates). A project with
neither is asked, as before.

Self-audit of this repository: Strategic Document Updates — before 1 finding ("Missing PROJECT_STATUS.md file"), after pass (CHANGELOG.md + `bugs` in package.json + .github/ISSUE_TEMPLATE).
### Changed — Constitutional Compliance Headers: a repository-level license is enough

A LICENSE file at the root together with the `license` field in package.json
states the terms for every file; the law passes and says so. Without both,
the per-file headers, template and automation are judged as before.

Self-audit of this repository: Constitutional Compliance Headers — before 4 findings, after pass (LICENSE + package.json license MIT).
### Fixed — Pre-Deployment Checklist reads the dependency scan from the command

The security-scan clause read only script names (`audit`, `security`,
`snyk` …). It now also reads what package scripts and CI steps run (npm /
yarn / pnpm audit, pip-audit, safety check, snyk test).

Self-audit of this repository: Pre-Deployment Checklist — before 4 findings, after 3 ("Security vulnerability scanning not configured" is gone: `security-audit` runs `npm audit`, and so does the CI step).
### 🐛 Fixed — an Angular CLI project was told to add webpack limits it cannot write (#449)

Once the budget suggestion read angular.json correctly (#449), the two
Angular/Ionic projects of the QA matrix were told "Add maxAssetSize and
maxEntrypointSize in webpack configuration". An Angular CLI project has no
webpack config of its own — the CLI owns it, and the budgets live in
angular.json — so the advice could not be followed. The law still passed; only
the suggestion was wrong.

Before: the webpack suggestions were given to every Angular project without a
webpack config. After: only to a project that has one — a
`webpack.config.*` / `webpack.prod.*` at the root or under `config/`, or an
angular.json build through `@angular-builders/custom-webpack`, `ngx-build-plus`
or `customWebpackConfig`.

### ⚠️ BREAKING — Node 20 or later (#21)

`engines.node` is now `>=20` (was `>=16.0.0`). The old floor was already
untrue: a runtime dependency in 7.29.1's lockfile (`@inquirer/external-editor`)
declares `>=18`, and CI ran Node 20 only. Node 20 is now the floor because it
is the oldest line that both `glob` 14 (`18 || 20 || >=22`) and `minimatch` 11
(`20 || >=22`) support.

Node 20 is past end-of-life (2026-04-30, nodejs/Release `schedule.json`); 20
is the floor because it is the lowest version this release's dependencies
support, not a recommendation. Run a supported line — 26 (Active LTS) or 24
(Maintenance LTS) on 2026-11-21. Raising the floor is a separate decision.

On Node 18, npm warns `EBADENGINE` (for `ruleofcode`, `minimatch`,
`brace-expansion` and `lru-cache`) and installs anyway; with `engine-strict`
the install fails. Node 18 is unsupported and is not run in CI.

CI runs the whole gate (build, lint, format, jest, release canary, self-audit)
on Node 20, the declared floor, and on Node 26, the Active LTS line on
2026-11-21 (nodejs.org/dist/index.json; nodejs/Release `schedule.json`: v26
Active LTS since 2026-10-28). The required check `Constitutional gate` is now
a job that is green only when every Node version is. A test reads
package.json, the CI matrix and the lockfile, and fails when the lowest CI
version is not the declared floor, a CI step pins its own Node version, or a
runtime dependency declares an `engines.node` that refuses the floor.

### ⬆️ Dependencies — `glob` 10.5.0 → 14.0.6, `minimatch` 9.0.9 → 11.0.9 (#21)

No source change was needed: what RoC uses (`glob`, `globSync`, `sync`,
`glob.sync`; `minimatch(path, pattern, options)`; glob options `cwd`,
`ignore`, `absolute`, `dot`, `nodir`, `maxDepth`) behaves the same.
`npm audit --omit=dev` goes from two moderate advisories (GHSA-3g3m-2fjr-6pw4,
glob 9.0.0–14.0.1; GHSA-g3hv-75wg-m249, minimatch 7.0.0–11.0.0) to none. The
ranges start at the measured versions (`^14.0.6`, `^11.0.9`): `^14` alone
would admit 14.0.0, which is inside the advisory. 17 runtime packages leave
the tree and 2 come in (`@isaacs/nonrecursive-glob-match`, a newer
`balanced-match`).

Measured on Windows, so that a different file set cannot hide behind an
unchanged verdict (173 projects: 165 Next.js fixtures, the `_ng-outside`
fixture, saas-starter, commerce, create-t3-turbo, three read-only festrr
clones, and RoC's own develop tree; the audit cache off):

| what | result |
|---|---|
| every `glob`/`minimatch` call of `audit --json` recorded under 10.5.0 + 9.0.9 and under 14.0.6 + 11.0.9, same build | identical in 173/173 projects: 16,260 distinct glob calls (pattern, options, sorted result), 21,128 minimatch pattern+option pairs over 1,232,214 distinct (pattern, path) tests, and the same call counts |
| `audit --json` of develop's build vs this branch's build | byte-identical in 173/173 (no field stripped), same exit code in 173/173 |
| 307 glob-like literals (274 from `src`, 33 from the projects' configs) × 10,065 paths × 4 option sets, minimatch 9.0.9 vs 11.0.9 | 0 of 12,359,820 disagree |
| escaped forms from #451 (`weird\[1\]/**`, `a\{b,c\}`, `x\(1\)`, `\!keep`, …): minimatch, and glob `ignore` on a real tree | 0 of 780, 0 of 15 |
| read-only clones, `git status --porcelain` before and after every run | empty, unchanged |

The full set was measured on develop 1d24269. After develop gained #451
(a minimatch call for escaped brackets in config patterns), both
comparisons were run again on 9a2386b for the seven projects that are not
fixtures: call logs identical in 7/7 (478 glob calls, 856 minimatch
pattern+option pairs over 914,208 tests), audit JSON byte-identical in 7/7.

### 🔧 CI — `actions/checkout` and `actions/setup-node` v4 → v7 (#21)

`actions/checkout` and `actions/setup-node` go from v4 to v7 in both
workflows: v4 targets Node 20, which GitHub now forces onto Node 24 with a
warning on each job that uses them.

### 🐛 Fixed — a law that read none of its files was counted as a finding, not as judged nothing (#427)

Without `typescript`, No Focused Tests, Guard Function Has Production Caller,
Tsconfig Exclude Leaves Code Untyped and Independent Awaits Run Concurrently
said their files were NOT read — but the note counted as an ordinary finding.
The law was not in `scope.judgedNothingLaws`, so a run with them alone was
`compliance-with-warnings`, while Test Isolation Enforcement in the same state
made it `partial`.

One rule now, for every law, in one place: a result whose every finding is a
parser-unavailable note read none of its files — it judged nothing (failed,
score 0; `failed` or `partial` by severity, as for any law that judged
nothing). A law that also reads input without the parser and judged it says
so in the note ("the rest of what this law reads was judged") and is not
judged nothing; neither is a note beside a real finding, nor a file that did
not parse.

| law, no `typescript` | before | after |
|---|---|---|
| No Focused Tests · Guard Function Has Production Caller · Tsconfig Exclude Leaves Code Untyped · Independent Awaits (TS/JS only) | one finding: "… NOT read" | judged nothing |
| HTML Lang Declared (next.config) · Accessibility Linting (config script) · Capacitor Plugin Stub (test configs) · Independent Awaits / cache laws with Python read | the note, a finding | the note, a finding, ending "the rest of what this law reads was judged" |

Two more corrections, found by QA on the same fixtures:

- **TypeScript Strict Mode reads the `extends` chain without `typescript`.**
  Before: tsconfig.json alone — a project whose strict flags live in its base
  config got 14 "must be enabled" findings, all false, and no note (QA
  p478-tsstrict-extends). After: the chain is read as JSONC — relative paths
  and packages in `node_modules`, an `extends` array with later entries over
  earlier ones — and `target`, `moduleResolution` and `sourceMap` are judged
  as inherited too. A link that cannot be read is named ("… which could not
  be read — the inherited compiler options were NOT read …"), and a flag the
  files that were read leave unset is not judged; one set to `false` still is.
- **A not-read note names the files it means.** The default wording of the
  parser-unavailable note said "the .tsx/.jsx files" whatever was not read;
  the request-path reader (Independent Awaits, the cache laws) said it of
  `.ts` files (QA p478-awaits-py-ts). It now names their extensions, and the
  default is neutral ("the files this law parses").

### 🐛 Fixed — Dead Code Elimination judged words as dead code (#424)

| | before | after |
|---|---|---|
| `debugger` | the word anywhere in the file, strings and comments included | a `debugger;` statement |
| "commented code blocks" | `//` lines containing "function", "const" or "let" anywhere | `//` comments that hold a const/let declaration or a function header |
| "unreachable code after return" | a line starting with `return` (also `returnValue = …`) followed by a line at the same indent | a statement after a `return` in the same block (not a hoisted function or a type) |
| no loadable `typescript` | text scanned | "code file(s) were NOT read" — judged nothing |

### 🐛 Fixed — No Explicit Any / Non-Null, No Double Cast and Typed HTTP Boundaries read strings as code (#424)

| | before | after |
|---|---|---|
| No Explicit Any: `'AWS::Serverless::Function'`, `'value: any'`, `'run it! now'` in strings | weak type / `any` / non-null | not code |
| No Explicit Any: `{ keys: Object.keys(x) }` | a weak `: Object` type | a value, not a type |
| No Double Cast: "as unknown as" in a string (a law's prose) | a double cast | not code |
| Typed HTTP Boundaries: `http.get(` in a string (a law's prose) | an untyped call | not code |
| either law, no loadable `typescript` | text scanned | ".ts file(s) were NOT read" — judged nothing |

Real annotations, casts and non-null assertions in code are reported as before.

### 🐛 Fixed — Code Duplication Control compared text fragments, not functions (#432)

A "block" started on any line containing `=>` or `function` and ran to the
next balancing `}`, so it was the tail of whatever followed the last arrow —
a type member, a call-site fragment, a one-line idiom — and every string was
replaced with `STR`, so two tables of different messages were the same code.

| | before | after |
|---|---|---|
| what is compared | text from a line with `=>`/`function` to the next `}` | the block body of every function, method and arrow, from the TypeScript parse |
| strings | all normalised to `STR` | compared as written (numbers are still normalised) |
| comments | stripped by regex | not tokens |
| size floor | 50 characters | 5 lines and 50 tokens (`minDuplicationLines`, `minDuplicationTokens`); `minDuplicationBlockSize` still applies in characters |
| a copy inside a larger copy | reported again | reported once, with the larger copy |
| no loadable `typescript` | compared as text | ".ts/.tsx file(s) were NOT read" — judged nothing |

### 🐛 Fixed — Code Complexity Control measured text, not functions (#430)

The law found function bodies by brace matching over the source with only the
comments removed. An outer function was charged with every callback inside it;
an `if`, `?` or `{` inside a string or regex was counted and used for brace
matching; an expression-bodied arrow and a function returning an inline object
type were never measured. Now every function is read from the TypeScript
syntax tree and measured on its own body.

| | before | after |
|---|---|---|
| function complexity | brace-matched text, callbacks added to the outer function, strings counted | each function's own body from the syntax tree; strings, regexes and comments are not code |
| arrow with an expression body, inline object return type | never measured | measured |
| `maxFileLines` (300) | every line, comments and blank lines included | lines of code only |
| a data file (at most two functions) | held to `maxFileLines` | not held to it |
| "too many functions" (> 20) | reported when the file had ≥ 10 decision points | reported only when a function in the file is over the complexity limit |
| no loadable `typescript` | measured with the regex | ".ts/.tsx file(s) were NOT read" — judged nothing |

The finding now reads "(N code lines, max 300)". The set of decision points is
unchanged (`??` is still not one).

### 🐛 Fixed — Unit Test Quality read the async code a test keeps in strings (#424)

The async analysis of every test file ran over the raw text, so a test that
holds the code it feeds a detector as a string was told its promise chains
have no `.catch()`, could use async/await, mix `done()` with async, or use
`setTimeout` without fake timers.

| | before | after |
|---|---|---|
| `.then(`, `setTimeout(`, `done()`, `await` in a string or comment | an async finding | not code |
| the same in code | a finding | a finding |
| no loadable `typescript` | text scanned | "the async patterns of the N test file(s) were NOT read" |

The other Unit Test Quality checks (mocking, edge cases, HTTP calls) are
unchanged.

### 🐛 Fixed — a PARTIAL line said "passed" for laws that reported warnings

The judged-nothing line said "The other laws passed" and the narrowed line
"The selected laws passed" while some of those laws had reported warnings (a
run of this repository: 40 passed, 43 with warnings). When any law warned, the
line now gives the counts from `stats`:

```
⚠️  PARTIAL — 1 law(s) judged nothing (…). 40 passed, 43 reported warnings (not blocking); no compliance verdict.
⚠️  PARTIAL SCAN — 6 of 75 applicable laws ran (narrowed by laws.enabled). Of the selected laws 5 passed, 1 reported warnings (not blocking); no compliance verdict.
```

With no warnings the text is as before.

### 🐛 Fixed — an escaped bracket in an ignore pattern stopped excluding (#414)

The #414 normalisation turned every `\` into `/`, so `weird\[1\]/**` became
`weird/[1/]/**` and excluded nothing, in silence. `\` is both the Windows
separator and the glob escape; it is now read as an escape only where it
cannot be a separator, and as `/` everywhere else:

| `\` before | read as | example → normalised |
| --- | --- | --- |
| `]`, `}`, `)` (no path segment starts with one) | escape | `weird\[1\]/**` → unchanged |
| `[`, `{`, `(` whose matching closer is escaped later | escape | `a\{b,c\}`, `x\(1\)` → unchanged |
| `!`, `+`, `@` | escape | `\!keep` → unchanged |
| anything else | separator | `vendor\**` → `vendor/**` · `vendor\lib.js` → `vendor/lib.js` · `app\[slug]\[id]\page.tsx` → `app/[slug]/[id]/page.tsx` |

Glob semantics stay standard for `/` and `\` alike, so `app/[slug]/page.tsx`
— written with either separator — is a character class: it excludes
`app/s/page.tsx`, not the route `app/[slug]/page.tsx`. That was silent too.
Now, when a class segment of an `ignores.*` or `includes.*` pattern names a
directory or file that exists under that literal name where the pattern
points, the audit says so:

```
⚠️  ignores.global: 'app/[slug]/page.tsx' — '[slug]' is a glob character class and does not match the directory '[slug]' — write \[slug\] for the literal name.
```

The pattern is followed from the project root through its plain segments; a
class after a wildcard (`**/[slug]/**`) cannot be located and is not judged.
Before: `weird\[1\]/**` excluded nothing, and `app/[slug]/…` excluded a
different file without a word. After: the escape works, and the class is named.

### 🧹 Removed — a second, dead result printer that said "All constitutional laws passed!"

`AuditResultProcessor.displayResults` printed `✅ All constitutional laws
passed!` whenever `passed` was true — warnings, waivers or a law that judged
nothing included — and knew nothing of the verdict. No command called it;
only its own tests did. It is removed with its private helpers and those
tests, so the one printer left is the audit's own, which follows the verdict.
It was not exported from the package entry point.

### ⚠️ BREAKING — `compliance` and the victory art mean a clean pass; a law that judged nothing makes the run partial

A run of this repository listed 46 laws with violations at warning level, one
of them a law that judged nothing, then printed `CONSTITUTIONAL COMPLIANCE:
PASSED` and the victory art, and its JSON verdict was `compliance`. On screen
that is the unearned pass this tool exists to refuse.

Now `compliance` — and the art — is only the clean pass: no law failed, was
waived, reported warnings or judged nothing. The verdict is the first that
holds: `refused` > `failed` > `partial` > `compliance-with-waivers` >
`compliance-with-warnings` > `compliance`. One value; no information is lost,
because every list is in `scope`.

| run | verdict before | verdict after | console before | console after | exit |
|---|---|---|---|---|---|
| all laws passed, nothing waived | compliance | compliance | PASSED + art | PASSED + art | 0 |
| ≥1 law reported warnings, nothing waived | compliance | **compliance-with-warnings** | PASSED + art | **PASSED WITH WARNINGS — N law(s) reported warnings (not blocking)**, no art | 0 |
| ≥1 waiver (with or without warnings) | compliance-with-waivers | compliance-with-waivers | PASSED WITH WAIVERS, no art | unchanged | 0 |
| ≥1 law judged nothing, at warning/info severity | compliance (counted as a warning) | **partial** | PASSED + art | **PARTIAL — N law(s) judged nothing (…)**, no compliance verdict | 0 |
| ≥1 law judged nothing, at error severity | failed | failed | FAILED | FAILED | 1 |
| narrowed (allowlist, Pareto, categories) | partial | partial | PARTIAL SCAN | unchanged | 0 |

New JSON fields:

- `scope.warningLaws` — `[{ law, lawId }]`, the laws that reported warnings,
  sorted by `law`; its length is `stats.warningLaws`.
- `scope.judgedNothingLaws` — `[{ law, lawId }]`, the laws that found nothing to
  judge (`results[].judgedNothing: true`), sorted. They are never counted
  among the warnings, and they make `scope.partial` true.
- `stats.judgedNothingLaws` — their number.

The console lists the laws that judged nothing in their own block
(`◌ JUDGED NOTHING`) and counts them on their own summary line, apart from the
warnings. The exit code follows severity, as before. A consumer that keyed a
pass on `verdict === 'compliance'` should accept `compliance-with-warnings`
and `compliance-with-waivers` too, or read the lists.

### 🐛 Fixed — five more laws gave a weaker answer, and no note, without `typescript` (#427)

The rest of the class #427 found: when `typescript` could not be loaded, these
laws fell back to a second-best reading and said nothing. Now each says what
it did not read; with the parser nothing changes.

| law | before, no `typescript` | after, no `typescript` |
|---|---|---|
| HTML Lang Declared | an unread `next.config` counted as "no i18n": **"no _document and no i18n in next.config"**, possibly false | "… the next.config file(s) were NOT read … whether i18n sets <html lang> was not judged" |
| Accessibility Linting Enforcement | an ESLint config script it could not parse counted as "no jsx-a11y preset": **"rules missing"** | "<config>: … the ESLint config script(s) were NOT read … whether they enable the jsx-a11y preset was not judged" |
| TypeScript Strict Mode | an `extends` chain not followed; the flags read from `tsconfig.json` alone, silently | the same check, plus "tsconfig.json extends …: … the inherited compiler options were NOT read … the strict flags were read from tsconfig.json alone" |
| Inject Over Constructor DI | constructors counted by a regex | "… the N Angular file(s) were NOT read", no count; a file that does not parse is named as not read |
| Test Documentation Requirements | test titles read by a regex | "… the N test file(s) were NOT read" — judged nothing |

Two more corrections of the same notes:

- A law that judged nothing is headlined by its own note. Its summary was
  computed from defaults, so Test Isolation Enforcement read "poor
  setup/teardown isolation" over files it had not read. The message of every
  judged-nothing result is now the note that says so.
- The note names the files that were not read: "the .ts file(s) were NOT read",
  not ".tsx/.jsx" for every file (No Focused Tests on 714 `.ts` tests, and every
  law that parses through the same reader).

### ⚠️ BREAKING — the Next laws walk one module graph, as Next sees the code (#287)

The Next laws that follow imports carried two static import graphs: one for
**Next Heavy Lib In Client Graph** and **Next Client Props Serializable**, one
for **Next Server Only Boundary**, **Next Client Env Public Only** and **Next
Public Env Is Build Time**. They resolved the same import differently, so a
client law and a server law could reach opposite conclusions about the same
code. There is now one graph (`next-module-graph.ts`, entries in
`next-entries.ts`). The rule it follows: resolve the way Next and its bundler
do; what cannot be read is reported as not read (the law is partial), never
passed in silence.

What differs between the laws is a parameter of the walk: which calls are
edges (point a, below) and whether a boundary module is part of the result
(Heavy Lib and Client Props keep it as a node without edges, as before; the
other three leave it out, as before).

| # | shape | before | after |
|---|---|---|---|
| a | `require('x')` (the bundler puts it in the same chunk) | an edge only for Client Env, Server Only, Public Env | an edge for every graph law |
| a | `import('x')` (a chunk of its own) | an edge only for Client Env, Server Only, Public Env | also for Client Props (a Server Component loaded that way still passes its props across the boundary); still not for Heavy Lib (a lazy chunk is not first-load JavaScript — it is the remedy that law recommends) |
| b | workspace package linked through `node_modules` | Heavy Lib, Client Props: a package, not walked — its code was never judged | walked as first-party code |
| c | `paths` in `jsconfig.json` (no tsconfig) | Heavy Lib, Client Props: `@/x` taken for a package, nothing walked, nothing said | read |
| d | bare package that is not installed | Heavy Lib, Client Props: a package, silent (Heavy Lib still matched the name) | not read; Heavy Lib still names a heavy one |
| e | first-party `.d.ts` | Heavy Lib, Client Props: skipped in silence | the `.js` beside it is read; with none, not read |
| g | `tsconfig.json` that cannot be parsed, or whose `extends` is missing | the server laws used default options in silence; Heavy Lib, Client Props stopped at every import | named as not read by every law; what resolves without it is still read |
| zh | relative import that leaves the audited root | Heavy Lib, Client Props: walked outside the root | not read |
| 8 | package.json `imports` (`#x`) | the server laws cut the specifier at `#` and reported it not read | resolved |
| 10 | tsconfig `moduleResolution` that ignores `exports` | the server laws could not resolve an `exports`-only subpath: not read | bundler resolution, as Next: resolved |
| 13 | alias or `baseUrl` path no config maps | Heavy Lib, Client Props: taken for a package, silent | not read |
| 9 | `.glsl` import | Heavy Lib: not read; the server laws: an asset | an asset (no imports to walk) |
| 11 | client entries | Heavy Lib: `'use client'` + Pages Router pages; the server laws: `'use client'` + `instrumentation-client` | all three, for every client law; what a page's `getServerSideProps` / `getStaticProps` / `getStaticPaths` alone uses is not client code |
| 12 | server entries | Client Props: special files of both `app/` and `src/app/` | the router Next reads (`app/` over `src/app/`); Server Only rule 2 also starts at `_app`, `_document`, `_error` |

What you may see:

- **more "not read"** where the project is not installed (no `node_modules`)
  or a config cannot be read: Heavy Lib and Client Props now say so where they
  used to pass in silence;
- **more findings** where workspace packages are linked into `node_modules`
  (Heavy Lib, Client Props now read their code) and in Pages Router apps
  (Client Env and Server Only rule 1 now walk from each page);
- Server Only rule 2 no longer reports a module that a Pages Router page
  bundles for the browser: rule 1 reports it, as it reports any client module.

Measured on the #287 fixture set (165 fixtures, 29 verdicts that 7.29.1 got
wrong on purpose; `develop` before this change is identical to the 7.28.1
baseline on every fixture): all 29 now give the verdict Next's behaviour calls
for (judge287: FIXED 29, STILL 0, CHANGED-OK 12, OTHER-LAWS 22).

Three verdicts the old fixtures expected change, each as decided
(judge287 REGRESSION 3; the fixtures are being updated):

- `nc-heavy-neutral-require`: Heavy Lib now names `moment` that a client
  module loads with `require()` (point a; the case recorded the old limit);
- `ng-pages-router`: the helper a Pages Router page bundles is reported by
  Server Only rule 1, not rule 2 (point 11);
- `nc-heavy-green-subpath`: `lodash/max`, not installed in the fixture, is
  reported as not read (point d).

Fourteen verdicts on four cases whose expectation was 7.29.1's own behaviour
changed and were reviewed against the rule (judge287 REVIEW 14): a relative
import that leaves the root is not read (`ng-outside-root`, point zh), a
`.glsl` import is an asset (`ng-asset-glsl`, point 9), and an unreadable
tsconfig is named by every graph law (`ng-extends-missing`,
`ng-tsconfig-broken-relative`, point g).

On three installed public Next apps (`nextjs/saas-starter`,
`vercel/commerce`, `t3-oss/create-t3-turbo`) no verdict and no message
changed before point a; in create-t3-turbo the Heavy Lib walk now reaches 16
modules instead of 12 and the Client Props walk 26 instead of 11, the
difference being workspace-package code.

### 🐛 Fixed — without `typescript`, two testing laws judged by a regex and said nothing (#427)

`CodeText.codeOnly` (the code of a file, without its comments and strings) fell
back to a regex when no `typescript` could be loaded. The regex reads a string
in a test as code, so **Test Isolation Enforcement** (error severity) failed a
project that passes with the parser — the verdict depended on the machine, and
nothing said the files had not really been read.

Now `codeOnly` throws instead of guessing, and the two laws that reach it check
for the parser first:

| | before, no `typescript` | after, no `typescript` | with `typescript` |
|---|---|---|---|
| Test Isolation Enforcement | judged by the regex, silently | "could not load the 'typescript' package … the N test file(s) were NOT read" — judged nothing | unchanged |
| Test Data Management | judged by the regex, silently | the same note — judged nothing | unchanged |

A judged-nothing law fails at error severity and makes the run partial at a
non-blocking one. `typescript` resolves from the project or from RoC itself, so
this shows only where neither has it.

### 🐛 Fixed — an ignores entry written as a Windows path, an absolute path, with `./` or a trailing slash matched nothing (#414)

`ignores.*` patterns were passed to the matcher as written, while the paths
they are matched against are project-relative with forward slashes. minimatch
reads `\` as an escape, so `vendor\**` never matched `vendor/lib.js`; `./vendor/**`,
`vendor/` and an absolute path never matched either. Nothing said so: the files
the entry was meant to exclude were still judged.

Every `ignores.*` and `includes.*` pattern (`global`, `tests`, `build`,
`design`, `byRule`) is now brought to one form when the config is loaded, so
every reader of it sees the same thing: `\` → `/`, a leading `./` dropped,
`dir/` → `dir/**`, an absolute path inside the project made relative to it
(a leading `!` is kept). An absolute path outside the project cannot match a
project file; it is left as written and the audit warns:

```
⚠️  ignores.global: '<path>' is an absolute path outside the project (<root>) — it matches nothing. Write it relative to the project root.
```

| `ignores.global` | `vendor/lib.js` excluded, before | after |
|---|---|---|
| `vendor/**`, `**/vendor/**` | yes | yes |
| `./vendor/**` | no | yes |
| `vendor/` | no | yes |
| `vendor\**`, `vendor\lib.js` | no | yes |
| `<project root>/vendor/**`, with `/` or `\` | no | yes |
| an absolute path outside the project | no, silently | no, with the warning |

The same forms in `includes.*` now match too (`\` and a bare directory already
did). A config that relied on one of these entries doing nothing will see the
files it names excluded (or, for includes, included).

### Internal — no tool attribution in the project's public text

The founder's rule: no generated-with/by line naming the tool and no
Co-Authored-By trailer in a commit, a pull request, an issue, a comment, a
release note, the code or the docs. Agent tooling appends these lines by
default, so the rule is held by machinery:

- `scripts/public-text-guard.js` finds both, line by line, in files, stdin or —
  with `--scan owner/repo` — every release, issue, pull request and comment
  through the GitHub API. A scan reports how much it read and fails (exit 2) if
  a page cannot be read.
- The workflow `Public text guard`: the check "No tool attribution in the pull
  request" runs on every PR to master and develop (opened, edited, pushed),
  with the script from the base branch; issues, comments and releases are
  checked when written (non-blocking, the text is already public); and a
  weekly scan.
- `commit-trailer-guard.test.ts` also refuses the attribution line in any
  commit, merges included, with no exceptions (the history had none), and a
  new test refuses it in any tracked file.

## [7.29.1] - 2026-11-20

**The first release on npm after 7.28.1.** 7.29.0 was tagged but never
published to npm. Upgrading from 7.28.1 brings this release's fix (#405) and
everything in [7.29.0] below, including one **breaking** change. No law added
or removed (265). The JSON contract keeps its shape. Closes #405.

### ⚠️ BREAKING (from 7.29.0) — Error Handling Standards, turned on, judges nothing (#390)

Its five checks were measured on six real projects at 0–33% precision and
removed. The law stays in the registry (265 laws), so a key or a waiver that
names it is still valid, and it stays opt-in. Turned on (`laws.severity` or
`laws.enabled`), it reports a failure with score 0, at the severity the config
gives it:

```
Error Handling Standards has no verified detection path in this version — this law judged nothing. Its five checks were measured on real projects at 0–33% precision and removed (#390); waive it or leave it off until a check is verified.
```

**Breaking** for a config that turned it on: the findings it used to report
(nearly all of them false) are replaced by this single failure. A config that
left it off, or waives it, sees no change. The measurement, the known limit
and the removed suggestions are in [7.29.0].

### Also from 7.29.0

- **#385:** a finished audit no longer stalls on exit. It sets the exit code
  and ends on its own, with an unref'd 10 s backup timer.
- **#399:** a waiver of an opt-in law that only `laws.enabled` turns on is
  reported in `scope.waivedLaws` and on the console.

### 🐛 Fixed — a reader that closed the pipe early turned a failed audit into exit 0 (#405)

The CLI exited with a hard-coded 0 on a broken pipe (an `EPIPE` on write, or
`SIGPIPE`). So `ruleofcode audit --json | head` under `set -o pipefail` passed a
failed audit: PIPESTATUS `0 0`, measured on 7.28.1 and the 7.29.0 candidate in
200 of 200 runs where the reader stopped early. Read to the end, the same runs
exit 1.

A broken pipe now only stops the writing. The command runs to its end and
exits with its own code, whether or not anyone read the output: a failed audit
1, a passing audit still 0. This holds for `--json` on stdout, for the human
output on stderr, and for text mode, which keeps writing after the pipe broke
without a crash. `laws` keeps exiting 0. `init`, `recommend` and
`reinstall-hooks` now end with their own code instead of 0.

Two side effects, both fail-closed:

- An `EPIPE` that is not on stdout or stderr (for example on a child process's
  stdin) used to exit 0 silently. It now ends the process the way Node does:
  a stack trace on stderr and exit 1.
- Any other uncaught error now exits 1 (Node's default) instead of 7. Exit 7
  came from the old handler rethrowing the error; it was never a documented
  code.

Measured on Windows (Node 24); Linux is covered by CI. macOS was not measured.
Node ignores `SIGPIPE` on both POSIX systems unless a listener is installed,
so a write fails with `EPIPE` there too. That is an assumption for macOS.

## [7.29.0] - 2026-11-19

No law added or removed (265). The JSON contract keeps its shape. Closes #385,
#390 and #399.

### Fixed — a finished audit no longer stalls on exit (#385)

A finished `ruleofcode audit` sometimes stalled at 0 CPU, with its stdout and
stderr pipes still open, inside `process.exit()`, which it called right after
the last write. QA measured both ways of ending in an interleaved A/B on
7.28.1, on the same fixture, without instrumentation:

| How the audit ends | Stalls |
|---|---|
| `process.exit(exitCode)` after the last write (≤ 7.28.1) | 9 of 60 |
| `process.exitCode = exitCode`, the process ends on its own | 0 of 60 |

The difference is p ≈ 0.003. The audit now sets `process.exitCode` and
returns. The exit code is unchanged.

A process that ends on its own waits for every open handle, so a handle left
open anywhere would keep it alive forever. A backup timer covers that. It is
unref'd, so it never keeps the process alive itself. After 10 s
(`EXIT_BACKUP_MS`) it exits with the same code, and it waits again while
stdout/stderr still hold unwritten data, so a slow reader is never cut short.
In that case the exit comes 10 s late; it does not hang. QA measures the time
to exit in the acceptance runs.

**What is not shown:**
- Why `process.exit()` stalls on Windows with the pipes still open.
- That the stall is gone. 0 of 60 rules out only a stall rate above roughly
  5%. The acceptance is 600 audits on the candidate, at least 300 of them with
  a large output, interleaved, plus a closed stdout.

The other `process.exit` calls in `src/cli` (`laws` with a non-zero code,
`recommend`, `reinstall-hooks`, the help and parse-error paths) are not the
same case (a large output to a pipe followed at once by `process.exit`) and are
unchanged.

### Fixed — a waiver of an opt-in law that the allowlist turns on is reported (#399)

A `laws.notApplicable` waiver of an opt-in law that only `laws.enabled` turns
on removed the law from the run and turned a failing run into an exit-0
partial one. Nothing reported it: the law was not in `scope.waivedLaws`, and
the console printed no waiver block. `scope.waivedLaws` was computed against
the open selection (no allowlist), and such a law is not in it. A waiver that
removes a law from **this run's** selection is now listed too, once per law,
so the console block, the PARTIAL line ("…; 1 waived") and the JSON agree.
`applicableBeforeWaivers` is `applicableLaws + waivedLaws.length`, so
M₀ = M + W still holds. `applicableLaws` and the liveness floor are unchanged.

| Config | 7.28.1 | 7.29.0 |
|---|---|---|
| allowlist names an opt-in law, no waiver | failed, exit 1, `waivedLaws: []` | unchanged |
| the same + a waiver of that law | partial, exit 0, `waivedLaws: []`, no line | partial, exit 0, the law in `waivedLaws` with its reason, the waiver block printed |
| opt-in law turned on by `laws.severity` + waiver | listed once | unchanged |
| an ordinary law in the allowlist + waiver | listed once | unchanged |

### ⚠️ BREAKING — Error Handling Standards has no verified check; turned on, it judges nothing (#390)

Once #369 (7.28.0) let Error Handling Standards see source files, its five
checks could be measured. Each was a whole-file pattern match. A random sample
of each (seed recorded) was labelled on six real projects, three private and
three public (angular-realworld-example-app, node-express-realworld-example-app,
ionic-conference-app). The labelling criteria were written before the samples
were read. A check stays only at ≥ 80% true on ≥ 10 findings:

| Check | Findings | Sampled | True | Precision | What the false ones were |
|---|---|---|---|---|---|
| critical areas missing try/catch | 127 | 12 | 2 | 17% | an await that returns to its caller (the error propagates on purpose); a subscribe with an error handler, flagged because the file has no `try {` |
| error logging | 337 | 12 | 0 | 0% | the error turned into UI state, or rethrown; fixtures that only throw |
| user-friendly messages | 3 | 3 | 0 | 0% | a status code in a comment; a value of a union type |
| HTTP error handling | 107 | 12 | 0 | 0% | a repository that returns its promise or observable to the caller |
| Observable error handling | 23 | 12 | 4 | 33% | router, service-worker and auth-state streams, which do not error; services with no subscribe |

All five are removed. The law stays in the registry (265 laws), so a key or a
waiver that names it is still valid. It stays opt-in, as it has been since
7.28.0. Turned on (`laws.severity` or `laws.enabled`), it does not pass a
project it did not judge (#369). It reports:

```
Error Handling Standards has no verified detection path in this version — this law judged nothing. Its five checks were measured on real projects at 0–33% precision and removed (#390); waive it or leave it off until a check is verified.
```

That is a failure with score 0, at the severity the config gives it.
**Breaking** for a config that turned it on: findings it used to report
(nearly all of them false) are replaced by this single failure. A config that
left it off, or waives it, sees no change. The two suggestions it printed
without a finding (a global error handler, error boundaries) are gone with the
checks. The Python HTTP-guard helper that only this law used is removed.

**Known limit, not "there are none".** Of the 51 findings reviewed across the
five checks, 6 were true, all from the two checks that had any (2 of 12 and 4
of 12). All 6 have one shape: a component subscribes to a service method that
returns an HTTP observable, with no error handling. The two public Angular
apps above have that shape in at least 7 places (a rough count, not checked one
by one). A narrow check for the same request subscribed in the same expression
(`http.get(…).subscribe(…)` with no error handler) was defined before it was
measured and found 0 times in the six projects, so it could not be verified
either. From 7.29.0 the law does not see that shape at all. Finding it needs
following the observable from the service into the component across files,
which would be a new detector with its own measurement.

The labels were reviewed independently by QA: 0 disagreements in the 24
findings of the two checks with true findings. The narrow check was also 0 by
QA's own detector.

## [7.28.1] - 2026-11-19

A patch: no law added or removed (265), no change to the JSON contract. Closes
#392 and #394.

### Fixed — a waiver of an opt-in law that is not enabled is named (#392)

A `laws.notApplicable` entry for an opt-in law that the config does not turn on
waives nothing, because the law does not run anyway. It was correctly left out
of `scope.waivedLaws`, but nothing said so: a config with 15 entries reported 14
waived, and the 15th was not named. It now gets the same line as a waiver of a
stack- or requirement-gated law:

```
ℹ️  laws.notApplicable: '<law>' is opt-in and not enabled in this config (it runs only when laws.severity gives it a severity or laws.enabled names it) — the waiver is redundant here.
```

`scope.waivedLaws`, the verdict, the exit code and Config Integrity Guard are
unchanged: the line is information, like the other "redundant here" lines.
Measured on a consumer's config with 15 entries, one of them the now-opt-in
Error Handling Standards:

| | 7.28.0 | 7.28.1 |
|---|---|---|
| Total Laws Checked | 115 | 115 |
| `scope.waivedLaws` | 14 | 14 |
| the 15th entry | not mentioned | named, "redundant here" |
| verdict / exit | failed / 1 | failed / 1 |

### Fixed — the hook laws recognise CI systems that do not set `CI`

Since 7.28.0 (#380), a committed `.husky/` hook counts only when git runs it.
In a CI checkout, where hooks are not installed by design, the two hook laws
judge the committed configuration instead. A CI checkout was recognised only
by `CI` (or `HUSKY=0`), so Jenkins, Azure Pipelines, TeamCity and AWS
CodeBuild, which document no `CI` variable, failed Git Hooks Standards and Git
Hook Compliance in every build. A registry of CI signals now also reads each
platform's own documented variable: `GITHUB_ACTIONS`, `GITLAB_CI`,
`BITBUCKET_BUILD_NUMBER`, `CIRCLECI`, `TRAVIS`, `BUILDKITE`, `JENKINS_URL` or
`BUILD_TAG=jenkins-…`, `TF_BUILD`, `TEAMCITY_VERSION` and `CODEBUILD_BUILD_ID`.
The documentation for each one is linked in `tests/utils/ci-environment.test.ts`.
Measured on a clean clone with `.husky/` committed and no hooks installed:

| Environment | 7.28.0 hook laws | 7.28.1 hook laws | failed laws, 7.28.0 → 7.28.1 |
|---|---|---|---|
| no CI variable (a developer's clone) | FAIL, FAIL | FAIL, FAIL | 51 → 51 |
| `CI=true` (GitHub Actions, GitLab, …) | PASS, PASS | PASS, PASS | 49 → 49 |
| `JENKINS_URL` / `BUILD_TAG=jenkins-…` | FAIL, FAIL | PASS, PASS | 51 → 49 |
| `TF_BUILD=True` (Azure Pipelines) | FAIL, FAIL | PASS, PASS | 51 → 49 |

Total Laws Checked: 78 → 78 in every row.

### Changed — public text

- README (#394): the tests badge is the CI status instead of a hand-written
  count. "Only where `@angular/core` is declared" now gives 21 (it said 19),
  and a test checks it against the registry. The canary block shows the real
  line format for all six profiles (python, angular, ngrx, ionic, react, node),
  without counts that change with every release; a test fails if a profile is
  missing or a count comes back.
- npm description and keywords name the six stacks: Angular, React, Next.js,
  Ionic/Capacitor, Node/TypeScript and Python (#397).
- README opens with a recorded run of 7.28.0 from npm. The files to reproduce
  and check it are in `docs/demo/` (#396), and the 7.8.1 → 7.9.1 history is in
  `docs/history/` (#395). Neither is in the npm package.

### Internal

- Independent Awaits: tests pin two awaits in one expression in Python and
  TypeScript. `(await a(x)) op (await b(y))` is a finding; `await f(await g())`
  is not; a marker with a reason on the line keeps it; a marker without one does
  not. The law itself is unchanged.
- The repository's own hooks no longer print a hand-written version (they said
  v7.22.0). A test fails if one comes back.

## [7.28.0] - 2026-11-19

The rest of the same incident and what the 7.27.0 wave found on the way: git
safety (an inherited `GIT_DIR`, hooks that never ran), the engine's narrowing and
floor, a Pareto core that was a hardcoded list, and nine more laws. Closes #362,
#363, #364, #365, #366, #367, #369, #370, #371, #372, #373, #374, #375, #376,
#377, #379, #380, #381, #382, #383, #384, #387, #388, #391; #361 (the umbrella) closes
with them. #385 (two audit stalls under load, not reproduced in 283 later runs)
stays open as observed; #390 (Error Handling Standards, opt-in for now) stays open
until its detection paths are fixed.

### ⚠️ BREAKING — git: child processes no longer inherit `GIT_DIR` (#372)

A git hook sets `GIT_DIR`; in a linked worktree it points at `.git/worktrees/<n>`.
RoC started git, husky and npm with the inherited environment, so an audit run
from a hook against another directory read **that** repository's history and tags
(Branch Governance, Feature Branch Protection, Commit Size Control and Semantic
Versioning judged the wrong repository), and `init` **wrote** `core.hooksPath`
into it — silently switching off every hook of the other repository while the
target's own hooks never ran. Every child process now starts in the target
directory without the repository-locating `GIT_*` variables (`git rev-parse
--local-env-vars`, plus `GIT_NAMESPACE`). **What changes for you:** `GIT_DIR` /
`GIT_WORK_TREE` / `GIT_INDEX_FILE` can no longer point RoC at a repository.

`init` fails closed: it prints "installed successfully" only when the target's
own hooks directory holds every enabled hook, refuses hooks outside a git
repository, and a failed init exits 1 (it exited 7 on an error, and succeeded
with inactive hooks). `reinstall-hooks` checks the same.

### ⚠️ BREAKING — a committed hook counts only when git runs it (#380)

Git Hook Compliance and Git Hooks Standards called a hook active when
`.husky/<hook>` existed, whatever `core.hooksPath` said — so a checkout where no
hook could run passed. A hook is now active only when git runs it in this
checkout (git resolves the hooks path; with husky 9 the user script must exist
too). **What to do:** run `npx husky` in a developer checkout whose committed
hooks are not activated. In a CI checkout (`CI` set, or `HUSKY=0`) it is not a
finding: the verdict says only the committed configuration was checked.

### ⚠️ BREAKING — Pareto core derived per stack and per gate (#383, #388)

`paretoMode: true` / `--mode=fast` ran a hardcoded list of 27 laws (10.5% of
the registry, no Python law). The core is now derived from each law's fields,
for each stack and each `requires` gate: about 20% of every group, ranked by
severity, priority, then SACRED, then CRITICAL SECURITY at `error`, then laws
without a gate. SACRED laws and CRITICAL SECURITY laws at `error` are always in.
A ratchet test keeps the core's share of the applicable laws in [15%, 25%] for
six project profiles:

| Profile (canary fixture) | 7.27.0 | 7.28.0 |
|---|---|---|
| python | 13 / 96 (13.5%, no Python law) | 19 / 96 (19.8%) |
| angular | 21 / 119 (17.6%) | 26 / 119 (21.8%) |
| angular + NgRx | — | 28 / 130 (21.5%) |
| ionic | 21 / 149 (14.1%) | 32 / 149 (21.5%) |
| react | 21 / 133 (15.8%) | 28 / 133 (21.1%) |
| node | 20 / 76 (26.3%) | 17 / 76 (22.4%) |

The core has 48 laws: universal 12, typescript 5, frontend 24, python 7. Fast
mode keeps the four SACRED TypeScript laws and API Security Standards; Absolute
Zero Tolerance Doctrine and Jest Unit Test 100% Coverage Mandate run in a full
audit only (all seven would put a TypeScript project's core at 26%, 20 of 76).
In the frontend group Next Server Only Boundary and No Test-Only Leakage
(SECURITY at `error`) take the places of Internationalization (i18n) Compliance
Policy and Observable Cleanup Requirements. A run in Pareto mode stays PARTIAL,
never a compliance verdict.

### ⚠️ BREAKING — the liveness floor only goes up (#371)

The default floor took its count from `config.project.type` while the selection
used the detected type. It now takes the larger of the two counts. `project.type:
"generic"` on a Python project: 61 → 98 stack-applicable laws, floor 16 → 25.
**What changes for you:** a project that selects 16–24 laws under such a config
is now refused. Set `laws.minLawsChecked` explicitly to what you mean, or fix
`project.type`, or run a full audit.

### ⚠️ BREAKING — narrowing by `categories` is partial (#370)

`categories` (a constructor option, not a CLI flag) printed COMPLIANCE over a
subset and skipped waivers, the opt-in rule and the meta-gates. It now narrows
the normal selection: waivers, the opt-in rule and the meta-gates apply, and
fewer laws than apply is PARTIAL (`narrowedBy: 'categories'`). A TypeScript
fixture narrowed to one category: 29 of 29 COMPLIANCE → 29 of 78 PARTIAL.

### ⚠️ BREAKING — seven checks tested a file name without its extension (#369)

`getBasename` returns the name without its extension; ten places tested it for
one. Bundle Size Optimization now sees `loadChildren` (a false "Heavy
dependencies … without lazy loading" is gone). NgRx RxJS Operators Selection
Mandate sees `*.effects.ts`. `*.old.*` templates are skipped. Three sites are
unreachable from any registered law (fixed in place and documented as dead
code), and one filter was redundant (removed). A guard test forbids an extension
check on a `getBasename` result.

Two laws that had read nothing were measured on real code once they could see it:

- **TODO Management Standards** now reads code, and a TODO is an upper-case tag at
  the start of a comment's text, in the file's own comment syntax: `TODO:`,
  `TODO(x):`, `TODO (Sprint 10):`, `FIXME:`, `HACK:`, `XXX:`. A marker in the middle
  of a sentence, in inline code, or a bare `TODO` without a colon is not read;
  NOTE is not a marker. The first version of this fix matched "note" anywhere —
  CSS classes like `.cov-note`, `note: true`, prose — and every finding it gave on
  the projects we measured was false: 13 → 0 and 202 → 0 on two real projects,
  66 → 1 on a third (the one left is a real `TODO(tokens):`). On RoC's own code the
  rule went from 3 correct of 10 to 3 of 3 before this release.
- **Error Handling Standards is off by default.** Its five detection paths were
  measured at 0 of 42 correct on real code. In 7.27.0 and earlier it reported
  findings that were not real. It is opt-in now (`defaultEnabled: false`): not
  selected and not counted unless `laws.severity` names it, and the detector is
  unchanged until #390 lands. Re-enable it with `laws.severity` if you want it
  anyway. Every project that does not name it runs one law fewer: the canary profiles
  go python 98 → 97, angular 121 → 120, angular + NgRx 132 → 131, ionic 151 →
  150, react 135 → 134, node 78 → 77.

### ⚠️ BREAKING — smaller ones

- **Request-path laws leave one-off scripts out (#384).** Independent Awaits
  (#351), Document Read Once, Count With An Aggregation and the N+1 check skip
  `scripts/`, `migrations/`, `alembic/`, `bin/`, `seeds/`, `seeders/`,
  `management/commands/`; the skipped count is in `metrics.oneOffScriptsSkipped`.
- **Dependency gates read what git publishes (#381).** `requires.anyDependency`,
  `allDependencies` and `anyPythonDependency` ignore a git-ignored manifest.
- **The programmatic constructor reads the config like the CLI (#387).** Without
  a config object it used a loader that dropped `project.type` when the file had
  no `laws`/`ignores`/`includes` section; it now uses the same loader as the CLI
  (and its defaults: `parallel`, `scoring`, `ignores.global`).
- **Six NgRx laws lose "(SACRED LAW)" from their title (#388).** Their category
  was always `FRAMEWORK`; the title promised a protection they did not have. The
  old titles still resolve as config keys. Their `urlSlug` changes (e.g.
  `ngrx-store-pattern-mandate-sacred-law` → `ngrx-store-pattern-mandate`).

### Added — nine laws, all `warning` by default

Each is selected only where its subject is in the files git publishes, judges
exactly those files and reports `file:line`. A law that read files and found
nothing to judge passes with its counters (message and `metrics`) and says what
it does not see; "nothing was judged" is reported only when it could read no file
or its parser did not load, and never as a violation.

| Law | Article | Issue |
|---|---|---|
| Proxy Target Keeps Origin Host — `new URL(path, ORIGIN)` / `urljoin` sends a `//host` path, with the secret header, to another host | XXIII.23.10 | #362 |
| Worker Public URLs Declared — `wrangler.toml/json(c)` without explicit `workers_dev` / `preview_urls`; `secret put` before the first deploy | VIII.8.13 | #363 |
| Hosting Rewrite Region Matches Deploy — a hosting rewrite pins a region the same repository does not deploy to | VIII.8.14 | #364 |
| Test Builds Use Own Firebase Config — non-release builds bundle the production Firebase project with Messaging auto-init on; the finding lists the accepted fixes | XXIII.23.11 | #365 |
| Job Definition Dumps Masked — scheduler/job definitions saved to a file or CI log with secret headers | XXIII.23.12 | #366 |
| Test Rig Keeps Route Guards — a test re-declares an app route by hand and drops its guards | VII.7.40 | #367 |
| Database Read Cache Safety — an in-process cache of database reads without TTL, bound, write invalidation, or inside an auth check | VI.6.30 | #373 |
| Async Cache Single-Flight — store-after-await, or a stored future that is not removed when it fails | VI.6.31 | #374 |
| Perf Harness Matches Production — DEBUG logging in a perf harness; a single-thread profiler with a threaded client (gRPC and similar) | VII.7.41 | #376, #377 |

Latency Budget Harness Realism (#355) also asks a burst harness for its repeated
reads (total, distinct, repeat ratio per collection) (#375). #364 is closed for
one repository: a rewrite whose service is deployed from another repository is
not seen (RoC reads one repository).

**Total Laws Checked, 7.27.0 → 7.28.0:**

| Simulated consumer | 7.27.0 | 7.28.0 |
|---|---|---|
| canary: python | 98 | 97 |
| canary: angular | 121 | 120 |
| canary: angular + NgRx | 132 | 131 |
| canary: ionic | 151 | 150 |
| canary: react | 135 | 134 |
| canary: node | 78 | 77 |
| a FastAPI service with a document database (real project, own config) | 94 | 96 |
| an Ionic/Angular Nx app (real project, own config) | 153 | 156 |
| a static web front end (real project, own config) | 66 | 65 |

The canary counts are `laws=` from `node scripts/release-canary.js --tarball`, run
against the published 7.27.0 tarball and against this release's tarball: the nine
new laws are all gated and none of the canary fixtures holds their subject, so the
one law fewer is Error Handling Standards going opt-in (#390). On
the three real projects (full audits, own config, read-only) the new findings are
the hook laws (#380: none of the three checkouts has its committed hooks
activated) and Test Rig Keeps Route Guards with three findings on the Ionic app.
TODO Management Standards gives 0 findings on all three (see #369 above).

### Internal

- The repository's own hooks are installed by `npm ci` (`prepare: husky && npm run
  build`, #379); without `.git`, with `CI=true` or `HUSKY=0` the install and the
  build still pass, and husky says why it skips.
- Code is formatted with prettier (`.prettierrc.json`) in one reformat commit
  listed in `.git-blame-ignore-revs`; the hook and CI only check formatting (#382).
- lint-staged runs without its backup stash: the stash list is shared by every
  worktree, so one hook could restore another worktree's backup.

### Fixed — the audit cache follows the code (#391)

The audit cache (`performance.cache: true`) was keyed by the project's files, the
config, the mode and RoC's version string. Two builds of one version — release
candidates, a local build, `npm link`, an install from git — shared entries, so
the second could return the first one's verdict. Entries now also carry a hash of
the running package's code (computed once per process, about 0.1 s, only when the
cache is on); an entry from different code, or from before this release, is not
used. Nothing is written into the package, so `npm pack` stays reproducible.

## [7.27.0] - 2026-11-18

Nine performance laws from one production regression: a release passed every
check and a per-endpoint latency budget measured one request at a time on an
emulator, and was slower in production. None of the existing laws looked at the
causes. Also: an existing law that passed because it looked at nothing (#368,
#352), and waivers that bought a full verdict without being named (#350).
Closes #350, #351, #352, #353, #354, #355, #356, #357, #358, #359, #360, #368.
#361 (the umbrella) stays open: it also lists #362–#367, which are not in this
release.

### ⚠️ BREAKING — which laws your project gets

Nine new laws are on by default, all at **severity `warning`**: with
`failOnWarnings` off (the default) they do not change your exit code, but
they are checked, counted and printed. Eight of them are selected only where
their subject exists (Test Server Loopback Address Match reads the test and
perf files of every project). A project without async code, a database
client, a latency budget, a serverless deploy or an `@font-face` split by
`unicode-range` does not get the matching law: it is not run, not counted and
never a passing check.

| Law | Article | Selected where |
|---|---|---|
| Independent Awaits Run Concurrently (#351) | VI.6.24 | async code (Python `async def`, TS/JS async functions) |
| Document Read Once Per Request (#353) | VI.6.25 | a database client from the registry is declared |
| Count With An Aggregation (#354) | VI.6.26 | a database client from the registry is declared |
| Tracing Explains Latency (#358) | VI.6.27 | an OpenTelemetry SDK is declared (Python or Node) |
| Startup Request Fan-Out (#356) | VI.6.28 | Angular |
| Primary Locale Font Preloaded (#359) | VI.6.29 | own CSS/HTML with `@font-face` split by `unicode-range` |
| Latency Budget Harness Realism (#355) | VII.7.38 | a latency budget file (by its content) |
| Test Server Loopback Address Match (#360) | VII.7.39 | every project; it reads the test and perf files, and its pass says how many |
| Serverless Deploy Pins Resources (#357) | VIII.8.12 | a serverless deploy command or definition |

The database clients come from one registry, not one product: Firestore
(Python and Node, Admin and web SDK), SQLAlchemy, Django ORM, MongoDB (pymongo,
motor, mongodb, mongoose), Prisma, TypeORM, Sequelize. The serverless platforms
likewise: Cloud Run (`gcloud run deploy`, `services replace`, the
deploy-cloudrun action, Cloud Build), AWS Lambda (CLI, SAM/CloudFormation,
Serverless Framework), Azure Functions (Flex Consumption, `host.json`).

**Total Laws Checked, before (7.26.10) and after (7.27.0):**

| Simulated consumer | 7.26.10 | 7.27.0 |
|---|---|---|
| canary: python | 97 | 98 |
| canary: angular | 120 | 121 |
| canary: ionic | 150 | 151 |
| canary: react | 134 | 135 |
| canary: node | 77 | 78 |
| a FastAPI service with a document database (real project, own config) | refused: 86 selected, below its `minLawsChecked: 88` | 94 |
| an Ionic/Angular Nx app (real project, own config) | 147 | 153 |
| a static web front end (real project, own config) | 63 | 66 |

The canary counts are `laws=` from `node scripts/release-canary.js --tarball`,
run against the published 7.26.10 tarball and against this release's tarball;
the three real projects are full audits with their own committed config,
read-only.

**What to do:** nothing, if a warning is fine for now. To enforce one, raise its
severity in `laws.severity`. A law that does not apply to your project is not
selected; if one is selected and you disagree, `laws.notApplicable` with a
reason — and it will be named in the output (see #350 below).

### ⚠️ BREAKING — Database Query Optimization judges N+1 per call site (#352, #368)

This law is `error` by default, and it was passing every project on N+1:

- **#368:** its service-file discovery compared a file name **without its
  extension** against patterns that require one, so it found no files in any
  project. The N+1 check never ran (always "addressed"), and the batching,
  pagination and caching checks always said "not implemented", whatever the code.
- **#352:** even with files, one batching word anywhere passed the whole project.

Now every awaited read inside a loop of the same function is a finding with
`file:line` — Python (`for`, `async for`, `while`, comprehensions) and TS/JS
(`for`, `for…of`, `for await`, `for…in`, `while`, `do`, `.forEach`) — **when
the read's arguments or receiver use the loop's item**. A retry or poll loop
that re-reads the same key is not N+1. Accepted at the site: a batch read
(`get_all`/`getAll`/`in_bulk`), an `in` / `$in` / `.in_()` / `__in` / `Op.in` /
Prisma `in:` filter, a paged read, `asyncio.gather` / `Promise.all` over the
loop, and a fixed fan-out over a literal (inline or a module-level constant).
The project-level score stays as a summary.

A Python project with a database and no JS/TS sources was always "N/A" here and
is now judged by the N+1 check (still N/A when no awaited read is recognised).
Measured on a real FastAPI service: 46 call sites; a hand check of 10 random
ones found 9 true per-item reads, 0 false, 1 debatable (one query per rule over
a computed list of rules). An in-memory fake repository is read like a real one.

**What to do:** batch the named reads, or, where the loop is genuinely bounded
and small, declare the law inapplicable with a reason.

### ⚠️ BREAKING — a waiver needs a reason (#350)

A `laws.notApplicable` entry whose value is whitespace only (`" "`) or not a
string (`true`, `0`) used to waive the law. It no longer does: the law runs and
the audit prints

```
⚠️  laws.notApplicable['<law>'] has no reason — it waives nothing and the law still runs. Give the reason: laws.notApplicable = { "<law>": "why it does not apply" }
```

`""` never waived and still does not; a `null` value is dropped by the config
merger before the audit (as before) and behaves like a missing key. **What to
do:** write the real reason.

### ⚠️ Changes you will see — waivers are named and get their own verdict (#350)

Waiving every failing law with `laws.notApplicable` printed a bare
`✅ CONSTITUTIONAL COMPLIANCE: PASSED` and the victory art. Now, in every
outcome (pass, fail, partial, refused), the waived laws are listed with their
reasons before the verdict:

```
📋 2 law(s) waived by laws.notApplicable — not run, not passed:
   – <law>: <reason>
✅ CONSTITUTIONAL COMPLIANCE: PASSED WITH WAIVERS — 75 of 75 applicable laws ran (2 waived)
```

No victory art when anything was waived; a partial scan says
`(narrowed by X; W waived)`. **The exit code is unchanged in every case.** A
project with no waivers prints what it printed before, plus one line: Audit
Liveness now states its floor and where it comes from on a pass too —
`Audit Liveness: floor 20 — default 25% of 80 stack-applicable laws (meta-gates
included, counted before waivers)`, or `— laws.minLawsChecked`, or
`floor 0 — narrowed by …`. The 80 includes the two always-on meta-gates; the
summary's "count for the liveness floor" (the laws selected) does not.

The JSON (`--json` and `--export json`) gains:

- a top-level `verdict`: `compliance` | `compliance-with-waivers` | `partial` |
  `failed` | `refused`. **Read this instead of `passed`**: `passed` follows the
  exit code and is `true` for a partial run and for a run with waivers;
- `scope.waivedLaws: [{ law, lawId, reason }]` — the laws that would apply but
  were removed by a waiver (not unknown keys, not redundant ones, never a
  meta-gate);
- `scope.applicableBeforeWaivers` = `scope.applicableLaws` + the waived count;
- `scope.liveness: { applicableLaws, floor, floorSource }` — the count the
  liveness floor is taken from. It is **not** `scope.applicableLaws`: it counts
  before waivers and includes the two always-on meta-gates. The printed floor and
  the judged floor come from one function. No floor value changed.

The contract was written cell by cell before the code (waived × narrowed ×
refused × mode × outcome, cache hit, invalid waivers, 50 waivers) and each cell
is a test.

### Added — `requires` can say more

- `anyPythonDependency`: a Python distribution declared in requirements*.txt,
  pyproject.toml (PEP 621, PEP 735, Poetry, uv, PDM), Pipfile, setup.cfg or
  setup.py, up to three directories deep; names compare in PEP 503 form.
- `anyFileContaining: [{ files, pattern }]`: a file the globs name whose content
  matches. This is what keeps a law off a project that has nothing for it to judge.
  It reads **what git publishes**: tracked files (from the index when the working
  copy differs) and untracked files that are not ignored, minus `ignores.global`.
  A generated, git-ignored file that happens to contain the text never selects a
  law. The laws that use it judge exactly the files that selected them, so being
  selected and then "judging nothing" cannot happen through the gate. Outside a git
  work tree the disk is walked.
- `anyOf: [ … ]`: one of several requirement sets (a Python or a Node SDK).
- `thresholds.performance.maxStartupRequests` (default 4) for Startup Request Fan-Out.

A law that read its subject and found nothing wrong **passes and says what it
read**: the message and the result's `metrics` carry the counts (files read,
reads compared, fetches checked, components read), and what it does not follow.
It reports "judged nothing" only when it could read no file of its subject (or
its parser did not load), never as a pass. Startup Request Fan-Out is selected
only where an Angular `@Component` is declared; Serverless Deploy Pins Resources
only where a deploy command stands in a command position (prose in a JSON or
YAML string does not select it).

### Internal

- lint-staged no longer runs `prettier --write`. The repository is not prettier-
  formatted under any configuration (370 of 1099 src files differ even with the
  closest options), the step never ran because the hooks were never installed in
  a clone (#379), and once they were, it rewrote unrelated lines in every staged
  file. Formatting comes back as its own change: #382.

### Known limitations

- Startup Request Fan-Out does not follow requests started through a callback
  handed to a helper, free functions that receive a service, or `inject*()`
  factories; each component is judged on its own.
- Independent Awaits Run Concurrently uses simple def-use: a dependency through
  shared object state (a method that mutates `self`) is not seen.
- Document Read Once Per Request does not distinguish branches: two reads on
  mutually exclusive paths can be reported.
- The Python reader is structural (logical lines and indented blocks), not a
  Python AST: RoC has no Python runtime.

### Not in this release

Found during this wave, scheduled next: #369 (seven more places test a file name
without its extension for one), #370 (narrowing by `categories` is not partial),
#371 (the liveness floor is computed from the configured project type, not the
detected one), #372 (an inherited `GIT_DIR` makes `audit` read, and `init`
write, another repository), #379 (`prepare` never installs the hooks in a clone),
#380 (a hook counts as active when its file exists, whatever `core.hooksPath`
says), #381 (dependency conditions read git-ignored manifests), #382 (formatting).

## [7.26.10] - 2026-11-16

Found by a clean install from the README's Quick start of 7.26.9, and QA's
#345 and #348. Closes #345, #348.

### ⚠️ Changes you will see

- **A narrowed run is PARTIAL, never COMPLIANCE (#348).** A `laws.enabled`
  allowlist of 2 laws out of 77 printed "✅ CONSTITUTIONAL COMPLIANCE:
  PASSED" and the victory art under the banner "FULL MODE — the whole
  applicable law set will run", because only Pareto was treated as partial.
  Now any run narrowed by `laws.enabled` or Pareto that runs fewer
  substantive laws than apply prints:
  `⚠️  PARTIAL SCAN — N of M applicable laws ran (narrowed by laws.enabled). The selected laws passed; no compliance verdict.`
  — no COMPLIANCE line, no victory art. M is what the same selection gives
  with no allowlist and no Pareto; `laws.notApplicable` waivers are not
  narrowing (they change what applies). **The exit code is unchanged: 0
  when the selected laws pass**, so a gate on an explicit subset keeps
  working; only the words change. The JSON export and `--json` carry
  `scope: { executedLaws, selectedLaws, applicableLaws, narrowedBy,
  partial }` — the "N of M". `selectedLaws` is the substantive laws the
  config selected (what `partial` and the liveness floor compare);
  `executedLaws` is the ones that ran — fewer in a pre-commit, which defers
  the history laws, and **0 on a refusal**, with or without an allowlist.
  A refusal is never `partial` (no law ran — read `refused`); `narrowedBy`
  still says why the selection was small. **Read `scope.partial`, not only
  `passed`:** `passed` follows
  the exit code and is `true` for a partial run whose selected laws pass; a
  badge or CI script that reads only `passed` counts a partial run as a
  pass. (An explicit verdict field is planned.) The banner says `🎯 ALLOWLIST — only the laws named in
  laws.enabled will run.` for an allowlist, and `🏛️  PRE-COMMIT — the full
  law set on the staged files; the git-history laws run at pre-push.` in
  the pre-commit hook (both used to say FULL MODE). The refusal below the
  liveness floor ends "never a compliance verdict." (was "never PASSED."),
  and the Pareto line no longer says "PARTIAL SCAN PASSED". A full run's
  "✅ CONSTITUTIONAL COMPLIANCE: PASSED" and "refusing to report
  compliance" are unchanged.

- **`init` writes the full law set (B3).** `init --quick`, the
  non-interactive fallback and the interactive prompt's default wrote
  `paretoMode: true`. The hooks inherit the config's scope, so every new
  install gated commits and pushes on the Pareto subset — and a deliberate
  Pareto config has a liveness floor of 0, so nothing flagged it. The README,
  the site and the template all say Pareto is an explicit opt-in. New
  configs now say `paretoMode: false`, and `npx ruleofcode audit` after
  `init` runs `Mode: full`, as the README's comment says. **Existing
  configs are not changed:** a config that says `paretoMode: true` keeps
  the subset — set it to `false` to gate on the full set.

### 🐛 Fixed

- **The first commit of a fresh project no longer fails on lint-staged (B2).** The
  pre-commit hook ran `npx lint-staged` unconditionally, while `init`
  installs neither lint-staged nor a config; under husky's `sh -e` the
  commit failed with "lint-staged could not find any valid configuration".
  The hook runs lint-staged only when a config exists (`.lintstagedrc*`,
  `lint-staged.config.*`, or a `lint-staged` key in `package.json`). It no
  longer suggests `git commit --no-verify`, which CONTRIBUTING forbids; it
  points to `laws.notApplicable` with a reason instead.
- **TypeScript Strict Mode credits what `strict` turns on (B4).** A project
  with `"strict": true` was told to enable `noImplicitAny` and
  `noImplicitThis`, which `strict` already enables; and options inherited
  through `extends` (an Nx `tsconfig.base.json`, `@tsconfig/strictest`)
  were not read. The flags are now resolved by the project's own
  TypeScript, and only an explicit `false` switches an implied one off.
  `noImplicitReturns`, `noUnusedLocals` and the others `strict` does not
  include are still required.
- **Authentication Security says "insecure" only about insecure code
  (B4).** "Insecure password handling detected" was reported whenever no
  hashing library was found — including on code that handles no password.
  It now needs an insecure pattern (md5/sha1/btoa of a password, plaintext);
  code that handles passwords without a recognised hashing library gets a
  finding that says exactly that.
- **Component-spec evidence is read from code (#345).** A
  `TestBed.createComponent(` in a comment, or a type-only
  `@testing-library/angular` import, counted as test setup.

## [7.26.9] - 2026-11-12

QA's residuals of #330 on 7.26.7, and one false error the site found by
auditing this release's candidate before it was tagged. Closes #336,
#337, #338, #339, #343, #344. Publish 7.26.9; 7.26.7 and 7.26.8 are tagged but
superseded.

### 🐛 Fixed

- **The rest of the Angular 20 sweep (#336).** The same component named
  `hero.ts` got no verdict where `hero.component.ts` got one:
  - Memory Leak Prevention and Timer Cleanup now read components,
    directives and services by decorator too (a `setInterval` with no
    cleanup in `hero.ts` is now a finding);
  - Angular Testing Excellence checks `hero.spec.ts` for TestBed and
    ComponentFixture when `hero.ts` beside it is a component;
  - Change Detection Optimization looks for `hero.html` beside `hero.ts`
    (the old path replacement read `hero.ts` itself as the template);
  - every analyzer on the shared Angular analysis base (dependency
    injection, cleanup, lifecycle, OnDestroy, form validation) also reads
    the unsuffixed file of each kind it lists, by decorator — still under
    `src/` only, as before;
  - two unused suffix constants are removed; the cards of OnPush, Side
    Effects in NgRx Effects, Declarative Read Subscriptions and
    Professional Component Testing no longer say "only .component.ts".
  **Angular 20 projects can see new findings from these laws.**
- **A component that injects a service is not a service (#337).** Angular
  Service Layer Architecture counted any file with an exported class and
  the text "Service" — every component that imports a service — as "a
  service class without @Injectable". A service is now a class declared as
  `…Service` (or already `@Injectable`) in a file that is not a component,
  directive, pipe or module.
- **`hero.component.spec.ts` follows the Angular naming convention
  (#338).** Naming Convention Enforcement reported every
  `*.component.spec.ts` / `*.service.spec.ts`; the pattern allows `.spec` /
  `.test` and digits, and a name that merely contains "service"
  (`user-services-list.ts`) is no longer treated as an Angular file.
- **A fixture from `TestBed.createComponent()` is a fixture (#343).** Now
  that `hero.spec.ts` beside a component is a component spec, Angular
  Testing Excellence's "missing ComponentFixture" check (`error`) read it —
  and asked for the WORD: `TestBed.createComponent(App)` returns a
  `ComponentFixture`, inferred, so a correct spec failed. A
  `createComponent(` call counts as the fixture, and Angular Testing
  Library (`@testing-library/angular`) or Spectator (`@ngneat/spectator`)
  counts for both TestBed and the fixture (#344).
- **`init` refuses an unknown `--type` (#339).** `--type ioinc` wrote the
  detected type with exit 0; it now exits 1, lists the valid types and
  writes nothing.

## [7.26.8] - 2026-11-12

A false error that 7.26.7 would have introduced, found by running the
7.26.7 package against the project's own Angular 20 site before
publication. Closes #335. Publish 7.26.8; 7.26.7 is tagged but superseded.

### 🐛 Fixed

**E2E specs in Nx's `apps/<name>-e2e/` are found (#335).** Angular Testing
Excellence asks for an e2e suite once an app has more than 5 Angular
sources. Since #330 counts Angular 20's unsuffixed files, that guard was
true for the first time on such apps — and its lookup read only root-level
`e2e/`, `cypress/` and `tests/`, so a Playwright suite of 93 tests in
`apps/web-e2e/src/` was "No E2E tests found" at `error`. E2E Testing
Standards had its own list with the same blind spot (only a directory
named exactly `e2e`). Both now use one discovery: `*.e2e-spec.*`,
`*.e2e.spec|test.*`, `*.cy.*`, `cypress/**`, `e2e/**` and `*-e2e/**`
anywhere, read past `includes`/`ignores` as before. The other counts that
the wider Angular source reading feeds were checked: the per-file
standards already read by decorator, and the test-coverage ratio now
counts every Angular source.

## [7.26.7] - 2026-11-12

Three defects the site's adoption of 7.26.6 found. Closes #330, #331,
#332.

### 🐛 Fixed

- **Angular 20 files without a suffix are read (#330).** `ng generate
  component hero` writes `hero.ts`, not `hero.component.ts`. Professional
  Component Testing used its own suffix regex, found no component and
  reported that it judged nothing — an error on every Angular 20 app made
  by the CLI. It now finds components by suffix or by `@Component`, and
  pairs `hero.ts` with `hero.spec.ts` (the old pairing left `hero.ts`
  unchanged, so a component would have counted as its own test). Seven
  more laws picked their files with `endsWith('.component.ts')` (and
  `.directive.ts`, `.service.ts`, `.pipe.ts`, `.guard.ts`) and passed
  Angular 20 code in silence: Inject Over Constructor DI, Functional IO
  Query API, Declarative Read Subscriptions, No Subscribe In Effect, Side
  Effects In NgRx Effects, Angular Signal Adoption and Component Selector
  Prefix, plus the shared Angular source check. One helper now decides by
  suffix or decorator (`@Component`, `@Directive`, `@Injectable`, `@Pipe`,
  `@NgModule`, or a `CanActivateFn`-style guard type). **These laws can
  newly report findings on Angular 20 projects.** Inject Over Constructor
  DI now counts constructors of decorated classes only (`@Component`,
  `@Directive`, `@Injectable`, `@Pipe`): on a real Angular 20 app, reading
  unsuffixed files flagged 12 in-memory fakes — plain classes built with
  `new` beside an `@Injectable` class — whose `constructor(readonly seed)`
  is not DI. Measured on that app, 7.26.6 → 7.26.7: 147 laws, the same 23
  failures plus No Subscribe In Effect (two `effect()` bodies that call
  `.then()`).
- **The package declares every module it requires (#331).** `minimatch`
  (15 compiled files) and `rxjs` were required without being dependencies;
  they resolved only because `glob` and `inquirer` hoisted them. With
  `npm install --install-strategy=nested`, 7.26.6 exited 1 with
  "Cannot find module 'minimatch'"; 7.26.7 installs and audits. A test now
  fails if the source imports a package that is not a dependency.
- **`init` writes `ruleofcode.config.json` (#332).** It wrote
  `ruleofcode.config.js` while the README, the guides and the templates
  name `ruleofcode.config.json`, so the README's
  `--config ruleofcode.config.json` pointed at a file that did not exist.
  Both `init --quick` and the interactive setup now write `.json`. The
  loader reads `.js` before `.json`, so an overwrite moves an old
  `ruleofcode.config.js` to `ruleofcode.config.js.bak` and says so. A
  project that keeps its `ruleofcode.config.js` is unaffected — it is
  still read. `init --quick --type` was accepted and ignored; it is now
  honoured, and `--type` lists `ionic`, `python` and `typescript` too.

## [7.26.6] - 2026-11-12

Two defects QA found on 7.26.5. Closes #326, #327. Publish 7.26.6.

### 🐛 Fixed

- **Only the project's own HTML makes it a static site (#326).** The
  7.26.5 check walked the disk, so a git-ignored build output (MkDocs
  `site/`) selected the HTML laws locally but not on CI, and pages the
  config lists in `ignores.global` still selected them — after which the
  CSP law judged nothing, as an error the user could not clear. In a git
  working tree only tracked HTML counts; `ignores.global` applies; Jekyll's
  `_site/` and `storybook-static/` are generated output, like `dist/`.
- **Accessibility Linting Enforcement says when it judged nothing (#327).**
  With no Angular template (and `@angular/core`) and no `.tsx`/`.jsx`
  source — a Vue app, a React app written in `.js` — it returned
  "compliance verified". It now reports that nothing was judged (score 0,
  `judgedNothing: true`). Its severity is `warning`, so no build fails on
  it. Form Control Labeling and Explicit Button Type are unchanged: on
  pages they read and found no control, that is a verdict, not nothing.

## [7.26.5] - 2026-11-12

A regression 7.26.4 introduced, found by QA before publication. Closes
#323. Publish 7.26.5; 7.26.4 is tagged but superseded.

### 🐛 Fixed

**A static site lost the laws that read HTML (#323).** Since #319 a
static site is typed `generic` (correctly), and the accessibility laws
and the CSP law are `stack: frontend` — so a site with an unlabelled
input, a `<button>` without `type` and no CSP got no finding at all. The
7.26.4 entry below called every dropped law one the site "could never
satisfy"; that was wrong for these.

A card can now say `staticSiteHtml`: the law reads plain HTML (and the
static-hosting header files), so it is also selected for a `generic`
project that holds an HTML document. Three laws carry it, each measured on
plain HTML: **Form Control Labeling**, **Explicit Button Type** and
**Security Standards (XSS Prevention) Policy** (the CSP check that reads
`firebase.json`, `vercel.json`, `netlify.toml`). Modal Dialog
Accessibility, Disclosure Control ARIA State and Accessibility Linting
Enforcement do not: on plain HTML they judge nothing (a `role="dialog"`
with no name and a toggle with no `aria-expanded` both pass), so selecting
them would only add green checks. `stack` itself is unchanged on every
card. Generated HTML — `coverage.html`, `htmlcov/`, `apidocs/`,
`javadoc/`, `typedoc/` (and `coverage/`, `dist/`, `build/` as before) —
does not make a project a static site. The selector, the liveness floor,
the config warnings and the Pareto count use the same rule.

### Measured

No config, 7.26.4 → 7.26.5: a static site 60 → 63 laws; a vanilla Vite
app (an `index.html`) 77 → 80; a Go module with no HTML 60 → 60; a JS
project with no HTML 77 → 77.

## [7.26.4] - 2026-11-12

Two more defects QA found on 7.26.3 the same day. Closes #319, #320.

### ⚠️ Changes you will see

- **A file name no longer decides React or Vue (#319).** `public/index.html`
  (Firebase Hosting's default) typed a static site React, and `src/main.js`
  (the vanilla Vite template) typed a Vite app Vue — the React/Vue and
  TypeScript laws ran. The dependency decides; `vue.config.js` and a `.vue`
  component still count for Vue. Measured with no config, 7.26.3 → 7.26.4:
  a static site (`public/index.html`, with or without `firebase.json`)
  100 → 60 laws; a vanilla Vite app (only `vite` declared) 100 → 77.
  `src/App.tsx` / `src/App.jsx` without `react` no longer type React.
- **The report says which project type selected the laws (#320).** The
  audit result, `--export json` and `--json` carry
  `project: { type, source }` — `detected`, `configured` or `default` —
  and the console header prints `Project type: react (detected)`. Six law
  results (the sacred laws and some older ones) echoed a minimal default
  config saying `generic`; every result now echoes the config the law ran
  with. The 7.26.0 line "the detected type is written into the base
  config" is about the in-memory config the engine runs with; it was true,
  but those six results did not show it.

### Measured

Real consumers (read-only clones), 7.26.3 → 7.26.4:

| project | 7.26.3 | 7.26.4 |
|---|---|---|
| Angular/Ionic/Capacitor monorepo (type configured) | 147 laws, 23 failed | 147, the same 23 |
| Python API (type detected) | refuses: 86 < floor 88 | the same |
| Firebase static site — `public/index.html`, no `package.json`, no `.ts` | typed React: 100 laws, 41 failed | `generic (default)`: 60 laws, 24 failed |

The static site's 17 dropped failures were laws it could never satisfy
(TypeScript Strict Mode, Jest 100% Coverage, NX Commands Only, Test
Isolation, Professional Component Testing, …). **It also stops getting
the `stack: frontend` performance laws** (Core Web Vitals, Bundle Size
Optimization, Performance Standards): those are scoped to framework
apps, and there is no static-site type yet. A static site that wants them
today has no way to select only them — a follow-up, not a regression of
what was ever intended. Canary unchanged: python 97 · angular 120 ·
ionic 150 · react 134 · node 77.

## [7.26.3] - 2026-11-12

The rest of QA's 7.26.1 run: every issue filed that day that 7.26.2 left
open. Closes #298, #299, #300, #301, #302, #303, #304, #305, #306, #308,
#309, #310, #312, #313, #316. If 7.26.2 is not published yet, publish
7.26.3 instead.

### ⚠️ Changes you will see

- **A non-JS `generic` project no longer gets the TypeScript laws (#303).**
  A Go module or a static site with no `package.json`, `tsconfig*.json`,
  `jsconfig.json`, `deno.json` and no `.ts` file was typed `generic` and
  got all 23 `stack: typescript` laws. Measured with no config, it now
  runs 60 laws instead of 77. A JS project with a `package.json` is
  unchanged, as is every other project type.
- **A law that judged nothing scores 0, not 100 or 90 (#302).** Such a
  result carries `judgedNothing: true`, and the overall score no longer
  counts it as perfect. Pass/fail is still decided by severity.
- **A liveness-floor refusal reports what actually ran (#301).**
  `totalLaws`/`passedLaws`/`failedLaws` are 0, a new `refused` object
  gives the reason, the selection and the floor, and every JSON export
  has `stats.executedLaws`. CSV and HTML show the refusal.
- **`audit --json` writes only the JSON document to stdout (#306).** The
  banner, progress and warnings go to stderr. A refusal, an error and the
  self-exclusion skip also print a document.
- **The audit cache actually hits (#305),** and its key now also covers
  project files, CLI options, the git files laws read and Capacitor's
  resolved native paths. The key includes the RoC version, so an upgrade
  never reuses a verdict; a local build that keeps the same version
  number does.
- **`laws --json`:** `applicableFrameworks` now also comes from a law's
  `requires`, so about 90 laws that said `["*"]` name their framework
  (#308).

### 🐛 Fixed — Capacitor / Ionic

- **Cleartext Debug Only (#298):** a manifest redirected with
  `sourceSets.<set>.manifest.srcFile` is judged where it points (block,
  dotted, `getByName`, `["…"]` and `file(…)` forms); a missing target or a
  path from a variable is "not judged". A missing or uncommitted main
  manifest is reported. `usesCleartextTraffic="@bool/x"` is resolved
  through `res/values*`. Another source set's manifest is an overlay and
  needs no `<application>` — only main does (found on a real app whose
  release overlay only removes a permission).
- **Plugin Stub Has Contract Test (#299):** a `moduleNameMapper` held in a
  same-file `const` (or a spread of one) is read; one built by a call or
  imported is reported, not passed.
- **Native-shell laws read the commit, not the disk (#300):** Backup
  Scoped, Cleartext, Firebase (build script) and Local Plugin Contract
  read tracked files from git; a shell file that exists only on disk is
  reported. Privacy Manifest requires the file to be tracked.
- **Viewport Fit Cover (#312)** also runs in a Capacitor iOS app without
  Ionic.

### 🐛 Fixed — testing laws

- **Unit Test Quality Standards (#304)** applies the project's ignores
  (root-relative too), names files from the project root, and reports an
  unreadable test file. It now also reads `*.e2e-spec.*`.
- **Test Data Management (#310):** both findings name their files; the
  mocking finding fires only when a test imports a filesystem, network,
  database, broker or process client, and names it. Setup/teardown is
  required per file that holds module-level mutable state. Both twins
  report an unreadable test file.

### 🐛 Fixed — React / Next

- **Imports used only as types (#316):** one rule now decides, for all
  three import graphs, whether an import survives compilation — Next
  Heavy Lib in Client Graph and No Test-Only Leakage stop counting a
  type-only (or unused) import as a runtime edge. `verbatimModuleSyntax`,
  `preserveValueImports` and `importsNotUsedAsValues: preserve|error` keep
  it; an unreadable tsconfig keeps it (fail closed). Under
  `verbatimModuleSyntax`, `import { type X } from 'm'` is an edge.
  Module resolution is still separate per graph (#287 stays open).
- **Next Client Env Public Only (#309)** sees `const { SECRET } =
  process.env` (rename, default, assignment and cast forms) in client
  code: Next does not inline a destructured read. Public Env Is Build Time
  reports one finding per destructured name.
- **Cards (#313):** Dangerous HTML names `thresholds.react.jsonSerializers`;
  the tsconfig card says ignores do not apply and how to waive it. A test
  now fails any React/Next card that omits a `thresholds` key its checker
  reads.

### Measured

Real consumers (read-only clones), 7.26.2 → 7.26.3: an Angular/Ionic/
Capacitor monorepo 147 laws, 23 failed → same 23; a web app 100 laws, 41
failed → same 41; a Python API refuses on its floor of 88 with 86
selected, as on 7.26.2. Canary: python 97 · angular 120 · ionic 150 ·
react 134 · node 77 (unchanged).

## [7.26.2] - 2026-11-12

QA ran the 7.26.1 package before publication and returned NO-GO on three
defects; this release fixes them and four cheaper ones from the same run.
Publish 7.26.2; 7.26.0 and 7.26.1 are tagged but superseded. Closes #292,
#293, #294, #295, #296, #297, #307, #311.

### 🐛 Fixed — the three blockers

**Opt-in laws ran anyway (#292).** `defaultEnabled: false` was read by
nothing that selects laws, so No Risk Literals, Retention Registry Covers
Schema and Next Route JS Budget — documented as opt-in in 7.26.0 — ran on a
project with no config, and the budget law failed "not measured". Without
`laws.enabled` an opt-in law now runs only when `laws.severity` gives it a
severity (`error` / `warning` / `info`); with `laws.enabled` it runs when
listed there. A config that already set its severity keeps running it. Nine
older cards also said `defaultEnabled: false` and ran by default; they now
say `true`, so their behaviour does not change. The liveness floor counts
laws that run by default.

**An import used only as a type was a runtime edge (#293).** In the Next
module graph `import { Row } from '../lib/db'` without `type`, used only in
annotations, counted as bundling `../lib/db` for the browser; the compiler
erases it. Next Server Only Boundary and Next Client Env Public Only reported
server modules "bundled for the browser" that never reach it (8 false errors
on a public Next starter). Such an import is no edge in TypeScript files —
unless the tsconfig sets `verbatimModuleSyntax` (or `preserveValueImports`),
which keeps it. `class A extends Imported` and JSX use count as values.

**Test Documentation Requirements read titles that are not tests (#294).**
`it\s*\(` matched the tail of `split(` and of `it (` in comments, and titles
were cut at an inner quote: on a real Angular/Ionic monorepo 157 titles were
"unclear", one truly. Titles are now read from the parse — the first argument
of a call to `it` / `test` / `xit` / `fit` (and `.only`, `.skip`, …) — with a
regex fallback that requires a call boundary and the same closing quote. The
vague-title patterns match whole words ("… never the network" is not
"… work"). A test file that cannot be read is reported, not skipped. Same
monorepo: 157 → 5, one a genuine two-letter title.

### 🐛 Fixed — fail-open and gates

- **Commit Size Control (#295):** a `baseline` ref missing from the checkout
  (CI with `fetch-depth: 1`) made `git log` fail and the law passed. It now
  reports "Unable to read git history", as its two sibling laws do, and names
  the baseline.
- **React/Next laws (#297):** a `.tsx` TypeScript cannot parse was walked as
  half a tree and passed. The shared loaders now report it as not read, with
  the syntax error.
- **Performance alerts (#311):** the CI-workflow route was dead code and
  `.lighthouserc.js` could never count. A Lighthouse CI config with
  assertions (any of its ten file names) and a workflow that runs a
  performance check and notifies someone now satisfy Performance Monitoring
  Policy, and Performance Monitoring Standards accepts the same routes.
- **Release canary (#296):** provenance compared file names, not contents —
  a tarball with a line appended to `dist/cli.js` printed GREEN. It now
  compares the sha256 of every file and reads long tar names correctly.
- **Packaging (#307):** no `.gitattributes`, so a tag packed to two sha1s by
  `core.autocrlf` and the tarball shipped CRLF in 13 files. `* text=auto
  eol=lf`; the six files the index held as CRLF were renormalized.

### Numbers that move

Selected laws, same fixtures, 7.26.1 → 7.26.2:

| fixture | 7.26.1 | 7.26.2 |
|---|---|---|
| Next app, no config — `package.json` with next/react/react-dom only, no `typescript` | 133 | 131 |
| Next npm-workspaces monorepo, no config — root declares `typescript`, `apps/web` declares next | 134 | 132 |
| canary Angular (`project.type` set, its own config) | 121 | 120 |
| canary Angular + Ionic + Capacitor | 151 | 150 |
| canary Next.js (`typescript` declared, `tsconfig.json`) | 136 | 134 |
| canary Python / Node | 97 / 77 | 97 / 77 |

The difference is the opt-in laws (Next Route JS Budget, No Risk Literals).
The 7.26.0 table's "Next app, no config 136" was measured on a fixture with
`typescript` declared; the same plain fixture gives 133 on 7.26.1, so read a
count together with the fixture's shape.

**To keep an opt-in law,** give it a severity in `laws.severity` (for example
`"No Risk Literals": "error"`) or list it in `laws.enabled`. A config whose
`laws.minLawsChecked` equals today's count on a Next or Angular project must
lower it by the laws above, unless it turns them on.

## [7.26.1] - 2026-11-12

One defect, found by running the 7.26.0 package against a real consumer
before it was published. Publish 7.26.1; 7.26.0 is tagged but superseded.

### 🐛 Fixed

**Ignore patterns matched the directories above the project.** Ignores are
written relative to the project, but the scans that pass absolute paths
matched them against the whole path — so `**/tmp/**` or the default
`**/build/**` also matched a `tmp` or `build` directory the project merely
sits in. A project checked out under `/tmp` (common on CI) or a `build`
folder had every file ignored by those scans: Professional Component Testing
found 0 of a real Nx app's 117 Angular components. Before 7.26.0 that read
as a silent 100; 7.26.0's "judged nothing" turned it into a false red.
Ignores are now matched against the path inside the project; a `tmp/`
directory *inside* the project is still ignored, and the include whitelist
is unchanged.

Also: the 7.26.0 release notes are right that a Python project selects two
fewer laws — and its liveness floor counts without the two meta-gates, so a
Python config whose `minLawsChecked` equals its current count must be
lowered by 2 (measured on a real Python API: 88 → 86).

## [7.26.0] - 2026-11-12

React and Next.js become a stack RuleOfCode actually reads, Ionic/Capacitor
gets its second wave (the native shell, the bridge and Ionic's rendering
model), and every law about one framework now runs only where that framework
is declared. 61 laws are added (186 → 247), none removed. 80 issues closed:
#192, #195–#250 (React/Next, umbrella #250), #251–#272 (Ionic/Capacitor wave 2,
umbrella #251), and the older #31.

The headline defect, measured with the published 7.25.0 and **no config**: a
Python project ran **132 laws — the Angular set** — instead of the Python
ones, and a Next.js app or a Next npm-workspaces monorepo ran every
Angular-era frontend law (OnPush, NgRx, `angular.json` budgets) and could not
pass several of them.

### ⚠️ BREAKING — which laws your project gets

**Project type is detected, never defaulted to Angular (#203).** The default
config said `type: 'angular'` and the engine trusts a configured type, so any
project whose type the detector did not map to framework defaults was audited
as Angular. Now the detected type is written into the base config for every
type (default `generic`), frameworks are read from **every workspace
`package.json`** first (the reader `requires` uses), `next` is a React marker,
`nx.json` and `src/main.ts` no longer count as Angular evidence, and Python's
project files outrank a tsconfig. `typescript` is a valid project type and
selects the TypeScript laws (it was missing from that stack's list). A type
your config declares still wins.

**Framework laws are gated by `requires` (#214, #206, #31, #205, #207).** 19
Angular laws require `@angular/core`, 10 NgRx laws `@ngrx/store`, Observable
Cleanup `rxjs`, Timer Cleanup `@angular/core`. They are not selected — and not
counted — where the package is not declared. An Angular app without a store no
longer fails the NgRx laws.

**Selected laws, measured** (published 7.25.0 → 7.26.0, same projects):

| project | 7.25.0 | 7.26.0 |
|---|---|---|
| canary — Angular (no NgRx) | 132 | 121 |
| canary — Angular + Ionic + Capacitor | 149 | 151 |
| canary — Python | 99 | 97 |
| canary — Node | 77 | 77 |
| canary — Next.js (new arm) | — | 136 |
| Next app, no config | 132 (as Angular) | 136 |
| Next npm-workspaces monorepo, no config | 132 (as Angular) | 135 |
| Python project, no config | 132 (as Angular) | 97 |
| a real Angular + Ionic + Capacitor app (own config) | 131 | 147 |
| a real Python API (own config) | 90 | 88 |

**What to do:** re-read `laws.minLawsChecked` against the number the audit
prints (`set laws.minLawsChecked against N`). A Python project loses two laws
(below); a Python config whose floor equals today's count must be lowered by 2.
An Ionic/Capacitor Android project gains several `error` laws (below).

**Defaults that change:**
- **Test Isolation Enforcement** and **Test Data Management** are
  `stack: typescript` (were universal): they read only JS/TS test files and
  passed on every Python project having read nothing. With no test file in
  scope they now report "nothing was judged" — a violation — instead of 100.
- **No Risk Literals** is opt-in (`defaultEnabled: false`) and no longer
  gated by framework: its vocabulary is a trading domain's.
- **Accessibility:** the `t3-modal` literal is gone. If you relied on it,
  declare `thresholds.accessibility.accessibleDialogComponents: ["t3-modal"]`.

**Verdicts that change in existing laws:**
- **XSS:** legacy law 43 judges HTML **sinks** (case-sensitive, one finding
  per sink, sanitizer read in the sink's own statement); legacy law 44
  (`ContentSecurityPolicyLaw`) judges the **CSP** where it is declared —
  `index.html` meta, `next.config`/`proxy`/`middleware`, `firebase.json` /
  `vercel.json` / `netlify.toml` headers, or `thresholds.security.cspFiles`.
  A Next app with no CSP, or an app whose `index.html` has none and no hosting
  header sets one, now fails law 44 (before, the CSP was checked only when
  `src/index.html` existed). Report-Only does not count. `eval` no longer
  matches `retrieval(`.
- **FE architecture (#210):** the four layer laws no longer need Angular, take
  configurable layers (`thresholds.frontend.featureLayers` /
  `dataAccessLayers`), and fail with "judged nothing" when no file is in a
  layer.
- **Performance (#211):** the six performance laws read `next.config` /
  `vite.config` and React source with the project's TypeScript; a keyword in a
  comment or an unrun config no longer passes, and a plain Next app can pass
  once it declares a budget, Web Vitals and a gate.
- **Accessibility (#209, #252):** the five laws read JSX and `ion-*`
  components; unreadable files fail.
- **Test isolation (#192):** the twins read the same file set from the project
  root (root-relative `ignores.global` and `includes.global` apply), and every
  finding names its files.
- The pre-deployment build validator counts test files by name; it reported 0
  for every `.spec.ts`, and its tests asserted that 0.

### ✨ Added — 61 laws

**React (9, `requires react` unless noted):** React Hooks Lint Enforced
(error), React Effect Resource Cleanup, React Effect Fetch Race Guarded, React
Context Value Stable (info), React Store Subscription Uses Sync External Store
(info), React Render No Browser Global (`next`), Client Fetch Response Checked,
React Poll Visibility Gated (info), React List Key Stability (info).

**React security (3):** React Dangerous HTML Guarded (error), React Href Scheme
Guarded, Next Open Redirect Guarded (`next`).

**Next.js server (9, `requires next`):** Next Server Action Authorizes,
Next Route Handler Guarded, Next Server Only Boundary, Next Client Env Public
Only (all error), Next Proxy Placement And Matcher, Next Error Boundaries
Declared, Next Public Env Is Build Time, Guard Exemption Matches A Route,
Client IP Single Boundary (TypeScript stack; any Node HTTP framework).

**Next.js client (11, `requires next`):** Next Metadata Declared, Next Heavy
Lib In Client Graph, Next Image Has Dimensions, Next Third Party Script
Declared, HTML Lang Declared, Next Internal Link Component (info), Next Use
Client At Leaves, Next Client Props Serializable, Next Route JS Budget (error,
**opt-in** — needs a Turbopack build's stats), Next Segment Config Consistent,
Next Loading For Async Page (info).

**Test integrity (5):** No Focused Tests (error; any JS test runner), Playwright
No Fixed Wait, Playwright Locators User Facing (info), RTL Query By Role
(info), No Test-Only Leakage (error, `next`).

**Data and type integrity (5):** Drizzle Migration Journal Integrity (error),
SQL Check Constraint NULL Passes (universal, where `.sql` files exist), Guard
Function Has Production Caller, Tsconfig Exclude Leaves Code Untyped,
Retention Registry Covers Schema (**opt-in**).

**Ionic rendering model (8, `requires @ionic/angular` unless noted):** Ionic
View Hooks Only On Pages, Ionic Single Build System (error), Ionic Icons
Registered, Ionic Scroll Through Ion Content, Ionic Viewport Fit Cover (any
binding), Ionic Edge Chrome Pays Safe Area, Ionic Gesture Touch Action, Ionic
Fixed Content In Fixed Slot.

**Capacitor native shell (5):** Capacitor Android Cleartext Debug Only (error),
Capacitor Firebase Native Config Not Skipped (error), Capacitor Android Backup
Scoped, Capacitor iOS Privacy Manifest Declared, Capacitor Signing Secrets
Outside Repo (error). Native files are read by fixed path, independent of
`ignores`; "is it in the repo" is asked of git.

**Capacitor bridge (6):** Capacitor Android Back Has One Owner (error; Ionic
and `@capacitor/android`), Capacitor Local Plugin Contract (error), Capacitor
Listener Handles Released, Capacitor Service Worker Native Decision, Capacitor
Durable State Off WebView Storage, Capacitor Plugin Stub Has Contract Test
(info).

Every new law: a card with `rationale`, `satisfiedBy` and `detectionLimits`,
red and green tests, a "cannot read" test (it fails, never passes), and a
selection test through its real `requires`. New `thresholds` keys are
documented in `src/config/types.ts` and on the cards that read them.

### 🧱 Foundations

- `requires.allDependencies` — every listed package must be declared ("Ionic
  **and** the Android platform").
- `satisfiedBy.react`, and `laws --json` → `satisfiedByStacks.projectTypeToKey`
  (the guidance key by project type; `stackToKey` is unchanged). 23 of the 24
  frontend laws that run on every UI project now carry React guidance.
- TSX is parsed with the **project's own `typescript`**; when it cannot be
  loaded the files are reported as not read, never passed.
- `.test.tsx` / `.spec.tsx` / `.jsx` are tests, from one `TEST_FILE_GLOBS` list.
- The seven Ionic template laws share one parse per audit (first law ~12 s,
  the rest ~1 s each on a 2 000-file app, instead of ~3–4 s each).
- Canary: a React/Next arm, and the red pass now requires the planted law to
  be the one that failed (exit 1 alone is any failure). Both checks were seen
  red with a deliberately broken canary.

### 🐛 Fixed in RuleOfCode itself

- Its own audit judged none of its 577 tests: its config put them in
  `ignores.global`. They are in `ignores.tests` now (hidden from source scans
  only).
- Guard Function Has Production Caller found a function nothing called
  (`checkNpmRegistrySecurity`); it is removed.

## [7.25.0] - 2026-10-30

Four reported defects, all of the same family: the tool answering a
question by looking somewhere other than where the answer is. A "committed
secret" check read the disk instead of git. A floor was compared with what
one mode runs instead of what the config selects. A key validator reported
RuleOfCode's own defaults as the user's mistakes. A test-isolation finding
named no file, so nobody could tell which match had tripped it.

No law is added or removed, and no default severity or threshold changes.
Verdicts do change, in both directions — read the first section if you
have a `.env` in git.

### ⚠️ Verdicts that change

**A committed `.env` is now found, including the two cases that passed
before (#142).** `git-ignore-standards`, `environment-security-enforcement`,
`environment-variables-policy` and `environment-parity-standards` ask git
whether a sensitive file is tracked instead of whether it exists on disk:

| state | 7.24.0 | 7.25.0 |
|---|---|---|
| `.env` present, ignored, untracked (the correct setup) | **FAIL** | PASS |
| `.env` committed | FAIL | FAIL |
| `.env` committed, deleted from the working copy | **PASS** | FAIL |
| `.DS_Store` / `npm-debug.log` present and ignored | **FAIL** | PASS |
| `.env` present, untracked, not ignored | FAIL | FAIL |

Measured with five real git states against the built CLI, full mode, all
laws diffed against the no-`.env` state: the verdicts that moved were
`git-ignore-standards` and `environment-security-enforcement` (plus
`branch-governance-standards` for the uncommitted deletion on `main`).
The other two react only to other inputs — a quoted secret, a committed
`.env` that `.gitignore` also lists — and are pinned by tests for every
state above. A committed file's content
is read from the git index, so editing or deleting the working copy no
longer hides it. `environment-parity-standards` used to decide "is .env in
git" from the text of `.gitignore`, so a committed `.env` passed whenever
`.gitignore` also listed it — git does not untrack a file because it is
later ignored. Outside a git repository the old disk reading is kept.

**What to do:** if one of these laws now fails on a tracked `.env`,
`git rm --cached .env`, keep it in `.gitignore`, and rotate what it held —
it stays in the history. If you parked any of the four because your local
`.env` failed them, remove the waiver.

**`test-isolation-enforcement` / `test-data-management` (#124):** browser
storage in a Playwright spec whose tests destructure a fixture
(`async ({ page }) => …`) no longer counts as an unisolated resource —
every test gets its own BrowserContext. Not where a `beforeAll` can share a
page; databases, sockets and network calls still count.

### 🐛 Fixed

- **`laws.minLawsChecked`: one value now holds in every mode (#141).**
  `--mode=pre-commit` defers the three history laws to pre-push, so it ran
  three fewer laws than `--mode=full` — and the floor was compared with what
  ran. The value `--mode=full` told you to set failed every commit; the
  value that passed pre-commit left three laws of slack in full. The floor
  now counts the laws the config **selects**, before a mode defers any, and
  pre-commit prints `N run here + 3 history laws deferred to pre-push … set
  laws.minLawsChecked against M, the same in every mode`. Nothing that
  passed fails: the compared number can only grow.
- **No more `unknown law` warnings for keys you never wrote (#140).**
  `ANGULAR_CONFIG` merged eight `ignores.byRule` entries into every Angular
  project; five named no law, and all eight only repeated the self-exclusion
  that is applied to every law anyway. They are gone, and a test now
  resolves every law key in every shipped preset and template, so a dead
  default fails our CI instead of your audit output. Also:
  `byRule`/`notApplicable` keys were not checked at all when a config had
  no `laws.severity`.
- **The test resource finding names its files (#124).**
  `External resources not properly isolated between tests: src/a.spec.ts
  (localStorage); …` — every offending file and the resource it reached,
  instead of one sentence that stopped at the first match. In the re-test
  on 7.23.0, the comment in `app.spec.ts` was **not** what fired — comments
  were already stripped there — but the message gave nobody a way to see
  that.

### 🗑️ Removed

- `templates/angular.config.js`. It was referenced by nothing, shipped in
  the package, and carried 24 keys that name no law — including a
  `laws.enabled` allowlist that would have run zero laws if copied. Use
  `templates/recommended-frontend.config.json` (or `ruleofcode recommend`).

### 📝 Law cards

- `git-ignore-standards` no longer advises keeping `.env` "off disk": a
  local `.env` is expected; it must be ignored and untracked.
- `test-isolation-enforcement` still described the const false positive
  fixed in 7.23.0; it now says what the law reads, including that it looks
  for test files only under `src/`, `apps/` and `libs/` (#192).

### Known, not fixed here

- **#192** — the two isolation twins discover different test files (roots
  and config), and neither applied a root-relative `ignores.global` entry in
  the probe. Fixing it widens what `test-isolation-enforcement` reads, so it
  goes into a release that says so.

## [7.24.0] - 2026-10-30

Ionic and Capacitor become subjects instead of exemptions. `ionic` was a
project type RuleOfCode knew about and never wrote a law for: an Ionic app
ran the Angular laws, and several of them handed out unearned green on exactly
the behaviour Ionic changes — three cleanup laws credit `ngOnDestroy`, which
never runs on a page `ion-router-outlet` keeps (#143).

Seventeen new laws, two extended ones, and the mechanism that keeps them out
of every project they are not about. The registry goes from **169 to 186
laws**. A project that declares neither Ionic nor Capacitor runs exactly what
it ran before.

### ⚠️ BREAKING — for Ionic and Capacitor projects only

**More laws run, and seven of them default to `error`.** Measured on the same
fixture (Angular + `@ionic/angular` + `@capacitor/core` + a
`capacitor.config.json`), 7.23.0 against 7.24.0:

| mode | 7.23.0 | 7.24.0 |
|---|---|---|
| full | 132 | 149 |
| `--mode=pre-commit` | 129 | 146 |

An Ionic project without Capacitor gains 9; a Capacitor project without Ionic
gains 8. A plain Angular, React, Vue, Node or Python project is unchanged —
the release canary measures 132 / 77 / 99, the same as 7.23.0.

The seven at `error`: `ionic-no-skip-location-change`,
`ionic-unique-url-key-per-view`, `ionic-route-reuse-strategy-provided`,
`capacitor-logging-never-production`, `capacitor-no-dev-only-server-keys`,
`capacitor-plugin-platform-declarations`,
`capacitor-sync-artefacts-match-dependencies`.

**Two existing `error` laws can report new findings in a Capacitor project:**
`git-ignore-standards` now requires `google-services.json` and
`GoogleService-Info.plist` to be ignored and the generated shell paths to be
covered (#161); `semantic-versioning-standards` now compares a literal
`versionName` / `MARKETING_VERSION` with `package.json` (#162).

**A Capacitor law that cannot run your `@capacitor/cli` fails, it does not
pass.** Four laws read the config the way Capacitor does — by running the
project's own `cap config --json` — and report "could not resolve the
Capacitor config" when the CLI is not installed. Run the audit after
`npm ci`, as CI already does.

**`laws.minLawsChecked` (#141):** the counts above rise; a floor is a minimum,
so nothing that passed fails because of it. Raise it if you set it to the old
count deliberately.

**Project type:** a project with an Ionic binding (or `ionic.config.json`) is
now detected as `ionic` instead of `angular`. The stack is the same, so the
same frontend laws run, and the framework's defaults still apply. An explicit
`project.type: "angular"` in your config keeps working.

**What to do:** fix what the new laws find, or park a law in
`laws.notApplicable` with the reason — the card of each says when that is
legitimate (`capacitor-no-dev-only-server-keys` names an OAuth flow that must
stay in the WebView).

### ✨ Added — `requires`: a law about a toolkit runs only where the toolkit is

`stack: "frontend"` cannot tell an Ionic app from a plain Angular one, and a
law about `ion-router-outlet` that ran without one would inspect nothing and
print a green check. A law may now declare
`requires: { anyDependency, anyFile }`; where the project does not declare it,
the law is **not selected and not counted** — like a stack mismatch, never a
passing check. The selector, the `PARTIAL SCAN` count, the Audit Liveness
floor and the `laws.severity` / `laws.notApplicable` validators all ask one
function, so they cannot disagree; a config key for a gated law is reported as
`requirement-gated`, not as an unknown law. Dependencies are read from every
workspace `package.json`. `laws --json` carries `requires` per law, and
`satisfiedByStacks.keys` gains `ionic` and `capacitor`.

### ✨ Added — nine Ionic laws (#144–#152)

Selected where `@ionic/angular` is declared (the last one: any Ionic binding).
Four of them pass in an app without `<ion-router-outlet>` and say that the
URL-keyed view stack they are about does not exist there.

- `ionic-view-lifecycle-interfaces` — every `ionView*` hook with its
  `ViewWillEnter` interface; a near-miss name (`ionViewWillEnterr`,
  `IonViewWillEnter`, `#ionViewWillEnter`) "will never be bound".
- `ionic-page-state-read-on-enter` — per-visit state (`getCurrentNavigation()`,
  `history.state`, `route.snapshot`) read in `ionViewWillEnter`, not where a
  re-attached page never runs again.
- `ionic-leave-cancels-what-enter-started` — what a page starts, its
  `ionViewWillLeave` stops; `ngOnDestroy` / `takeUntilDestroyed` are
  deliberately not credited.
- `ionic-no-skip-location-change` — `replaceUrl`, never `skipLocationChange`
  (code and the `routerLink` input).
- `ionic-unique-url-key-per-view` — no two routes render a component at one
  path, children arrays included.
- `ionic-session-exit-uses-navigate-root` — a sign-out empties the stack.
- `ionic-route-reuse-strategy-provided` — `IonicRouteStrategy` in each
  application's bootstrap; `provideIonicAngular()` does not register it.
- `ionic-navigation-specs-mount-the-outlet` — a navigation spec mounts the
  outlet, not only `router.url`.
- `ionic-e2e-locators-target-the-shown-page` — `ion-*` locators filtered to
  the shown page.

### ✨ Added — eight Capacitor laws (#153–#160)

Selected where `@capacitor/core` **and** a `capacitor.config.{ts,js,json}` are
present. The config is read resolved, by the project's own CLI — never by a
pattern over the file, which a comment holding the safe value above a real
unsafe one defeats. The native shells are opened by fixed path, independent of
`ignores`.

- `capacitor-logging-never-production` — `loggingBehavior` at every level,
  case-insensitive.
- `capacitor-webview-origin-declared` — `server.hostname`, `androidScheme`,
  `iosScheme` stated.
- `capacitor-no-dev-only-server-keys` — the five keys Capacitor documents as
  not for production.
- `capacitor-plugin-config-declared` — every plugin that augments
  `PluginsConfig` gets its block, `{}` included.
- `capacitor-single-platform-boundary` — Capacitor imports in one boundary,
  stated in the new `thresholds.capacitor.boundary` or inferred.
- `capacitor-plugin-platform-declarations` — what the installed plugins need
  in `AndroidManifest.xml` / `Info.plist`, from a table that cites its sources.
- `capacitor-deep-link-contract` — intent-filter, `applinks:` entitlement and
  `appUrlOpen` listener agree.
- `capacitor-sync-artefacts-match-dependencies` — the tracked
  `capacitor.settings.gradle` (and Podfile / `Package.swift`, if tracked)
  equals the dependencies; an untracked one is "not read", not green.

### 🔧 Changed

- The audit cache now keys on the files laws open by fixed path — lockfiles,
  every workspace `package.json`, `.gitignore`, the Capacitor shells. They sit
  outside the scanned set, so a cached verdict would otherwise survive an edit
  to the manifest it was computed from.
- The init wizard offers an Ionic project type; lint-staged keeps `ng lint` for
  Ionic on Angular.
- The release canary has an `ionic` arm, and proves `requires` both ways
  through the CLI: the Ionic/Capacitor laws run in it and do not run in the
  Angular arm. With the gate forced open in `dist/`, the canary went red on
  that check alone.

### 🙋 Ours

- The README's "measured against the shipped registry" table said
  `python 70`, `angular 67`, "all 58 frontend laws" while the registry held
  69 / 63 / 55 — a hand-written count, in a table whose whole claim was that it
  was measured. It is now asserted against the registry like the others.
- #158's table cited the push-notifications README for `POST_NOTIFICATIONS`.
  The README at 8.1.3 does not mention it; the requirement is real and comes
  from the plugin's code (`PushNotificationsPlugin.java:39`), which the row now
  cites.
- A first regex in `ionic-no-skip-location-change` read
  `[skipLocationChange]="false"` as a violation, and `git check-ignore`, asked
  about a bare non-existent `android/build`, answered "not ignored" for a
  directory the template covers. Both were caught by the red/green tests
  before merge.
- The script that landed the laws ran tsc and the tests but not eslint; four
  stacked PRs went red in CI on a duplicated limit string before it was fixed
  and the script changed.

`git-ignore-standards` had no tests at all; it now has eleven.

Closes #143, #144, #145, #146, #147, #148, #149, #150, #151, #152, #153, #154,
#155, #156, #157, #158, #159, #160, #161, #162

## [7.23.0] - 2026-08-29

Seven consumer reports, seven fixes, no config edit required and nothing
removed. The law count is unchanged at 169.

**Two laws will report fewer findings than they did**, deliberately, and both
changes are described below under "a law that judged the shape". If you have
waivers written against `test-isolation-enforcement` or `unit-test-quality`,
they may no longer be needed.

**One law will report a different number.** `code-complexity-control` was
overstating every file's length by exactly one line. Files you waived at the
boundary may now pass on their own.

### 🐛 Fixed — a law that judged the shape, not the code

`test-isolation-enforcement` (#124) made three separate judgements about a test
file by looking at how it was written rather than at what it does, and each one
asked for an edit that moves a number without changing whether the tests are
isolated.

A module-scope `const` object or array counted as shared mutable state even
when nothing ever wrote to it. `const PHONE = { width: 390, height: 844 }` is a
viewport constant — and extracting those literals into exactly such a constant
is what `magic-number-prevention` demands in the same audit. Two laws asking
for opposite edits is not a finding; it is a contradiction the consumer has to
resolve by disabling one of them. A `const` is now shared state only if
something **writes** to it, and every such declaration is examined rather than
only the first match.

A comment counted as a resource. The sole `localStorage` in one reported file
was a line of prose inside a block comment, explaining why a test had been
deleted. `CodeText.stripComments` — the shared reader this repository already
had, and which the magic-number analyzer already used — is now called first.

The 70% setup/teardown rule was Jest-shaped. A Playwright spec has no
`beforeEach` because it needs none: every `test('…', async ({ page }) => …)`
gets a fresh BrowserContext and Page, which is *stronger* isolation than a
hook, not its absence. The only way to satisfy the old check was to add empty
hooks whose sole purpose was to be found.

Measured on the reporting tree: shared state `true` → `false`, isolation ratio
`false` → `true` (21/30 = 70.0%). Resource isolation stays `false` on a real
`page.addInitScript(() => localStorage.setItem(…))` with no cleanup — the fix
did not sweep away the finding that was correct.

`unit-test-quality` (#125) decided whether a suite exercises degenerate inputs
from a vocabulary in which every word named a **JavaScript value**: `null`,
`undefined`, `NaN`, `.toThrow`, `.rejects`. A suite that drives a real page has
no `null` to assert on. Its degenerate cases are a list that must be empty, a
count that must not be zero, a route that must not be missing. The vocabulary
is different, not absent — one consumer had 11 of 13 flagged files asserting
exactly these, including one whose title says *"and say so when unset"* in
plain English. `toEqual([])`, `toHaveCount(0)`, `toHaveLength(0)`, any negated
matcher, and the words `unset` / `missing` / `not found` / `no such` / `never`
now read as edge cases. Measured on the reporting tree: 13 findings → 5.

The remaining five assert `toHaveCount(1)`, `toBeVisible()`, `toHaveURL()`. The
reporter predicted 2; tuning until 5 became 2 would have fitted the law to one
repository instead of to the idea.

### 🐛 Fixed — a number that no other tool agreed with

`code-complexity-control` (#127) measured a file with
`content.split('\n').length`. A trailing newline **terminates** the last line;
it does not begin another. Every POSIX-conformant file therefore measured
exactly one line too long, and a file at exactly `maxFileLines` was rejected as
one over.

| tool | verdict on the same file |
| --- | --- |
| `wc -l` | 300 |
| ESLint `max-lines: 300` | passes |
| this law | **fails — "301 lines, max 300"** |

The reported count was wrong for every file this law named, not only at the
boundary, so the finding read as a bug in the tool. It was.

### 🐛 Fixed — two empty strings meeting in a map

`code-duplication-control` (#126) collapsed whitespace **before** stripping
comments, so the line-comment pattern had no line boundaries left for its `$`
to stop at and ate everything from the first `//` to the end of the block —
comments and real code alike. Any block whose first line was a `//` comment
normalised to the empty string, and every such block collided with every other
one. That is how a flat Angular provider array was reported as a duplicate of a
route guard.

Two changes rather than one: the strip order is fixed, and a block that
normalises to less than `minBlockSize` is now skipped. The threshold measures
the **raw** block, so a comment-only block passed it while carrying no logic at
all.

### 🐛 Fixed — the hook that gates commit messages

Two defects, one hook.

`commit-msg` (#128) printed *"Subject is 86 characters (max 72)"* for a
54-character subject, because `wc -c` counts bytes. The word "characters" in
the error pointed the developer away from the answer. The body check was worse:
`awk`'s `length()` counts characters under a UTF-8 locale and bytes under `C`,
so the identical commit message passed on one machine and failed on another,
decided by an environment variable nobody set on purpose. Both halves now
delete UTF-8 continuation bytes and pin `LC_ALL=C`.

`validateHooks()` (#129) checked the installed `commit-msg` hook against the
literal string `'RuleOfCode'` — which every generated commit-msg hook has ever
contained, of any version. That check could never fail. A hook written by any
earlier version reported as up to date and `reinstall-hooks` left it in place,
so the fix above would have shipped to nobody who already had a hook installed.
The marker is now the version stamp, as its two siblings already required.

### 🐛 Fixed — the config asked for a justification, then rejected it

JSON has no comment syntax, so a `$`-prefixed key is the conventional way to
annotate a map. `laws.notApplicable` is precisely the section where every entry
is a human decision that needs explaining — and a `$comment` there resolved to
zero laws and **failed the audit** (#130), while the same key in
`ignores.byRule` warned on every single run.

Swept rather than patched at the reported site: the same literal regex was
tested in four places — the guard, and three in `audit-engine` covering
severity overrides, unknown-law warnings and `notApplicable` waivers. All four
now call one shared predicate.

### 🔍 The shape behind the batch

Five of the seven are the same mistake in different clothes: **a check reading
the appearance of code instead of the code.** A comment that mentions
`localStorage`. A `//` that survives whitespace collapse. A newline counted as
a line. A brand name standing in for a version. A `$comment` read as a
misspelled law name.

In two of them the correct reader already existed in this repository and the
law simply was not calling it.

## [7.22.0] - 2026-08-26

**Two things to do once, before trusting your next run.** No config edit is
required, nothing was removed, the law count is unchanged at 169.

**1. Delete `.ruleofcode-cache`.** Until this version the cache key was files +
config + git state + mode — and none of those change when the tool is upgraded.
So a consumer who upgraded and re-ran was served the *previous* version's
verdict, byte for byte, from a build that no longer existed. Every fix we ship
was invisible to anyone with caching on. The version is part of the key now, and
entries written before the field existed invalidate safely; the one stale entry
already on disk is the reason to clear it by hand.

**2. Look again at any test law scoring 100.** `ignores.tests` was applied to
the scans whose whole purpose is to *count* tests, so two laws could pass with a
perfect score because they found nothing to check. See below.

### 🐛 Fixed — a law that passes for want of subject matter

The pattern assembly stripped the spec globs out of `ignores.global` when a scan
asked to include tests, then pushed `ignores.tests` **unconditionally** twelve
lines later — putting every one of them straight back.

Nobody had to write the key for this to bite. The loader injects
`**/*.spec.ts`, `**/*.test.ts` and `**/e2e/**` from `DEFAULT_CONFIG`, so a
config that never mentions tests still hid all of them.

The visible symptom was a coverage ratio of 1.6% on a repository with 30 spec
files, where the single surviving "test" was a `tsconfig.spec.json`. The silent
half mattered more:

| law | before | after |
| --- | --- | --- |
| Test Isolation Enforcement | **100/100, 0 findings** | 25/100, 3 findings |
| Test Documentation Requirements | **100/100, 0 findings** | 95/100, 2 findings |

In the reporter's words: *a law that passes because it did not find anything to
check is fail-open — and silent.* Those hundreds were published on a public
audit page for weeks.

### 🐛 Fixed — a Lighthouse gate is something that runs

`echo '{"performance":1}' > .lighthouserc.json` took a law from 75/100 with a
violation to **100/100 PASSED**. Eighteen bytes that nothing executes: no
Lighthouse installed, no script referencing the file, the shipped artefact
byte-identical.

The check asked whether a file existed and searched its contents for
`performance`, `90` or `0.9` — so any JSON mentioning a port `9000` or a width
`390` satisfied the threshold clause it is named after.

This tool publishes a list of ways to disarm it, deliberately, and every one is
a visible decision in a config. This was the same power in one `echo`, recorded
nowhere. Evidence is now that Lighthouse **runs** — a script, a dependency or a
CI step — and that the threshold is declared as one.

### 🐛 Fixed — four detection paths that could never fire

`performance-test-requirements` looked for `artillery.yml`, `k6.js`,
`.size-limit.json`, `lighthouse.json`, `newrelic.js` and `prometheus.yaml`
through a helper that scanned `.ts` and `.tsx`. Not one of those is a TypeScript
file, so all four sub-checks were decided by a substring search in
`package.json` alone.

Routing to the config-file scanner was not enough: it also skips dot-prefixed
names — the conventional spelling of three of the four — and covers
`.config.js` but not a bare `.js`. Declared build budgets now count as
bundle-size testing, which they are, and an enforced kind.

### 🐛 Fixed — the performance family agrees with itself

Two caching analyzers gave opposite verdicts in one run, asset hashing was
searched for in webpack's vocabulary (`contenthash` appears nowhere in an
Angular project), and resource hints were read from source alone — where **a
preload for a content-hashed asset cannot exist**, because the filename does not
exist until the bundler has run.

### 🐛 Fixed — a checklist clause defers to a law that PASSES

The other half of 7.20.0's waiver fix. The concern exists, the project meets it,
the owning law says so, and the checklist disagreed anyway — which rewarded
waiving a law you pass, purely so another law stops reporting it.

### 🐛 Fixed — a compliance script is what it runs, not what it is called

Two laws looked up script names and never read the values, so a project whose
`audit` script invokes this CLI inside a pre-push gate was told it had no
constitutional enforcement. The remedy that invited —
`"check:laws": "npm run audit"` — moves a number without adding a gate.

### 🐛 Fixed — three detectors that reported on code they had not read

Edge-case detection read `it()` and `describe()` but not `test()`, so a
Playwright suite was judged on its describe titles alone. Magic-number detection
scanned inside string literals and did not accept an object property as a name —
217 findings on one repository, none of them real. And a routing table crossed a
*complexity* ceiling with 22 functions and two decision points, by being
maximally declarative.

### 📄 Documentation

The README advertised 173 laws while the registry held 169, and its scope table
did not sum to its own total. Corrected, with tests that make the registry the
source and the README the copy.

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

Earlier history kept for verification: [7.8.1 → 7.9.1, the hook modes that narrowed
the law set](docs/history/7.8.1-7.9.1-hooks-narrowed.md) (122 → 27 laws), copied unchanged
from the private repository.

---

<!-- roc-footer -->
**Document Version:** the git history of this file &middot; **Last Updated:** 2026-11-21 &middot; **Status:** Active &middot; **Investment Rating:** current
