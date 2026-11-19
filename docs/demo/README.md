# README demo — ruleofcode 7.28.0

`demo.gif` is a recording of real `ruleofcode@7.28.0` output, from npm, on a
neutral two-file TypeScript project (`fixture/`, "demo-app"). Nothing in it is
typed by hand or generated.

What it shows, in three commands:

1. `cat allowlist.json` — a config that names four laws in `laws.enabled`.
2. `npx --yes ruleofcode@7.28.0 audit --mode=full --only-failures --config allowlist.json`
   → `⚠️ PARTIAL SCAN — 4 of 75 applicable laws ran … no compliance verdict.`
   The four laws pass; the CLI still refuses to call that compliance.
3. `npx --yes ruleofcode@7.28.0 audit --mode=full --only-failures`
   → `Total Laws Checked: 77`, `✓ Passed: 28`, `✗ Failed: 34`,
   `❌ CONSTITUTIONAL COMPLIANCE: FAILED`.

## Reproduce

Requirements: Node, `bash` on PATH (Git Bash on Windows), network for `npx`,
and [`agg`](https://github.com/asciinema/agg) 1.9.0 for the GIF.

```sh
npm ci                     # pins ruleofcode 7.28.0 for check.mjs
node record.mjs            # runs the three steps, writes out/ and demo.cast
node check.mjs             # must print only ✓ lines and exit 0
agg --renderer resvg --font-size 13 --theme github-dark --fps-cap 10 \
    --idle-time-limit 3 --last-frame-duration 4 demo.cast demo.gif
```

`record.mjs` copies `fixture/` to a work directory (`d:/tmp/demo-app` on
Windows, `/tmp/demo-app` elsewhere; the CLI prints it on the `Project:` line),
commits it once with a fixed author and date, and runs each step with
`bash -c "<command>"` and `FORCE_COLOR=1`. For a new version, change `VERSION`
in `record.mjs` and the pin in `package.json`, then run all four commands.

## What check.mjs proves

- The command typed on screen is exactly the string bash ran.
- The output after it is the step's recorded stdout (`out/step-N.stdout`) byte
  for byte; the only transformation is a terminal's ONLCR (`\n` sent as
  `\r\n`). Timing is not a fact: pauses let the summary and the verdict be read,
  and the long list of failed laws is sent in batches so it scrolls quickly.
- Every line a `ruleofcode` step printed exists in the installed
  `ruleofcode@7.28.0` dist: a colour change is a seam (each colour is its own
  chalk call), numbers / quoted values / `laws.*` paths / the project path are
  cut out as run-time values, and a segment built from a template literal must
  match that template whole, with every hole's content passing the same check.
- Three invented lines, two of them inside real templates, are rejected.

Tampering with one byte of the cast, or with one character of a typed command,
makes `check.mjs` fail.

## Fixture

`fixture/` as committed in the recording: commit
`36f0f820c7c7d9dacc0fb847e33a2a9289e04244`, tree
`5fdb790400a507b15f2a9fe3a8fdd0447aa5e14c`
(author `demo <demo@example.com>`, `2026-11-19T12:00:00Z`,
`feat: add the demo app`).
