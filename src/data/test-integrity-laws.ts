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
import {
  REQUIRES_JS_TEST_RUNNER,
  REQUIRES_PLAYWRIGHT,
  REQUIRES_REACT_TESTING_LIBRARY,
} from '../utils/testing/test-sources';

/** The limit every law that parses test files shares. */
const PARSED_WITH_PROJECT_TYPESCRIPT =
  "Parses with the project's own `typescript` (no type checker); without it installed the law reports that it could not read the files rather than passing.";
/** How the Playwright laws find Playwright files. */
const PLAYWRIGHT_FILES =
  'Playwright files are those under a playwright.config.* `testDir` (a string literal; otherwise the config\'s directory) that are tests or import @playwright/test, plus any test file importing it. A custom `testMatch` is not read, and a helper outside `testDir` that does not import the runner is not seen.';

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

  {
    id: generateLawId(
      'Playwright No Fixed Wait',
      'Playwright tests wait for a state, not for a fixed time',
      'testing'
    ),
    legacyId: 572,
    article: 'VII',
    subsection: '26.2',
    title: 'Playwright No Fixed Wait',
    rationale:
      "page.waitForTimeout(ms) waits for time, not for the state the test needs: where the app is slower the state is not there yet and the test fails, where it is faster the test idles. Playwright's own documentation of the method says it should only be used for debugging and that tests using the timer in production are going to be flaky.",
    satisfiedBy: {
      typescript:
        "Wait for the state itself: await expect(locator).toBeVisible(), page.waitForURL(), page.waitForResponse(). Where 'nothing happens within N ms' is the check, keep the pause and say why in a comment above it.",
    },
    detectionLimits: [
      'Finds `x.waitForTimeout(…)` calls; a sleep written as `new Promise(r => setTimeout(r, ms))` or a polling helper is not seen.',
      'A comment on the call\'s line or ending on the line directly above its statement exempts the call; whether the reason is true is not judged. An eslint directive counts only for the text after its `--`.',
      PLAYWRIGHT_FILES,
      PARSED_WITH_PROJECT_TYPESCRIPT,
    ],
    emoji: '⏱️',
    description: 'Playwright tests wait for a state, not for a fixed time',
    priority: 'MEDIUM',
    category: 'TESTING',
    stack: 'frontend',
    requires: REQUIRES_PLAYWRIGHT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PlaywrightNoFixedWaitLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.26.2: A Playwright test waits for a fixed time',
    remediation: 'Replace waitForTimeout with a web-first assertion or a wait for the event; explain the pauses that stay',
  },

  {
    id: generateLawId(
      'Playwright Locators User Facing',
      'Most Playwright locators find an element by role, label or text',
      'testing'
    ),
    legacyId: 573,
    article: 'VII',
    subsection: '26.3',
    title: 'Playwright Locators User Facing',
    rationale:
      'A locator by role, label or text fails when a user could no longer find the element either — the button lost its name, the field its label. A test id or a CSS selector keeps passing through both and breaks on a class rename no user sees. One locator cannot be judged alone, so the share is held to a floor.',
    satisfiedBy: {
      typescript:
        "Locate as a user does — page.getByRole('button', { name: 'Save' }), getByLabel('Email'), getByText('Welcome') — and keep getByTestId or a CSS locator for what has no stable role or text.",
    },
    detectionLimits: [
      'A ratio over all Playwright files: user-facing = getByRole/getByLabel/getByText/getByPlaceholder/getByAltText/getByTitle; implementation = getByTestId and every .locator() call (a `role=`/`text=` selector string and a locator passed as an argument count as implementation). $, $$ and waitForSelector are not counted.',
      'Cannot judge whether a chosen locator is meaningful; a ratio cannot judge one line. The floor is thresholds.testing.playwrightUserFacingLocatorPercent (0–100, default 50); a value outside that range is reported, never guessed.',
      'Zero locators in the Playwright files passes: there is nothing to share out.',
      PLAYWRIGHT_FILES,
      PARSED_WITH_PROJECT_TYPESCRIPT,
    ],
    emoji: '🎯',
    description: 'Most Playwright locators find an element by role, label or text',
    priority: 'LOW',
    category: 'TESTING',
    stack: 'frontend',
    requires: REQUIRES_PLAYWRIGHT,
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'CONFIGURABLE',
    checkFunction: 'PlaywrightLocatorsUserFacingLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.26.3: Too few Playwright locators are user-facing',
    remediation: 'Replace test-id and CSS locators with getByRole / getByLabel / getByText where the element has them',
  },

  {
    id: generateLawId(
      'RTL Query By Role',
      'Most React Testing Library queries find an element by role, label or text',
      'testing'
    ),
    legacyId: 574,
    article: 'VII',
    subsection: '26.4',
    title: 'RTL Query By Role',
    rationale:
      "Testing Library's queries by role, label and text find an element the way a user and assistive technology do, so the test fails when they could not find it either; getByTestId and container.querySelector keep passing through a broken label. Testing Library's own query priority puts the test id last. The React parallel of Angular Testing Excellence.",
    satisfiedBy: {
      react:
        "Query as a user does — screen.getByRole('button', { name: 'Save' }), getByLabelText('Email'), findByText('Saved') — and keep getByTestId for elements with no accessible role, label or text.",
    },
    detectionLimits: [
      'A ratio over all non-Playwright test files: user-facing = …ByRole/LabelText/PlaceholderText/Text/DisplayValue/AltText/Title; implementation = …ByTestId and querySelector/querySelectorAll in a file that uses Testing Library. The floor is a fixed 50%.',
      'Query names are matched by spelling (getBy/queryBy/findBy, All); a query renamed through a wrapper is not seen. Assertion quality is not judged.',
      'Selected by @testing-library/react; the query names are Testing Library\'s documented API, not verified against an installed copy on a reference project. Other Testing Library bindings are out of scope.',
      'Fails when @testing-library/react is declared but no scanned file imports it (directly or through a non-test wrapper): nothing would have been inspected.',
      PARSED_WITH_PROJECT_TYPESCRIPT,
    ],
    emoji: '🧭',
    description: 'Most React Testing Library queries find an element by role, label or text',
    priority: 'LOW',
    category: 'TESTING',
    stack: 'frontend',
    requires: REQUIRES_REACT_TESTING_LIBRARY,
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'RtlQueryByRoleLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VII.26.4: Too few Testing Library queries are user-facing',
    remediation: 'Replace getByTestId and querySelector with getByRole / getByLabelText / getByText where the element has them',
  },
];
