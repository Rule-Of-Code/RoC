# Working on RuleOfCode

Conventions an automated contributor is expected to follow here. Human
contributors: [CONTRIBUTING.md](CONTRIBUTING.md) is the same rules with more prose.

RoC is a forcing function for the quality of the projects that consume it, so it is
held to a stricter standard than they are: **RoC is audited by its own law.**

## Commit messages

- Conventional Commits, `type(scope): summary`, subject **≤ 72 characters**.
- A blank line after the subject; body lines wrap at **72**. The body says **why**.
- 🔴 **No `Co-Authored-By` trailer.** Not on any commit, ever. If your tooling adds
  one by default, strip it before committing. A regression test fails the build on
  any commit carrying it (`tests/regression/commit-trailer-guard.test.ts`), and the
  eight historical exceptions in that file are frozen — adding a ninth to excuse a
  new commit is not a fix.
- Verify the line lengths **before** you commit, in a separate step. Chaining the
  check and the commit into one command means you commit before reading the check.

## Branching

`feature|bugfix|hotfix/*` → PR to **`develop`**. Releases: `release/vX.Y.Z` → PR to
**`master`** → annotated tag once the canary is green → merge `master` back into
`develop`. Branch Governance rejects any other prefix; rename the branch rather
than widening the law.

`master` and `develop` are never force-pushed. Your own unpushed branch is yours.

## The gate

All of it, locally, before opening a PR. `--no-verify` is not available to you.

```bash
npm run lint      # eslint . — 0 errors
npx jest          # full suite
npm run canary    # red/green across python, angular, node
node dist/cli.js audit   # RoC against RoC
```

Run the full suite, not the files you think you touched. It has caught changes that
looked local and were not.

## Changing a detector

1. **Read the detector before you accuse the law.** Most reported "false positives"
   turn out to be holes in the fixture.
2. **Reproduce first.** A fix for a bug you never triggered is a guess.
3. **Prove red AND green** — that it catches the violation, and that it passes
   correct code — with a regression test.
4. Update `detectionLimits` when what the detector cannot see has changed. A law
   with stale limits is lying about itself.
5. A default severity or threshold change is **BREAKING**. Say so in the CHANGELOG,
   with before/after values and what a consumer must do.

## What is never acceptable

- A law that passes because it inspected nothing. A vacuous green is worse than a
  missing check: it hands out unearned confidence.
- Lowering a floor, widening an allowlist, or adding a waiver to make the suite
  pass. If the only way to satisfy a law is to lie, the law is buggy — report it.
- Inventing a `rationale`, `satisfiedBy` or `detectionLimits` claim that is not true
  of the real code. Plausible and false is the exact failure this tool exists to kill.
