/**
 * Sacred Laws Data Module
 * The 5 non-negotiable Sacred Laws (Article I) - ALWAYS ENABLED
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const SACRED_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Zero Tolerance Doctrine (SACRED LAW)',
      'No errors, warnings, or violations of any kind in commits',
      'sacred'
    ),
    legacyId: 2,
    article: 'I',
    subsection: '1.2',
    title: 'Zero Tolerance Doctrine (SACRED LAW)',
    rationale:
      'Zero is a different number from one. A codebase that tolerates "just one" warning has no line left to defend — the second warning is free, and so is the hundredth. The doctrine is that the count of tolerated defects is zero, because any other number only erodes.',
    satisfiedBy: {
      typescript:
        'Enable strict and noImplicitAny in tsconfig.json, and keep an ESLint config at the repo root.',
    },
    detectionLimits: [
      'Checks two tsconfig keys (strict, noImplicitAny) and that an ESLint config FILE exists — it does not run tsc or eslint, and reads no source file.',
      'Reads the root tsconfig.json and its "extends" chain; "references" are not followed, so a solution-style root (files: [] with references) is judged on its own options (#640).',
      'TS/JS only — a Python project has no tsconfig and trips every check.',
    ],
    stack: 'typescript',
    emoji: '🚫',
    description: 'No errors, warnings, or violations of any kind in commits',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkZeroTolerance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.2: ZERO TOLERANCE - Errors/warnings detected',
    remediation: 'Fix ALL TypeScript errors, ESLint warnings, debug statements',
  },

  {
    id: generateLawId(
      'Investment-Grade Quality (SACRED LAW)',
      '10/10 perfect score is our MINIMUM STANDARD, not a goal',
      'sacred'
    ),
    legacyId: 3,
    article: 'I',
    subsection: '1.3',
    title: 'Investment-Grade Quality (SACRED LAW)',
    rationale:
      'Investment-grade means a stranger can trust the code without reading all of it: the scaffolding of quality — a test runner, a formatter, a type checker — is present and standard. Its absence is a signal the code was never meant to be trusted by anyone but its author.',
    satisfiedBy: {
      typescript:
        'Depend on a test runner (jest/vitest/cypress) plus eslint, prettier and typescript, with a tsconfig.json.',
    },
    detectionLimits: [
      'Presence only: it checks that a test framework, eslint, prettier and typescript are in package.json and that tsconfig.json exists — it computes no coverage, complexity or quality score.',
      'Test-framework detection is a fixed list (jest/vitest/cypress); mocha, jasmine, playwright, ava and node:test are not recognised.',
      'TS/JS only — it requires the typescript dependency and a tsconfig, so a plain-JS or Python project fails regardless of its actual quality.',
    ],
    stack: 'typescript',
    emoji: '🏆',
    description: '10/10 perfect score is our MINIMUM STANDARD, not a goal',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkSacredMetrics',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.3: Metrics below 10/10 MINIMUM STANDARD',
    remediation:
      'Achieve 10/10 in all metrics: TypeScript, ESLint, Tests, Performance',
  },

  {
    id: generateLawId(
      'TypeScript Strict Mode (SACRED LAW)',
      'Strict TypeScript configuration with zero compiler errors tolerance',
      'sacred'
    ),
    legacyId: 5,
    article: 'I',
    subsection: '1.5',
    title: 'TypeScript Strict Mode (SACRED LAW)',
    rationale:
      'TypeScript without strict is JavaScript with extra syntax. The guarantees people assume they are getting — no implicit any, checked indexes, no unused code — exist only when strict and its family are on. Half-strict is a promise the compiler does not keep.',
    satisfiedBy: {
      typescript:
        'In tsconfig.json set strict:true plus noImplicitReturns, noUnusedLocals, noUnusedParameters, exactOptionalPropertyTypes, noImplicitOverride and noUncheckedIndexedAccess, a target set and newer than ES5, and a modern moduleResolution (node, node16, nodenext or bundler). noPropertyAccessFromIndexSignature and source maps are not required.',
    },
    detectionLimits: [
      'Reads compiler flags from the root tsconfig.json and its "extends" chain; "references" are not followed, so a solution-style root (files: [] with references) is judged on its own options (#640).',
      'It reads the config, not the code: per-file // @ts-nocheck or @ts-ignore suppressions are invisible, and it never compiles.',
      "moduleResolution must be one of 'bundler', 'node16', 'nodenext' or 'node'; the target is rejected only when it is missing, ES3 or ES5.",
      'TypeScript only — a project without a tsconfig.json is out of scope for this law.',
    ],
    stack: 'typescript',
    emoji: '📏',
    description:
      'Strict TypeScript configuration with zero compiler errors tolerance',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkTypeScriptStrict',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.5: TypeScript strict mode violations',
    remediation:
      'Enable strict mode, fix all type errors, add proper type annotations',
  },

  // Extended Sacred Laws (6-9) - Additional foundational rules
  {
    id: generateLawId(
      'Constitutional Supremacy Doctrine',
      'Constitutional law supremacy over all other project standards',
      'sacred'
    ),
    legacyId: 6,
    article: 'I',
    subsection: '1.6',
    title: 'Constitutional Supremacy Doctrine',
    rationale:
      'A constitution that is not wired into the build is a poster on the wall. This law asks that the rules be enforceable in the repo — a config the tooling reads, and a script that runs the audit — because a rule nobody runs is a rule that does not exist.',
    satisfiedBy: {
      typescript:
        'Commit ruleofcode.config.json and add a check:laws (or audit:constitutional) npm script that runs the audit.',
    },
    detectionLimits: [
      'Existence only: it checks that ruleofcode.config.json exists and that the audit is run somewhere — a package script whose command runs ruleofcode / roc audit (or a check:laws-style name), a committed git hook (.husky, .githooks, lefthook, pre-commit config, simple-git-hooks) or a CI step that runs it. Comments, echo lines and step titles do not count; it does not read the config content or verify the run passes.',
      'CONSTITUTION.md, governance docs and CODEOWNERS are advisory here and never affect the result.',
      'The script check reads package.json, so a project without one can only fail on the missing config file.',
    ],
    emoji: '🏛️',
    description:
      'Constitutional law supremacy over all other project standards',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkConstitutionalSupremacy',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.6: Constitutional law violated',
    remediation: 'Ensure all code complies with constitutional requirements',
  },

  {
    id: generateLawId(
      'Professional Excellence Mandate',
      'Enterprise-grade professional code quality standards',
      'sacred'
    ),
    legacyId: 7,
    article: 'I',
    subsection: '1.7',
    title: 'Professional Excellence Mandate',
    rationale:
      "Professional code is boring in the right places: the linter, formatter and type checker are present, and everyone's editor agrees. The absence of that baseline is not a style preference — it is the difference between a codebase and a pile of files.",
    satisfiedBy: {
      typescript:
        'Depend on eslint, prettier and typescript, and keep their config files at the repo root.',
    },
    detectionLimits: [
      'Dependency-key and filename presence only — no content is inspected and nothing is run.',
      'Any ESLint config file (flat or legacy) or package.json eslintConfig counts, and any of ten Prettier config file names; the package.json "prettier" key is not read.',
      'TS/JS only — a Python project trips the missing-package.json and missing-tooling checks.',
    ],
    stack: 'typescript',
    emoji: '💎',
    description: 'Enterprise-grade professional code quality standards',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkProfessionalExcellence',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.7: Professional standards not met',
    remediation: 'Implement enterprise-grade code quality practices',
  },

  {
    id: generateLawId(
      'Automation First Principle',
      'Automated processes over manual interventions',
      'sacred'
    ),
    legacyId: 8,
    article: 'I',
    subsection: '1.8',
    title: 'Automation First Principle',
    rationale:
      "Anything a human has to remember to run is a thing that will be skipped on the day it matters most. Tests, lint and build belong in CI and in scripts, not in a teammate's habits — automation is the only reviewer that never has a deadline.",
    satisfiedBy: {
      typescript:
        'A CI config (.github/workflows, GitLab, Bitbucket…) plus test / lint / build npm scripts and a test-framework dependency.',
      python:
        'A CI config plus a declared test runner (pytest via pytest.ini / tox / nox, or test_*.py) — the Python path is recognised natively.',
    },
    detectionLimits: [
      'CI is checked by directory/file existence only — an empty .github/workflows passes, and the workflow content (whether it runs tests or lint) is never read.',
      'Script-key presence is not proof the script works. A test framework is a dependency named jest, @jest/core, mocha, jasmine, jasmine-core, karma, cypress, playwright, @playwright/test, vitest or ava in the root package.json; node:test and other runners are not recognised.',
      'The Python carve-out covers test automation and (when there is no package.json) quality; the JS quality path expects lint and build npm scripts.',
    ],
    emoji: '⚙️',
    description: 'Automated processes over manual interventions',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkAutomationFirst',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.8: Manual processes detected',
    remediation: 'Replace manual processes with automated alternatives',
  },

  {
    id: generateLawId(
      'Continuous Compliance Doctrine',
      'Continuous FileHeaderComplianceAnalyzer monitoring',
      'sacred'
    ),
    legacyId: 9,
    article: 'I',
    subsection: '1.9',
    title: 'Continuous Compliance Doctrine',
    rationale:
      'Compliance is not a launch-day photo; it is a heartbeat. A gate that ran once and was never wired to run again decays silently — the point is that the audit runs on every change and on a schedule, so drift is caught in hours, not in an incident.',
    satisfiedBy: {
      typescript:
        'Wire the audit into CI (ideally on a schedule/cron), define a check:laws (or compliance:check) script, and depend on RuleOfCode (the ruleofcode package).',
    },
    detectionLimits: [
      'Existence and key-presence checks, plus a naive substring scan for "cron:"/"schedule:" in workflow YAML (no YAML parse — a comment matches) and a "badge" substring in the README.',
      'It requires the project to run RuleOfCode: as a dependency, or invoked (npx ruleofcode audit) from a package script, a committed git hook or a CI step — a repo not using this tool cannot satisfy it.',
      'Only .eslintrc.js counts as an eslint marker here; flat / JSON / YAML eslint configs are missed.',
    ],
    emoji: '🔄',
    description: 'Continuous FileHeaderComplianceAnalyzer monitoring',
    priority: 'CRITICAL',
    category: 'SACRED_LAW',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkContinuousCompliance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article I.1.9: Compliance monitoring gaps',
    remediation: 'Implement continuous compliance monitoring systems',
  },
];
