/**
 * Deployment Laws Data Module
 * Laws for CI/CD, deployment standards, and launch preparation
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const DEPLOYMENT_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Pre-Deployment Checklist (MANDATORY)',
      'Comprehensive pre-deployment validation and security checks',
      'deployment'
    ),
    legacyId: 71,
    article: 'XVII',
    subsection: '17.1',
    title: 'Pre-Deployment Checklist (MANDATORY)',
    rationale:
      'The checklist is the last thing between a green build and a bad night — the deploy where nobody remembered the migration, the rollback, the smoke test. It exists so the steps are decided once, in calm, not improvised at 2am.',
    satisfiedBy: { typescript: 'Keep a PRE_DEPLOYMENT_CHECKLIST.md with steps for build & tests, security and rollback; leave the boxes UNTICKED — they are ticked at deploy time, not committed.', python: 'Same — and the checks are recognised natively (pytest, bandit/pip-audit, a /health route, abort(401) auth).' },
    detectionLimits: [
      'Judges the checklist\'s STRUCTURE (does it have steps for build & tests, security, rollback), NEVER the state of its boxes — the boxes belong to a deployment, not the repo.',
      'The build/test/security/auth checks are presence heuristics; a Node project\'s build check reads package.json.',
      'Universal — Python is recognised natively; the checklist file itself must exist.',
    ],
    emoji: '✅',
    description: 'Comprehensive pre-deployment validation and security checks',
    priority: 'CRITICAL',
    category: 'DEPLOYMENT',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkPreDeploymentChecklist',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XVII.17.1: Pre-deployment checklist incomplete',
    remediation:
      'Complete all pre-deployment checks: build, test, security, PerformanceTestUtils analysis',
  },

  {
    id: generateLawId(
      'CI/CD Constitutional Tribunal',
      'Pipeline rejects all violations without appeal, constitutional checks first',
      'deployment'
    ),
    legacyId: 72,
    section: '15',
    subsection: '15.1',
    title: 'CI/CD Constitutional Tribunal',
    rationale:
      'A constitution the pipeline does not enforce is advice. This law asks that CI actually run the compliance, quality and security gates — because a rule only a human remembers to run is a rule that ships broken on a Friday.',
    satisfiedBy: { typescript: 'In CI, run the RoC audit, the lint/type/coverage gates, and a security scan (npm audit / snyk / codeql).', python: 'Same in CI — the RoC audit, ruff/mypy, pytest coverage, and pip-audit/bandit.' },
    detectionLimits: [
      'Reads the FIRST matching CI file only and regex-matches keywords — a second workflow (test.yml, security.yml, codeql.yml) is never read, and the bare word "lint"/"sonar" anywhere (even a comment) passes.',
      'Recognises a fixed filename list; a repo whose only workflow is deploy.yml / release.yml is reported as having no pipeline.',
      'Quality-gate keywords are Node-leaning (eslint, typescript.check); a Python `pytest --cov` in CI is not matched. Config, not behaviour.',
    ],
    emoji: '⚖️',
    description:
      'Pipeline rejects all violations without appeal, constitutional checks first',
    priority: 'CRITICAL',
    category: 'DEPLOYMENT',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkCICDTribunal',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 15.1: CI/CD not enforcing constitutional checks',
    remediation:
      'Ensure FileHeaderComplianceAnalyzer is first mandatory step in CI/CD',
  },

  {
    id: generateLawId(
      'Launch Readiness Checklist',
      'Comprehensive launch checklist must be completed before production deployment',
      'deployment'
    ),
    legacyId: 73,
    section: '16',
    subsection: '16.1',
    title: 'Launch Readiness Checklist',
    rationale:
      'Launch day is the worst time to discover you have no rollback plan, no monitoring, no security sign-off. This law asks that the readiness artifacts exist before the button is pressed, not after the incident.',
    satisfiedBy: { typescript: 'Commit a LAUNCH_READINESS / DEPLOYMENT checklist, a test report or coverage, a security review, and a monitoring plan.' },
    detectionLimits: [
      'File presence, not content — an EMPTY file named LAUNCH_CHECKLIST.md satisfies it; the boxes and approvals in the title are never verified.',
      'The testing check is Node-biased (package.json test scripts, JS coverage artifacts) — a pytest project with no package.json fails it.',
      'The performance-benchmark check is effectively inert (it delegates to a no-op service).',
    ],
    emoji: '🎯',
    description:
      'Comprehensive launch checklist must be completed before production deployment',
    priority: 'CRITICAL',
    category: 'DEPLOYMENT',
    automation: 'CONFIGURABLE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkLaunchReadinessChecklist',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 16.1: Launch readiness checklist incomplete',
    remediation:
      'Complete LAUNCH_CHECKLIST.md, verify all deployment requirements, get approvals',
  },

  {
    id: generateLawId(
      'Pre-PR Quality Gates',
      'All PRs must pass comprehensive quality gates before review',
      'deployment'
    ),
    legacyId: 74,
    section: '2',
    subsection: '2.2',
    title: 'Pre-PR Quality Gates',
    rationale:
      'The cheapest bug to fix is the one caught before the PR merges. This law asks for the gates that stop a broken change at the door: review, status checks, branch protection, a PR template.',
    satisfiedBy: { typescript: 'Require PR review and green status checks, protect the main branch, and add a PR template.', angular: 'Same — branch protection is configured in the host settings (GitHub / Bitbucket).' },
    detectionLimits: [
      'Branch protection is server-side on Bitbucket/Azure — it is inferred from the host, not verified; the PR-template check reads a fixed set of in-repo paths.',
      'CI / status-check detection is keyword presence in a workflow, not proof the checks run.',
      'Reads config / host markers, not the actual enforced ruleset.',
    ],
    emoji: '🚪',
    description: 'All PRs must pass comprehensive quality gates before review',
    priority: 'HIGH',
    category: 'DEPLOYMENT',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkPrePRQualityGates',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 2.2: Pre-PR quality gates not implemented',
    remediation:
      'Implement pre-commit hooks, PR templates, quality checklist validation',
  },

  {
    id: generateLawId(
      'Automated Code Quality Gates',
      'Automated quality gates preventing low-quality code from entering the codebase',
      'deployment'
    ),
    legacyId: 75,
    section: '21',
    subsection: '21.1',
    title: 'Automated Code Quality Gates',
    rationale:
      'A quality bar that lives in a wiki is one nobody clears. This law asks that linting, formatting, type-checking, tests, build and security be automated gates — enforced by a machine that never has a deadline.',
    satisfiedBy: { typescript: 'Wire eslint, prettier, tsc strict, a test runner and a security scan into scripts and CI.', python: 'ruff + mypy + black (or ruff format) + pytest-cov + a PEP 517 build + bandit/pip-audit — recognised natively.' },
    detectionLimits: [
      'Presence of gates, not proof they pass — it reads config files, package.json scripts and pre-commit; it does not run them.',
      'Fails on its VIOLATIONS, not a score (a fixed defect) — but it cannot tell a configured-but-ignored gate from an enforced one.',
      'TypeScript strict is asked only of projects that actually have TypeScript sources.',
    ],
    emoji: '🛡️',
    description:
      'Automated quality gates preventing low-quality code from entering the codebase',
    priority: 'HIGH',
    category: 'DEPLOYMENT',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkAutomatedQualityGates',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 21.1: Automated quality gates not configured',
    remediation:
      'Configure comprehensive quality gates: lint, format, test, build validation',
  },

  {
    id: generateLawId(
      'Environment Parity Standards',
      'Development, staging, and production environment parity',
      'deployment'
    ),
    legacyId: 78,
    article: 'VIII',
    subsection: '8.9',
    title: 'Environment Parity Standards',
    rationale:
      'The classic outage: it worked in staging because staging had a config value production did not. Parity asks that every environment be described the same way — one contract, real values injected at deploy — so "works here" means "works there".',
    satisfiedBy: { typescript: 'Commit a .env.example (or .env.template) declaring every variable with placeholders; gitignore the real files and inject values at deploy time.' },
    detectionLimits: [
      'Asks for the CONTRACT (.env.example), never the values — it will not, and must not, want .env.production in the repo.',
      'Environment-variable usage detection is process.env (Node) only; Angular environment.ts objects are invisible.',
      'Presence / consistency heuristics over config files; no runtime check that the environments actually match.',
    ],
    emoji: '🌍',
    description: 'Development, staging, and production environment parity',
    priority: 'MEDIUM',
    category: 'DEPLOYMENT',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkEnvironmentParityStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VIII.8.9: Environment parity compromised',
    remediation: 'Ensure consistent configurations across all environments',
  },

  {
    id: generateLawId(
      'Health Check Monitoring',
      'Comprehensive health checks for all deployed services',
      'deployment'
    ),
    legacyId: 79,
    article: 'VIII',
    subsection: '8.10',
    title: 'Health Check Monitoring',
    rationale:
      'A service with no health endpoint is one the orchestrator cannot tell is dead — it keeps routing traffic to a corpse. A /health route is the smallest promise a service makes to the thing that runs it.',
    satisfiedBy: { typescript: 'Expose a /health (and /ready) route, check the database and external dependencies in it, and wire liveness/readiness probes.', python: 'A GET /health route in Flask/FastAPI (@app.get("/health")) is recognised natively.' },
    detectionLimits: [
      'Recognises a Python /health route, but the fallback matches ANY literal "/health" string in a .py file (even a comment or a downstream-service URL).',
      'For a Node service it fires database and external-dependency health violations unconditionally — a stateless service with no database cannot satisfy them short of the exact hard-coded filenames.',
      'Endpoint detection is confined to enumerated filenames / route files; a NestJS health.controller.ts or a dynamically-registered route is missed.',
    ],
    emoji: '💓',
    description: 'Comprehensive health checks for all deployed services',
    priority: 'HIGH',
    category: 'DEPLOYMENT',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkHealthCheckMonitoring',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VIII.8.10: Health check monitoring missing',
    remediation: 'Implement comprehensive health checks for all services',
  },
];
