import { UnitTestIsolationConstants } from '../../src/laws/testing/unit-test-isolation/constants/isolation';
import { UnitTestDataManagementConstants } from '../../src/laws/testing/unit-test-data-management/constants/data-management';
import { FixtureIsolation } from '../../src/utils/testing/fixture-isolation';

/**
 * `test-isolation-enforcement` reported three things about a browser-automation
 * suite, and each was an artefact of HOW it looked rather than of the code:
 *
 *  1. a `const` object at module scope counted as shared mutable state, though
 *     nothing ever wrote to it — and extracting those literals into a named
 *     constant is what `magic-number-prevention` demands in the same audit;
 *  2. the only `localStorage` in the file was a line of prose inside a block
 *     comment, explaining why a test had been deleted;
 *  3. the setup/teardown ratio counted a Playwright spec as un-isolated for
 *     having no `beforeEach`, when its per-test fixture is stronger isolation
 *     than a hook.
 *
 * The remedy each of these asked for was ceremony: re-inline the constants,
 * delete the explanation, add empty hooks. That is the edit this rule set
 * exists to argue against.
 */
describe('isolation is read from the code, not from its shape', () => {
  describe('a const that is never written to is not shared state', () => {
    it('does not flag a module-scope viewport constant', () => {
      const source = [
        "import { test, expect } from '@playwright/test';",
        'const PHONE = { width: 390, height: 844 };',
        "test('fits', async ({ page }) => {",
        '  await page.setViewportSize(PHONE);',
        '});',
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        false
      );
    });

    it('does not flag a frozen list of routes', () => {
      const source = [
        "const ROUTES = ['/', '/laws', '/why'];",
        "test('each route answers', async ({ page }) => {",
        '  for (const route of ROUTES) await page.goto(route);',
        '});',
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        false
      );
    });

    /** The red controls. A check that cannot say yes has stopped checking. */
    it('flags a const array that is pushed to', () => {
      const source = [
        'const seen = [];',
        "test('a', async ({ page }) => { seen.push(page.url()); });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        true
      );
    });

    it('flags a const object whose property is assigned', () => {
      const source = [
        'const cache = {};',
        "test('a', () => { cache.hit = 1; });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        true
      );
    });

    it('flags a const object mutated through an index', () => {
      const source = [
        'const cache = {};',
        "test('a', () => { cache['hit'] = 1; });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        true
      );
    });

    /**
     * Every declaration is examined, not just the first match. Stopping at the
     * first frozen constant would call the file isolated and never reach the
     * one that is mutated.
     */
    it('flags the SECOND const when the first is immutable', () => {
      const source = [
        'const PHONE = { width: 390, height: 844 };',
        'const seen = [];',
        "test('a', async ({ page }) => { seen.push(page.url()); });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        true
      );
    });

    it('still flags a module-scope let', () => {
      const source = [
        'let current = null;',
        "test('a', () => { current = 1; });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        true
      );
    });

    it('does not read a mutation written inside a comment as a mutation', () => {
      const source = [
        'const PHONE = { width: 390, height: 844 };',
        '// we used to do PHONE.width = 0 here; it broke the next test',
        "test('a', async ({ page }) => { await page.setViewportSize(PHONE); });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasSharedMutableState(source)).toBe(
        false
      );
    });
  });

  describe('prose about a resource is not use of a resource', () => {
    it('does not read localStorage named in a block comment as usage', () => {
      const source = [
        '/**',
        ' * The localStorage assertion was removed: the banner no longer',
        ' * persists a dismissal, so there was nothing left to read back.',
        ' */',
        "test('shows the banner', async ({ page }) => {",
        "  await expect(page.locator('.banner')).toBeVisible();",
        '});',
      ].join('\n');
      expect(UnitTestIsolationConstants.usesExternalResources(source)).toBe(
        false
      );
    });

    it('does not read fetch named in a line comment as usage', () => {
      const source = "// no fetch( here — the route is stubbed by the fixture";
      expect(UnitTestIsolationConstants.usesExternalResources(source)).toBe(
        false
      );
    });

    /** The red control: real usage must still be found. */
    it('still finds localStorage that the test actually calls', () => {
      const source = "test('a', () => { localStorage.setItem('k', 'v'); });";
      expect(UnitTestIsolationConstants.usesExternalResources(source)).toBe(
        true
      );
    });

    it('still finds a real fetch call', () => {
      const source = "test('a', async () => { await fetch('/api'); });";
      expect(UnitTestIsolationConstants.usesExternalResources(source)).toBe(
        true
      );
    });
  });

  describe('a runner fixture is isolation', () => {
    const playwrightSpec = [
      "import { test, expect } from '@playwright/test';",
      "test('renders the masthead', async ({ page }) => {",
      "  await page.goto('/');",
      "  await expect(page.locator('roc-masthead')).toBeVisible();",
      '});',
    ].join('\n');

    it('accepts a Playwright spec with no hook at all', () => {
      expect(
        UnitTestIsolationConstants.hasProperSetupTeardown(playwrightSpec)
      ).toBe(true);
    });

    it('gives the twin data-management check the same answer', () => {
      expect(
        UnitTestDataManagementConstants.hasProperSetupTeardown(playwrightSpec)
      ).toBe(true);
    });

    it('accepts a fixture destructured on a modified test', () => {
      const source = [
        "import { test } from '@playwright/test';",
        "test.describe('mobile', () => {",
        "  test.use({ viewport: { width: 390, height: 844 } });",
        "  test('scrolls', async ({ page }) => { await page.goto('/'); });",
        '});',
      ].join('\n');
      expect(UnitTestIsolationConstants.hasProperSetupTeardown(source)).toBe(
        true
      );
    });

    /**
     * The red controls. The runner has to be imported AND the fixture actually
     * destructured — otherwise this becomes a blanket pass for any file that
     * mentions Playwright.
     */
    it('rejects a Playwright import whose tests take no fixture', () => {
      const source = [
        "import { test, expect } from '@playwright/test';",
        "test('pure', async () => { expect(1 + 1).toBe(2); });",
      ].join('\n');
      expect(FixtureIsolation.isFixtureIsolated(source)).toBe(false);
      expect(UnitTestIsolationConstants.hasProperSetupTeardown(source)).toBe(
        false
      );
    });

    it('rejects a Jest spec that destructures nothing and has no hook', () => {
      const source = [
        "import { reduce } from './reduce';",
        "it('adds', () => { expect(reduce([1, 2])).toBe(3); });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasProperSetupTeardown(source)).toBe(
        false
      );
    });

    it('does not accept a Playwright import that only a comment mentions', () => {
      const source = [
        "// ported from '@playwright/test' to jest",
        "it('adds', () => { expect(1).toBe(1); });",
      ].join('\n');
      expect(FixtureIsolation.isFixtureIsolated(source)).toBe(false);
    });

    it('still accepts a Jest spec that has a beforeEach', () => {
      const source = [
        'beforeEach(() => { jest.clearAllMocks(); });',
        "it('adds', () => { expect(1).toBe(1); });",
      ].join('\n');
      expect(UnitTestIsolationConstants.hasProperSetupTeardown(source)).toBe(
        true
      );
    });
  });
});
