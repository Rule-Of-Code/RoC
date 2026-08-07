## What this changes

<!-- One paragraph: what behaviour is different after this PR, and why. The diff
     already says what the code does — say why it needed to change. -->

## Verdict impact

<!-- Does this change what the audit REPORTS on a consumer's project? -->

- [ ] No verdict change (docs, tests, refactor, internal)
- [ ] Changes verdicts — a detector now catches more, or fewer, real cases
- [ ] **BREAKING** — a default severity, threshold, or config shape changed
      (then: state the before/after values and what a consumer must do)

## Evidence

<!-- A detector change is proven BOTH ways, or it is not proven. -->

- [ ] Proven **red**: it flags the violation it claims to flag
- [ ] Proven **green**: it passes correct code (no false positive)
- [ ] Regression test added under `tests/`
- [ ] `detectionLimits` updated if what the detector cannot see has changed

## Gate

<!-- All three, locally, before requesting review. `--no-verify` is not an option. -->

- [ ] `npm run lint` — 0 errors
- [ ] `npx jest` — full suite green
- [ ] `npm run canary` — red/green proven across stacks
- [ ] `node dist/cli.js audit` — RuleOfCode still passes its own law

## Notes for the reviewer

<!-- Anything you are unsure about, deliberately left out, or want challenged.
     A law that can only be satisfied by a lie is a bug — say so here. -->
