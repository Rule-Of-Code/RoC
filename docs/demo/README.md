# README demos — ruleofcode 7.29.1

Two recordings of real `ruleofcode@7.29.1` output, from npm. Nothing in them is
typed by hand or generated.

## `demo.gif` — honest refusal

A neutral two-file TypeScript project (`fixture/`, "demo-app"), in three
commands:

1. `cat allowlist.json` — a config that names four laws in `laws.enabled`.
2. `npx --yes ruleofcode@7.29.1 audit --mode=full --only-failures --config allowlist.json`
   → `⚠️ PARTIAL SCAN — 4 of 75 applicable laws ran … no compliance verdict.`
   The four laws pass; the CLI still refuses to call that compliance.
3. `npx --yes ruleofcode@7.29.1 audit --mode=full --only-failures`
   → `Total Laws Checked: 77`, `✓ Passed: 28`, `✗ Failed: 34`,
   `❌ CONSTITUTIONAL COMPLIANCE: FAILED`.

## `pass.gif` — what a real PASS takes

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
`❌ CONSTITUTIONAL COMPLIANCE: FAILED`, exit 1.

`ruleofcode` here is the package from npm, installed by `npm ci` into
`./node_modules` (pinned with its integrity in `package-lock.json`) and put on
`PATH` for the steps. `npx ruleofcode@…` cannot be used for this demo: inside a
project whose own package is named `ruleofcode`, npm runs that local project
instead of the published package.

## Reproduce

Requirements: Node, `bash` on PATH (Git Bash on Windows), network for `npx` and
for the clone, and [`agg`](https://github.com/asciinema/agg) 1.9.0 for the GIFs.

```sh
npm ci                     # pins ruleofcode 7.29.1
node record.mjs            # refusal: writes out/ and demo.cast
node check.mjs             # must print only ✓ lines and exit 0
agg --renderer resvg --font-size 14 --line-height 1.15 --theme asciinema --fps-cap 10 \
    --idle-time-limit 3 --last-frame-duration 4 demo.cast demo.gif

node record.mjs --pass     # pass: writes out-pass/ and pass.cast
node check.mjs --pass
agg --renderer resvg --font-size 14 --line-height 1.15 --theme asciinema --fps-cap 10 \
    --idle-time-limit 3 --last-frame-duration 4 pass.cast pass.gif
```

The refusal demo copies `fixture/` to a work directory (`d:/tmp/demo-app` on
Windows, `/tmp/demo-app` elsewhere; the CLI prints it on the `Project:` line)
and commits it once with a fixed author and date. The pass demo clones
`https://github.com/Rule-Of-Code/RoC.git` at `v7.29.1` into `d:/tmp/roc-self`
(or `/tmp/roc-self`) and refuses to record if the tag is not commit
`a6a5a6cc4eebb7bbe304bd5732a3f895a9618e7f` or the clone is not clean. Each step
runs with `bash -c "<command>"` and `FORCE_COLOR=1`. The pass terminal is 58
rows, so its last frame holds the verdict, the warnings line and the whole art.

For a new version, change `VERSION` and `PASS_TAG_COMMIT` in `record.mjs` and
the pin in `package.json`, then run all of the commands above.

## What check.mjs proves

- The installed `ruleofcode` is the published package: the version the demo
  runs, resolved from the npm registry, with the integrity `npm view` reports.
- The command typed on screen is exactly the string bash ran.
- The output after it is the step's recorded stdout (`<out>/step-N.stdout`) byte
  for byte; the only transformation is a terminal's ONLCR (`\n` sent as
  `\r\n`). Timing is not a fact: pauses let the summary and the verdict be read,
  and long lists are sent in batches so they scroll quickly.
- Every line a `ruleofcode` step printed exists in the installed
  `ruleofcode@7.29.1` dist: a colour change is a seam (each colour is its own
  chalk call); numbers, quoted values, `laws.*` paths, the project path and the
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
character of the art in the recorded output, or the integrity in
`package-lock.json` makes `check.mjs` fail.

## Fixture

`fixture/` as committed in the refusal recording: commit
`36f0f820c7c7d9dacc0fb847e33a2a9289e04244`, tree
`5fdb790400a507b15f2a9fe3a8fdd0447aa5e14c`
(author `demo <demo@example.com>`, `2026-11-19T12:00:00Z`,
`feat: add the demo app`).
