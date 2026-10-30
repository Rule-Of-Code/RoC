import { CodeText } from '../code-text';

/** The first files of a finding by name, and how many more there are. */
export function namedFiles(files: string[], shown = 5): string {
  const named = files.slice(0, shown).join('; ');
  return files.length > shown
    ? `${named}; and ${files.length - shown} more`
    : named;
}

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

  /**
   * Browser storage belongs to a BrowserContext. Where every test gets its own
   * context, a value one test writes to localStorage is unreachable from the
   * next, and an `afterEach` clearing it would clear storage nothing can see.
   *
   * Not where a `beforeAll` exists: that is how a Playwright file shares one
   * page across tests (`page = await browser.newPage()`), and then storage
   * does leak.
   */
  static isolatesBrowserStorage(content: string): boolean {
    return (
      this.isFixtureIsolated(content) &&
      !/\bbeforeAll\s*\(/.test(CodeText.stripComments(content))
    );
  }

  /**
   * The external resources a test file reaches, as the matched text, from its
   * CODE — a comment describing a resource is not a test using one. Browser
   * storage is left out where the runner isolates it. Databases, sockets,
   * files and network calls are kept: they live outside the browser context.
   *
   * `patterns` is the calling law's own table; `STORAGE` is the key both
   * isolation laws use for browser storage.
   */
  static resourcesUsed(
    content: string,
    patterns: Record<string, RegExp>
  ): string[] {
    const code = CodeText.stripComments(content);
    const storageIsolated = this.isolatesBrowserStorage(content);
    const used = new Set<string>();
    for (const [kind, pattern] of Object.entries(patterns)) {
      if (kind === 'STORAGE' && storageIsolated) continue;
      const match = code.match(pattern);
      if (match) used.add(match[0]);
    }
    return [...used];
  }
}
