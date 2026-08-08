# 🏛️ RuleOfCode (RoC)

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](https://opensource.org/licenses/MIT)
[![Constitutional Laws](https://img.shields.io/badge/Constitutional%20Laws-173-red.svg)](#-laws-and-scope)
[![Tests](https://img.shields.io/badge/Tests-13%2C800%2B%20passing-success.svg)](#-development-and-release)
[![Fail Closed](https://img.shields.io/badge/Gate-fail--closed-blue.svg)](#-severity-semantics-and-fail-closed-guarantees)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](https://www.typescriptlang.org/)

**RoC is a constitutional-compliance CLI**: it audits a codebase against a catalog of
laws, installs git hooks, and returns a single honest answer — pass or fail. RoC is a
forcing function for the quality of the projects that consume it, so its founding
principle is:

> **A silently disarmed gate is more dangerous than a missing one.** Zero laws executed
> is never PASSED. Any state not proven clean is a failure.

## 📦 Installation

```bash
npm install --save-dev ruleofcode
# or run it directly:
npx ruleofcode audit
```

```jsonc
// consumer package.json (governance harness)
{
  "scripts": {
    "roc": "ruleofcode audit --config ruleofcode.config.json",
    "roc:laws": "ruleofcode laws --list"
  }
}
```

> ⚠️ **After any version change, run `npm ci`.** A stale `node_modules` audits silently
> with the old version — nothing but the version banner reveals the difference. After an
> upgrade, run your own red/green probe (see [the canary](#-canary-redgreen-verification)).

## 🚀 Quick start

```bash
npx ruleofcode init          # generates a config + git hooks
npx ruleofcode audit         # full audit (exit 0 = pass, 1 = fail)
npx ruleofcode laws --list   # the law catalog with canonical names
```

## ⚖️ Laws and scope

**173 laws**, scoped per stack via automatic stack gating — laws outside the project's
stack do not run and are not counted:

| Scope | Laws | Applies to |
|---|---|---|
| Universal | 63 | every project |
| Frontend (Angular/NgRx + FE architecture) | 58 | angular / react / vue / ionic |
| Python (FastAPI, Clean Architecture/CQRS) | 37 | python |
| TypeScript | 15 | all TS/JS projects |

The project type comes from `project.type` in the config, or is detected from the
filesystem.

## 🗂️ Law card schema (`roc laws --json`)

`roc laws --json` is the contract for anything that renders a law — a docs site, an
IDE panel, a dashboard. It is versioned by `schemaVersion` (currently `2`).

```jsonc
{
  "schemaVersion": 2,
  "tool": "ruleofcode",          // the package name this build was published under
  "version": "7.17.5",
  "registryTotal": 173,
  "satisfiedByStacks": {          // the mapping described below — read it, don't hardcode it
    "keys": ["typescript", "angular", "python"],
    "stackToKey": { "frontend": "angular", "typescript": "typescript", "python": "python" }
  },
  "laws": [ /* … */ ]
}
```

### `stack` and `satisfiedBy` are two different axes

This is the part that looks like an inconsistency and is not:

| field | question it answers | values |
|---|---|---|
| `stack` | **selection** — does this law run on this project at all? | `frontend`, `typescript`, `python`, or absent (universal) |
| `satisfiedBy` keys | **guidance** — which technology are these instructions written for? | `typescript`, `angular`, `python` |

**They are orthogonal. A `satisfiedBy` key is not a stack label**, and no key maps 1:1
onto a stack. Measured against the shipped registry:

| key | laws | spread across stacks |
|---|---|---|
| `typescript` | 71 | 12 `typescript` + 59 universal |
| `python` | 70 | 37 `python` + 33 universal |
| `angular` | 67 | 58 `frontend` + 3 `typescript` + 6 universal |

`angular` appearing on TypeScript-stack and universal laws is the clearest evidence:
it names the technology the advice is written in, not the projects the law applies to.

**Render by the key, not by the stack.** `satisfiedByStacks.stackToKey` gives the
default key for a stacked law; universal laws carry whichever keys have been authored.
Read that object rather than hardcoding a table — if a key is ever added, your renderer
picks it up.

### Where the guidance is missing, say so

All 58 `frontend` laws carry only `satisfiedBy.angular`. **There is no React or Vue
guidance yet** ([#12](https://github.com/Rule-Of-Code/RoC/issues/12)). A React project
matches `stack: "frontend"`, so those laws run — but the only remediation text we have
is Angular's.

If you render law cards, say that plainly ("written for Angular — no React/Vue
instructions yet") rather than presenting Angular steps as if they were universal. The
same honesty `detectionLimits` applies to detection, applied to remediation.

### The other authored fields

| field | what it is |
|---|---|
| `rationale` | why the law exists — written after reading the real detector |
| `detectionLimits` | what the detector does **not** catch. A law with none silently claims to be comprehensive |
| `configKeys` / `identityKeys` | every spelling that resolves this law in `laws.severity` / `notApplicable` / `enabled` |
| `urlSlug` | a registry-unique, URL-safe segment for `/laws/:slug` |
| `severity` | the authored default, before any config override |

## 🔧 Configuration (`ruleofcode.config.json`)

```jsonc
{
  "project": { "name": "My Backend", "type": "python" },

  "laws": {
    // Pareto mode is an EXPLICIT opt-in; false/absent = the full catalog.
    "paretoMode": false,

    // Formally opting out of a law — only with a documented reason.
    "notApplicable": {
      "CDN and Caching Strategy": "CDN is an edge-layer concern, not in the repo."
    },

    // Per-law severity override.
    "severity": { "Module Size": "error" },

    // Escalates warning/info violations to a failure (exit 1).
    "failOnWarnings": false

    // "enabled" is an allowlist: if present, ONLY the listed laws run. An absent
    // enabled = all laws. An empty/non-matching allowlist does not pass silently —
    // the audit refuses to report compliance (exit 1).
  },

  "thresholds": {
    "python": { "maxFileLines": 300, "maxTestFileLines": 500 }
  },

  "ignores": {
    "global": ["**/node_modules/**", "**/.venv/**"]
  }
}
```

### A law's identity is a public contract

The keys in `laws.enabled`, `laws.severity` and `laws.notApplicable` resolve equally
across **all public spellings** of a law:

- canonical name: `Module Size`, `Zero Tolerance Doctrine (SACRED LAW)`
- name without the decorative suffix: `Zero Tolerance Doctrine`
- the printed slug from the audit output: `module-size`
- the law id and legacyId

A key that matches no law **warns out loud** at audit start
(`⚠️ unknown law — this override gates nothing`). A law that exists but is stack-gated
out of the project type is reported separately (`ℹ️ does not apply to this project
type`) — it is legitimate in shared configs.

## 🚦 Severity semantics and fail-closed guarantees

- A law with violations at severity **`error`** → the audit is FAILED, exit 1.
- At severity **`warning`/`info`** → violations are reported in their own
  `⚠️ WARNING LAWS (reported, not blocking)` section, but the audit passes — the
  warn-first rollout cycle: warn → fix → error.
- `failOnWarnings: true` (or `audit --fail-on-warnings`) escalates warnings to failure.
- **Fail-closed guarantees:** an empty law selection → `❌ No laws executed — refusing
  to report compliance`, exit 1; an empty result is never PASSED; `Pass Rate: NaN` is
  impossible. If `Total Laws Checked` drops unexplained after an upgrade, that is a bug
  to report, not to waive.

## 🐤 Canary (red/green verification)

`npm run canary` builds consumer fixtures for each stack and proves, with exit codes,
that the gate is armed:

```
python   | laws=100 | green exit 0 | red exit 1 | zero-laws exit 1 (refused) | no-TypeError
angular  | laws=136 | green exit 0 | red exit 1 | zero-laws exit 1 (refused) | no-TypeError
node     | laws=78  | green exit 0 | red exit 1 | zero-laws exit 1 (refused) | no-TypeError
```

- **green**: a clean tree + calibrated waivers → exit 0
- **red**: one real violation (escalated to error) → exit 1
- **zero-laws**: an empty allowlist → refusal, exit 1
- **floor**: "Processing N laws" below a stack's floor = a collapsed selection = a blocker

`node scripts/release-canary.js --tarball <package>.tgz` runs the same against the
packed tarball installed as a consumer — the mandatory gate before every release tag.

## 🪝 Git hooks

`ruleofcode init` (or `reinstall-hooks`) installs pre-commit (audit of staged files) and
pre-push (full audit). The audit's exit code blocks the push only on error-severity
violations — warning laws report without stopping the team.

### Audit cache (opt-in)

`performance.cache: true` caches the audit result and creates `.ruleofcode-cache/` in the
repo root — if you enable it, **add `.ruleofcode-cache/` to `.gitignore`**. The cache is
off by default: a cached compliance result can report a stale PASSED. The directory is in
the default scan ignores, so the audit itself never inspects it.

## 🛠️ Development and release

```bash
npm run build     # tsc
npm test          # the full suite (13,800+ tests)
npm run lint      # ESLint — 0 errors is the norm
npm run canary    # the red/green gate
```

The tag is cut only on canary GREEN. A change to a default severity or threshold is
**BREAKING** and lands in the [CHANGELOG](CHANGELOG.md) with before/after values and
what the consumer must do.

## 📄 License

[MIT](LICENSE) © ruleofcode.dev team
