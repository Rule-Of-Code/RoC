# Contributing to RuleOfCode

RoC is a forcing function for the quality of the projects that consume it. It is
therefore held to a stricter standard than they are: **RoC is audited by its own law**
and has no right to demand of a consumer anything it does not follow itself.

Read this before your first PR.

## Core principles

1. **Fail-closed.** When a detector cannot decide, it **fails**, it does not pass. A
   silent green is more dangerous than a missing gate — it hands out unearned
   confidence.
2. **Zero waivers by default.** In `ruleofcode.config.json`, `notApplicable` is
   **empty**. Laws set to `warning` are **visible debt** and are burned down one by
   one — not hidden.
3. **Never invent.** Every claim about a law (`rationale`, `satisfiedBy`,
   `detectionLimits`) is written after reading the **real detector**. A
   plausible-sounding limitation that is not true is exactly the lie this tool exists
   to kill.
4. **Declare your limits.** Every law states what it does **NOT** catch. A law with no
   declared limits silently claims to be comprehensive.

## Git flow

| branch | purpose |
|---|---|
| `feature/*`, `bugfix/*`, `hotfix/*` | work → PR to **`develop`** |
| `develop` | the working branch; changes accumulate here |
| `release/vX.Y.Z` | bumps the version + CHANGELOG → PR to **`master`** |
| `master` | **releases only**; the tag is cut here and merged back to `develop` |

- Feature PRs target `develop`, **never `master`**.
- The tag is **annotated** (`git tag -a vX.Y.Z -m "..."`), cut on `master` after merge,
  and only once the release canary is green (see below).
- The prefix matters: Branch Governance accepts only
  `feature|hotfix|bugfix|release`. `fix/` and `chore/` **fail** — the law caught this
  while this document was being written. Do not fix the law to admit your branch;
  rename the branch.
- 🔴 **Force-pushing a shared branch is FORBIDDEN.** `master` and `develop` are not
  rewritten — not with `--force`, not with `--force-with-lease`, not by rebasing over
  already-pushed history. A shared branch's history is a contract: once published, it
  belongs to others. Need a revert? Use `git revert`, which adds a commit instead of
  rewriting the past. On your own feature branch that no one has pulled, you are free.

### Merge conflicts

Prevention beats resolution. Keep feature branches short-lived and **rebase your own
feature branch onto the latest `develop` before opening the PR** — a small, current
branch rarely produces a merge conflict. When one does happen, resolve it locally
(`git mergetool` or by hand), re-run the gate, and **never commit a file with conflict
markers left in it**: the pre-commit hook and the Merge Conflict Prevention law both
scan the working tree for unresolved markers and fail the audit if any survive. Note
that rebasing is allowed only on your own unshared branch (see the force-push rule
above); a shared branch's conflicts are resolved with a merge commit, never a rewrite.

## Commits

Conventional Commits: `type(scope): summary`

- types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`,
  `revert`
- subject ≤ **72** characters
- a blank line between subject and body; body lines wrap at **72**
- the body says **why**, not what — the diff already says what

## The gate

All three must be green **before** a PR. No exceptions.

```bash
npm run lint      # eslint . — zero errors
npx jest          # the full suite
npm run canary    # release canary: 3 stacks, red/green probe
```

- **`--no-verify` is FORBIDDEN.** If a hook fails, fix the cause. Bypassing the gate is
  exactly the behaviour RoC exists to make impossible.
- The canary proves not only that green is green, but that **red is red**
  (`green exit 0` · `red exit 1` · `zero-laws exit 1 (refused)`). A gate not proven red
  is not a proven gate.

## Where things live

| what | where |
|---|---|
| the authored law data | `src/data/*-laws.ts` |
| the detectors | `src/checkers/**`, `src/laws/**` |
| the name → class dispatch | `src/registry/modular-laws-registry.ts` (`LAW_CLASS_MAPPING`) |
| ratchet tests | `tests/regression/` |

## Changing a law

1. **Read the detector first.** Before you accuse a law of being wrong — read it. Many
   "failures" turn out to be holes in the fixture, not the law.
2. **Data and detector travel together.** `detectionLimits` lives next to the
   detector's real behaviour; when they diverge, the field is lying.
3. **Red/green probe.** A new or fixed detector is proven both ways: that it catches
   the violation **and** that it passes correct code.
4. **The ratchet does not go down.** The floors in `tests/regression/` only grow. If
   you lower a floor to make the suite pass, you have disarmed the gate.

## Incentives we do not accept

A law that rewards a lie is worse than a missing law. We do not accept a detector that:

- passes on **zero violations by construction** (it looked at nothing and reported
  green);
- ticks a box (e.g. a pre-checked checklist) instead of verifying the fact;
- prints a green ✅ over a failing verdict, or fails without naming a single violation.

If the only way to pass a law is to lie — **the law is buggy.** Report it, do not
bypass it.

## Language

Code, comments and `CHANGELOG.md` are in English.
