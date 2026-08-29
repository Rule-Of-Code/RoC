import { CodeText } from '../code-text';

/**
 * Isolation the RUNNER supplies, which no hook in the file can show.
 *
 * The setup/teardown checks look for `beforeEach` / `afterEach` and read their
 * absence as "these tests share state". That reading holds for a unit-test file,
 * where the author is responsible for resetting whatever the previous test
 * touched. It does not hold for a browser-automation runner that constructs the
 * world per test.
 *
 * Playwright hands each test its own BrowserContext and Page through the
 * destructured fixture argument — `test('…', async ({ page }) => …)`. Nothing
 * survives between tests: not cookies, not storage, not the DOM. That is
 * stronger isolation than a `beforeEach`, not its absence.
 *
 * Without this, the only way to satisfy the check is to add empty hooks whose
 * sole purpose is to be found — a change that moves a percentage and touches
 * nothing about whether the tests are actually isolated.
 */
export class FixtureIsolation {
  /** Runners whose per-test fixture replaces a setup hook. */
  private static readonly RUNNER_IMPORT =
    /from\s+['"](?:@playwright\/test|@playwright\/experimental-ct-\w+)['"]/;

  /**
   * The fixture must be DESTRUCTURED to count. A Playwright file may still
   * contain `test('x', async () => {})` — that test takes no fixture, gets no
   * page of its own, and proves nothing about isolation.
   */
  private static readonly DESTRUCTURED_FIXTURE =
    /\b(?:test|it)\s*(?:\.\w+)*\s*\(\s*[^)]*?,\s*async\s*\(\s*\{/;

  static isFixtureIsolated(content: string): boolean {
    const code = CodeText.stripComments(content);
    return (
      this.RUNNER_IMPORT.test(code) && this.DESTRUCTURED_FIXTURE.test(code)
    );
  }
}
