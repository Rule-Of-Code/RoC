# README demos

Two recordings of real `ruleofcode` output. Nothing in them is typed by hand or
generated.

- `demo.gif`, the one the main README shows: ruleofcode 8.0.1, recorded with
  the release candidate's tarball, the same file that was then published to
  npm (its sha1 is `PACKAGE_SHA1` in `record.mjs`).
- `pass.gif`: ruleofcode 7.29.1 from npm. It is not shown in the main README.

## `demo.gif` — honest refusal (8.0.1)

A neutral two-file TypeScript project (`fixture/`, "demo-app"), in three
commands:

1. `cat allowlist.json` — a config that names four laws in `laws.enabled`.
2. `ruleofcode audit --mode=full --only-failures --config allowlist.json`
   → `⚠️ PARTIAL SCAN — 4 of 70 applicable laws ran … no compliance verdict.`
   The four laws pass; the CLI still refuses to call that compliance.
3. `ruleofcode audit --mode=full --only-failures`
   → `Total Laws Checked: 72`, `✓ Passed: 30`, `✗ Failed: 29`,
   `⚠ Warnings: 12`, `◌ Judged nothing: 1`,
   `❌ CONSTITUTIONAL COMPLIANCE: FAILED`, exit 1. The four numbers add up to
   the laws checked. Two of the failed laws judged nothing at error severity
   (Unit Test Quality Standards, Test Isolation Enforcement: the project has no
   test files) and are listed with the failed laws; the third law that judged
   nothing (Test Data Management) is at warning severity and has its own block.

`ruleofcode` is ruleofcode 8.0.1 installed with `npm install` into
`d:/tmp/roc-demo-pkg` (`/tmp/roc-demo-pkg` elsewhere) and put first on `PATH`
for the steps; the banner of each run prints `RuleOfCode v8.0.1`. It was
recorded before publish, from the candidate's tarball: `npx ruleofcode@8.0.1`
cannot run a release that is not published yet, and the tarball is the file
that was published. `check.mjs` holds the install to that file before
publish, and to npm after.

