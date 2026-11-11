/**
 * Test Integrity Laws Data Module
 *
 * Whether a green test run means what it says: a focused test that skipped
 * the rest, a fixed sleep that passes on one machine, locators and queries
 * that keep passing after a user could no longer find the element, and test
 * fakes that reach the production build. Each law is gated by `requires` on
 * the runner or library it reads, and reads test files as syntax with the
 * project's own TypeScript. legacyId range: 571+.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_JS_TEST_RUNNER } from '../utils/testing/test-sources';

/** The limit every law that parses test files shares. */
const PARSED_WITH_PROJECT_TYPESCRIPT =
  "Parses with the project's own `typescript` (no type checker); without it installed the law reports that it could not read the files rather than passing.";

export const TEST_INTEGRITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'No Focused Tests',
      'No committed .only, fit or fdescribe narrows the test run',
      'testing'
    ),
    legacyId: 571,
    article: 'VII',
    subsection: '26.1',
    title: 'No Focused Tests',
    rationale:
      'A focus runs the focused tests and skips the rest, and the run still exits green. jest-circus marks every unfocused test in a file with a focused one as skipped, and neither Jest 29.7 nor 30.3 has an option that refuses a focus; Playwright refuses one only when forbidOnly is set. A focus committed by accident turns the suite into a gate that checks one test.',
    satisfiedBy: {
      typescript:
        'Commit no .only, fit or fdescribe in a test file; and make CI refuse one as well — forbidOnly: !!process.env.CI in playwright.config, --forbid-only for Mocha.',
    },
    detectionLimits: [
      'Reads .spec/.test/.cy/.e2e-spec files (.ts/.tsx/.js/.jsx and .mts/.cts/.mjs/.cjs) and files under __tests__; a runner configured to run other file names is not followed.',
      'A `.only` counts on it/test/describe/context/specify/suite, or on any base when the call has a title and a function (a fixture-extended `authTest.only`). A focus on a test function aliased under another name without that shape is not seen.',
      'Does not judge `.skip` (a separate decision) or a focus applied from the command line (`--testNamePattern`, `-g`).',
      'JavaScript/TypeScript runners only; Python has no focus modifier in pytest itself.',
      PARSED_WITH_PROJECT_TYPESCRIPT,
    ],
    emoji: '🔦',
    description: 'No committed .only, fit or fdescribe narrows the test run',
    priority: 'HIGH',
    category: 'TESTING',
    stack: 'typescript',
    requires: REQUIRES_JS_TEST_RUNNER,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NoFocusedTestsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.26.1: A focused test narrows the run',
    remediation: 'Remove .only / fit / fdescribe; set forbidOnly (Playwright) or --forbid-only (Mocha) in CI',
  },
];
