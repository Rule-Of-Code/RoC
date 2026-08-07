/**
 * Testing Laws Data Module
 * Laws for test coverage, E2E testing, and quality assurance
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const TESTING_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Test Coverage Constitutional Standard',
      'Every feature MUST have tests before merge, ≥80% coverage for new code',
      'testing'
    ),
    legacyId: 60,
    section: '7',
    subsection: '7.1',
    title: 'Test Coverage Constitutional Standard',
    rationale:
      'Code without tests is code nobody can change without fear — every edit is a guess about what it might break. Coverage is not the goal, but its absence guarantees the goal was never pursued.',
    satisfiedBy: { typescript: 'Configure Jest (a config + a test script + coverage) and keep tests alongside your source.', python: 'Configure pytest coverage (--cov with a fail_under, or [tool.coverage]) — recognised natively.' },
    detectionLimits: [
      'Presence, not a number: it checks that a test runner and coverage CONFIG exist plus a source-to-test FILE ratio — never the actual line/branch coverage percentage.',
      'Jest-biased for JS/TS — a project on Karma/Jasmine with no jest config trips "No Jest configuration found".',
      'Only the Python stack gets a non-Jest exemption; React/Vue/Node do not.',
    ],
    emoji: '🧪',
    description:
      'Every feature MUST have tests before merge, ≥80% coverage for new code',
    priority: 'HIGH',
    category: 'TESTING',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'TestCoverageConstitutionalStandardLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 7.1: Test coverage below constitutional standard',
    remediation:
      'Add comprehensive tests: unit, integration, E2E for all new features',
  },

  {
    id: generateLawId(
      'E2E Testing Standards',
      'Every major user flow MUST have corresponding E2E test coverage',
      'testing'
    ),
    legacyId: 61,
    section: '7',
    subsection: '7.2',
    title: 'E2E Testing Standards',
    rationale:
      'Unit tests prove the pieces work; only an end-to-end test proves the assembled product does. The gap between them is where the demo breaks.',
    satisfiedBy: { typescript: 'Add an E2E framework (Cypress/Playwright) with a config and real *.e2e-spec / *.cy specs.', angular: 'A Cypress or Playwright suite that drives the running app.' },
    detectionLimits: [
      'Pure presence — it never opens a spec; an empty Cypress config with zero real tests passes.',
      'Runs only for detected applications (Angular/React/Vue/Nest/Next); libraries are exempt, and a pure-Python app is skipped rather than failed.',
      'Reads package.json deps and JS/TS globs only — a Playwright-Python / pytest-bdd suite is invisible.',
    ],
    emoji: '🎭',
    description:
      'Every major user flow MUST have corresponding E2E test coverage',
    priority: 'HIGH',
    category: 'TESTING',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkE2ETestingStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 7.2: E2E testing coverage insufficient',
    remediation:
      'Create E2E tests for all major user flows: login, booking, payment',
  },

  {
    id: generateLawId(
      'Unit Test Quality Standards',
      'Tests MUST cover edge cases, error scenarios, and user interactions',
      'testing'
    ),
    legacyId: 62,
    section: '7',
    subsection: '7.3',
    title: 'Unit Test Quality Standards',
    rationale:
      'A test that asserts nothing, mocks nothing, or covers only the happy path is a green light with no wiring behind it. Quality is what turns a test from decoration into a guarantee.',
    satisfiedBy: { typescript: 'Write focused it()/describe() blocks with real assertions, handle async with await/fakeAsync, and mock external dependencies.' },
    detectionLimits: [
      'Edge-case and mock detection are keyword heuristics (imports imply "has dependencies"; jest.mock/spyOn imply mocks) — a test that mocks via a helper import is misread; no semantics.',
      'It counts structure, not assertion strength; a test with one weak assertion passes.',
      'TS/JS .spec/.test files only — no Python. realDataMode suppresses the no-mocking / hardcoded-data findings for projects that test against real data by design.',
    ],
    stack: 'typescript',
    emoji: '⚖️',
    description:
      'Tests MUST cover edge cases, error scenarios, and user interactions',
    priority: 'HIGH',
    category: 'TESTING',
    automation: 'MANUAL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkUnitTestQuality',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 7.3: Unit test quality below standards',
    remediation:
      'Add tests for edge cases, error handling, and boundary conditions',
  },

  {
    id: generateLawId(
      'Angular Testing Excellence Policy',
      'Use TestBed properly, mock dependencies, test user interactions and edge cases',
      'testing'
    ),
    legacyId: 63,
    section: '6',
    subsection: '6.20',
    title: 'Angular Testing Excellence Policy',
    rationale:
      'An Angular test that never touches TestBed is testing a class, not a component — it misses the template, change detection and DI that make it Angular. Excellence is testing the thing as it actually runs.',
    satisfiedBy: { angular: 'Use TestBed + ComponentFixture in component specs, TestBed.inject in service specs, async/fakeAsync for Observables, and "should" descriptions.' },
    detectionLimits: [
      'Coverage is a test-file-to-source FILE ratio (default 80%), not real coverage.',
      'Substring checks: a "TestBed" in a comment passes, and its absence fails a genuinely-fine test; the "must start with should" rule is stylistic and easily false-positive.',
      'Angular-gated; string matching, no AST.',
    ],
    stack: 'frontend',
    emoji: '🔬',
    description:
      'Use TestBed properly, mock dependencies, test user interactions and edge cases',
    priority: 'HIGH',
    category: 'TESTING',
    automation: 'MANUAL',
    defaultEnabled: false, // Angular-specific
    defaultSeverity: 'error',
    checkFunction: 'checkAngularTestingExcellence',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.20: Testing standards not met',
    remediation:
      'Implement comprehensive Angular tests with proper mocking and user interaction testing',
  },

  {
    id: generateLawId(
      'Professional Component Testing Policy',
      'Every component MUST have corresponding .spec.ts file with ≥80% coverage',
      'testing'
    ),
    legacyId: 64,
    section: '6',
    subsection: '6.11',
    title: 'Professional Component Testing Policy',
    rationale:
      'A component test that does not configure a TestBed, assert an output, or exercise an interaction is testing that the component can be constructed, not that it works. This law asks for tests that actually drive it.',
    satisfiedBy: { angular: 'Give each *.component.ts a spec that configures TestBed, renders via ComponentFixture, and asserts on inputs/outputs or user interaction.' },
    detectionLimits: [
      'Only *.component.ts / *.component.spec.ts naming — a component test under another name is invisible, and non-Angular component tests are out of scope.',
      'All regex over spec text (a TestBed in a comment counts); test coverage defaults to 100% when no components are found.',
      'Angular component naming only — no Python, and no non-Angular component frameworks.',
    ],
    stack: 'frontend',
    emoji: '🧩',
    description:
      'Every component MUST have corresponding .spec.ts file with ≥80% coverage',
    priority: 'HIGH',
    category: 'TESTING',
    automation: 'AUTOMATED',
    defaultEnabled: false, // Angular-specific
    defaultSeverity: 'error',
    checkFunction: 'checkComponentTesting',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.11: Component missing tests or insufficient coverage',
    remediation: 'Create .spec.ts file with comprehensive test coverage ≥80%',
  },

  // Extended Testing Laws (65-69)
  {
    id: generateLawId(
      'Test Data Management',
      'Proper test data setup and teardown procedures',
      'testing'
    ),
    legacyId: 65,
    article: 'VII',
    subsection: '7.6',
    title: 'Test Data Management',
    rationale:
      'Tests that share hardcoded data or leak state between runs are flaky by construction — one test’s leftover is the next test’s mystery failure. Managed test data is what makes a suite deterministic.',
    satisfiedBy: { typescript: 'Use beforeEach/afterEach for setup and teardown, build data via factories/builders, and mock external resources.' },
    detectionLimits: [
      'Project-wide OR: a SINGLE file with beforeEach marks the whole project as having setup.',
      'Hardcoded-data detection is a crude 20-char-string-literal heuristic; factory detection keys off filenames (factory/builder/fixture/mock/test-data).',
      'JS/TS .spec/.test files only — no Python. realDataMode suppresses the hardcoded-data finding.',
    ],
    emoji: '📊',
    description: 'Proper test data setup and teardown procedures',
    priority: 'MEDIUM',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkTestDataManagement',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.6: Test data management issues',
    remediation: 'Implement proper test data setup/teardown and mocking',
  },

  {
    id: generateLawId(
      'Test Isolation Enforcement',
      'All tests must be isolated and independent',
      'testing'
    ),
    legacyId: 66,
    article: 'VII',
    subsection: '7.7',
    title: 'Test Isolation Enforcement',
    rationale:
      'A test that depends on another test’s side effects passes in one order and fails in another — and CI runs them in whatever order it likes. Isolation is what makes a green suite mean the same thing every time.',
    satisfiedBy: { typescript: 'Keep no mutable state at module scope in specs, pair setup with teardown, and avoid it.only/fit and global-state writes.' },
    detectionLimits: [
      'Flags ANY module-level object/array const in a spec as "shared mutable state", even one never mutated — noisy false positives.',
      'it.only/fit are flagged as an order dependency (really a focus/CI concern), and a lone describe() satisfies "framework isolation".',
      'Regex over JS/TS test files only — no Python.',
    ],
    emoji: '🏝️',
    description: 'All tests must be isolated and independent',
    priority: 'HIGH',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkTestIsolationEnforcement',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.7: Test isolation compromised',
    remediation: 'Ensure tests do not depend on each other or shared state',
  },

  {
    id: generateLawId(
      'API Testing Standards',
      'Comprehensive API testing with proper assertions',
      'testing'
    ),
    legacyId: 67,
    article: 'VII',
    subsection: '7.8',
    title: 'API Testing Standards',
    rationale:
      'An API that is not tested at its edge — its methods, its error paths — is one you find out about in production, from a 500. This law asks that the contract be exercised, not assumed.',
    satisfiedBy: { typescript: 'Test each HTTP method and error scenario with supertest/Jest, and mock upstreams with msw/nock.', python: 'pytest against the app’s test client, asserting status codes and error paths — recognised natively.' },
    detectionLimits: [
      'Presence, not content: HTTP-method "coverage" is a very loose regex (the word GET anywhere, any .get(), any 4xx-looking number).',
      'API test files are found by filename, and only .ts (no .js).',
      'Python gets a native pass via test-client tests; otherwise it is Jest/supertest-shaped.',
    ],
    emoji: '🔌',
    description: 'Comprehensive API testing with proper assertions',
    priority: 'HIGH',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkAPITestingStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.8: API testing standards not met',
    remediation: 'Implement comprehensive API tests with proper mocking',
  },

  {
    id: generateLawId(
      'Performance Test Requirements',
      'Performance testing for critical user flows',
      'testing'
    ),
    legacyId: 68,
    article: 'VII',
    subsection: '7.9',
    title: 'Performance Test Requirements',
    rationale:
      'A feature that is correct but slow still fails the user. Performance tests turn "it feels fast" into a number that a regression cannot quietly cross.',
    satisfiedBy: { angular: 'Add perf/load tests (k6/artillery), a bundle-size budget, and web-vitals (LCP/CLS/INP) tracking for critical flows.' },
    detectionLimits: [
      'Entirely presence-of-tooling by keyword — it measures no actual performance number.',
      'Bundle-size and web-vitals are browser-only and there is NO Python path, so a Python service is scored on browser concerns it cannot have.',
      'A pass requires perf files AND load config AND bundle-size AND web-vitals AND monitoring AND critical-flow keywords together.',
    ],
    stack: 'frontend',
    emoji: '⚡',
    description: 'Performance testing for critical user flows',
    priority: 'MEDIUM',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkPerformanceTestRequirements',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.9: Performance testing missing',
    remediation: 'Add PerformanceTestUtils for critical application flows',
  },

  {
    id: generateLawId(
      'Test Documentation Requirements',
      'All test suites must have proper documentation',
      'testing'
    ),
    legacyId: 69,
    article: 'VII',
    subsection: '7.10',
    title: 'Test Documentation Requirements',
    rationale:
      'A test suite nobody can read is one nobody will maintain — the next engineer deletes the failing test instead of understanding it. Documentation is what keeps a suite alive past its author.',
    satisfiedBy: { typescript: 'Keep a TESTING.md (or a documented strategy), clear it()/describe() descriptions, and comments on non-obvious setup.' },
    detectionLimits: [
      '"Documentation" = presence of doc files (a min length) plus comment/description heuristics — it cannot judge whether the docs are useful.',
      'Structure-doc coverage is a heuristic ratio, not a real measure.',
      'Regex/string over JS/TS test files; no Python.',
    ],
    emoji: '📝',
    description: 'All test suites must have proper documentation',
    priority: 'LOW',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'MANUAL',
    checkFunction: 'checkTestDocumentationRequirements',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.10: Test documentation missing',
    remediation: 'Add comprehensive documentation for all test suites',
  },

  // NEW LAW: 100% Jest Unit Test Coverage
  {
    id: generateLawId(
      'Jest Unit Test 100% Coverage Mandate',
      'ALL unit tests MUST achieve 100% code coverage using Jest testing framework',
      'testing'
    ),
    legacyId: 70,
    article: 'VII',
    subsection: '7.11',
    title: 'Jest Unit Test 100% Coverage Mandate',
    rationale:
      'A coverage target below 100% is a decision about which lines are allowed to go untested — and that decision is almost never made deliberately. This law is the forcing function for the last, hardest, most bug-dense lines.',
    satisfiedBy: { typescript: 'Configure Jest with coverageThreshold at 100 for lines/functions/branches/statements and keep the suite green against it.' },
    detectionLimits: [
      'It verifies that SOME coverage config exists, not that the thresholds are 100 — a project with coverageThreshold 50 satisfies the "100%" mandate unless a coverage-summary.json artifact is committed.',
      'The "source files lack unit tests" check does not currently fire.',
      'Jest/Node only — a pytest project fails with "Jest not configured".',
    ],
    stack: 'typescript',
    emoji: '🎯',
    description:
      'ALL unit tests MUST achieve 100% code coverage using Jest testing framework',
    priority: 'CRITICAL',
    category: 'TESTING',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkJestUnitTest100Coverage',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.7.11: Jest unit test coverage below 100% - UNACCEPTABLE',
    remediation:
      'Achieve 100% unit test coverage using Jest framework - no exceptions allowed',
  },
];