The fixture is a real TypeScript project, so its dependencies (`typescript`,
pinned in `fixture/package-lock.json`) are installed with `npm ci` before
anything is recorded; that step is not shown. Without the compiler, the
TypeScript laws (8.0.0 and later) report the files as not read (#427), which
describes the machine, not the project. `node_modules/` is gitignored and the
recording refuses to start if the tree is not clean after the install.

## `pass.gif` — what a real PASS takes (7.29.1)

This repository itself, cloned from GitHub at tag `v7.29.1` with its full
history, in three commands:

1. `git describe --tags` → `v7.29.1`.
2. `ruleofcode --version` → `7.29.1`.
3. `ruleofcode audit --mode=full --only-failures`
   → `Total Laws Checked: 84`, `✓ Passed: 38`, `✗ Failed: 0`,
   `⚠ Warnings: 46 (reported, not blocking)`,
   `✅ CONSTITUTIONAL COMPLIANCE: PASSED`,
   `⚠️ 46 law(s) reported warnings …`, then the victory art.

No law is waived: `ruleofcode.config.json` at that tag has an empty
`laws.notApplicable`, no allowlist and `paretoMode: false`. The art is printed
only for a full run in which no law is waived; with a waiver the verdict reads
`PASSED WITH WAIVERS` and there is no art. Warnings do not block, and they are
shown: the same run with `--fail-on-warnings` ends `✗ Failed: 46`,
`❌ CONSTITUTIONAL COMPLIANCE: FAILED`, exit 1. Since 8.0.0 such a run is
`PASSED WITH WARNINGS`, without the art; this recording is not shown in the
main README for that reason.

`ruleofcode` here is the package from npm, installed by `npm ci` into
`./node_modules` (`package.json` pins 7.29.1, `package-lock.json` its
integrity) and put on `PATH` for the steps. `npx ruleofcode@…` cannot be used
for this demo: inside a project whose own package is named `ruleofcode`, npm
runs that local project instead of the published package.

## Reproduce

Requirements: Node, `bash` on PATH (Git Bash on Windows), network for `npm`
and for the clone, and [`agg`](https://github.com/asciinema/agg) 1.9.0 for the
GIFs.

```sh
# refusal, before publish: the candidate's tarball (sha1 = PACKAGE_SHA1)
node record.mjs --tarball=<path>/ruleofcode-8.0.1.tgz   # writes out/ and demo.cast
node check.mjs --tarball=<path>/ruleofcode-8.0.1.tgz    # only ✓ lines, exit 0
agg --renderer resvg --font-size 14 --line-height 1.15 --theme asciinema --fps-cap 10 \
    --idle-time-limit 3 --last-frame-duration 4 demo.cast demo.gif

# refusal, after publish: the same release from npm
node record.mjs --install-only   # installs ruleofcode 8.0.1 from npm
node check.mjs                   # npm's shasum must be PACKAGE_SHA1

# pass
npm ci                     # pins ruleofcode 7.29.1
node record.mjs --pass     # writes out-pass/ and pass.cast
node check.mjs --pass
agg --renderer resvg --font-size 14 --line-height 1.15 --theme asciinema --fps-cap 10 \
    --idle-time-limit 3 --last-frame-duration 4 pass.cast pass.gif
```

The refusal demo installs ruleofcode into its package directory, copies
`fixture/` to a work directory (`d:/tmp/demo-app` on Windows, `/tmp/demo-app`
elsewhere; the CLI prints it on the `Project:` line), commits it once with a
fixed author and date, and installs its dependencies with `npm ci`. The pass
demo clones `https://github.com/Rule-Of-Code/RoC.git` at `v7.29.1` into
`d:/tmp/roc-self` (or `/tmp/roc-self`) and refuses to record if the tag is not
commit `a6a5a6cc4eebb7bbe304bd5732a3f895a9618e7f` or the clone is not clean.
Each step runs with `bash -c "<command>"` and `FORCE_COLOR=1`. The pass
terminal is 58 rows, so its last frame holds the verdict, the warnings line and
the whole art.

For a new release, set `VERSION` in `record.mjs`, pack the candidate, set
`PACKAGE_SHA1` to its sha1, and run the refusal commands with `--tarball`. The
pass demo has its own `PASS_VERSION`, `PASS_TAG_COMMIT` and the pin in
`package.json`.

## What check.mjs proves

- The installed `ruleofcode` is the release the demo runs, byte for byte.
  Refusal, with `--tarball`: the file's sha1 is `PACKAGE_SHA1` and the
  install's lock holds that file's sha512. Refusal, without: npm's published
  shasum is `PACKAGE_SHA1`, and the install came from the registry with the
  integrity `npm view` reports. Pass: resolved from the npm registry, with the
  integrity `npm view` reports.
- The command typed on screen is exactly the string bash ran.
- The output after it is the step's recorded stdout (`<out>/step-N.stdout`) byte
  for byte; the only transformation is a terminal's ONLCR (`\n` sent as
  `\r\n`). Timing is not a fact: pauses let the summary and the verdict be read,
  and long lists are sent in batches so they scroll quickly.
- Every line a `ruleofcode` step printed exists in the installed
  ruleofcode's dist: a colour change is a seam (each colour is its own chalk
  call); numbers, quoted values, `laws.*` paths, the project path and the
  paths of the project's files are cut out as run-time values; a segment built
  from a template must match it whole, with every hole's content passing the
  same check. Templates are the dist's template literals (including ones joined
  with `+`) and its `'{name}'` message strings. A hole that holds one name from
  the audited code (`RuleOfCodeAuditor.audit`) is data; prose in a hole is
  checked.
- A line with no words, which the check above cannot hold to anything, is held
  separately: a rule of one repeated character must be a `'<c>'.repeat(` in the
  dist, and the lines of a picture (the victory art) must appear, character for
  character and in order, inside one template literal of the dist.
- Invented lines are rejected, including inside real templates and inside a
  real message's hole, and so are a real art line with one character changed,
  an invented picture line and an invented rule.

Tampering with one byte of a cast, one character of a typed command, one
character of the art in the recorded output, one byte of the tarball, or the
integrity in a lock makes `check.mjs` fail.

## Fixture

`fixture/` as committed in the refusal recording: commit
`e1e2f00da67a828848ca880c3b38080b3884c49b`, tree
`9f0cca95e28093cfca5d5477d9f66b42f4978f95`
(author `demo <demo@example.com>`, `2026-11-19T12:00:00Z`,
`feat: add the demo app`).

---

<!-- roc-footer -->
**Document Version:** the git history of this file &middot; **Last Updated:** 2026-11-22 &middot; **Status:** Active &middot; **Investment Rating:** needs-review
