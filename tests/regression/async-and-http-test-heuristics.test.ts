import { AsyncTestAnalyzerConfiguration } from '../../src/utils/testing/async-test-analyzer/async-test-analyzer-configuration';
import { TestCoverageAnalyzerValidationPatterns } from '../../src/utils/testing/test-coverage-analyzer/test-coverage-analyzer-validation-patterns';

/**
 * Two heuristics that reported on code they had not looked at.
 *
 * Both were reported by a consumer where every instance was a false positive,
 * inside a law that is one of the larger contributors to their visible debt —
 * so the number read as test-quality debt that could not be paid.
 */
describe('async and HTTP test heuristics report what they can see', () => {
  const awaitsNonPromise = (source: string): boolean =>
    AsyncTestAnalyzerConfiguration.AWAITED_LITERAL.test(source);

  /**
   * The old pattern was `await\s+(?!\w+\(|\w+\.\w+\()[\w.]+(?!\()` — it excluded
   * one- and two-level calls and nothing deeper, and it could not see past the
   * end of a line.
   */
  describe('awaiting a promise is not awaiting a non-promise', () => {
    it.each([
      ["await page.keyboard.press('Escape');", 'a three-level call'],
      ['await a.b.c.d.e(1);', 'a five-level call'],
      ["await page.goto('/laws');", 'a two-level call'],
      ["await fetchThing('/api');", 'a plain call'],
      ['const p = doThing();\nawait p;', 'a promise held in a variable'],
      ['await new Promise(r => setTimeout(r, 10));', 'a constructed promise'],
    ])('accepts %s — %s', source => {
      expect(awaitsNonPromise(source)).toBe(false);
    });

    /**
     * The formatter wraps long chains, and the finding must not depend on where
     * it chose to break. Both spellings are the same expression.
     */
    it.each([
      [
        'await expect\n  .poll(() => page.evaluate(() => document.scrollWidth))\n  .toBeLessThanOrEqual(390);',
        'wrapped by the formatter',
      ],
      [
        'await expect.poll(() => page.evaluate(() => document.scrollWidth)).toBeLessThanOrEqual(390);',
        'on one line',
      ],
    ])('accepts a chain %s', source => {
      expect(awaitsNonPromise(source)).toBe(false);
    });

    // The red control: what the check CAN be right about still reports.
    it.each([
      ['await 5;', 'a number'],
      ['await -1;', 'a negative number'],
      ["await 'text';", 'a string'],
      ['await "text";', 'a double-quoted string'],
      ['await true;', 'a boolean'],
      ['await null;', 'null'],
      ['await undefined;', 'undefined'],
      ['await [first, second];', 'an array, where Promise.all was meant'],
    ])('reports %s — %s', source => {
      expect(awaitsNonPromise(source)).toBe(true);
    });

    /** `await { then() {} }` awaits a thenable, which is legitimate. */
    it('does not report an object literal, which may be a thenable', () => {
      expect(awaitsNonPromise('await { then(resolve) { resolve(1); } };')).toBe(
        false
      );
    });
  });

  /**
   * `HTTP calls should be mocked in unit tests` fired on
   * `content.includes('http')` over the whole file, so a URL in a comment was
   * read as a network request. The message then sent the reader looking for
   * code that was not there.
   */
  describe('an HTTP finding requires an HTTP call', () => {
    const reportsHttp = (source: string): boolean =>
      TestCoverageAnalyzerValidationPatterns.detectMockingIssues(source).some(
        issue => /HTTP calls/.test(issue)
      );

    it.each([
      ["// see https://example.com/docs\nit('works', () => {});", 'a URL in a comment'],
      ['const docs = "http://example.com";', 'a URL in a string'],
      ["import { A } from './http-utils';", 'a module path containing http'],
      ["it('works', () => { expect(1).toBe(1); });", 'no mention at all'],
    ])('says nothing about %s', source => {
      expect(reportsHttp(source)).toBe(false);
    });

    // The red control: a real request is still reported.
    it.each([
      ["const r = await fetch('/api');", 'fetch'],
      ["this.http.get<Thing>('/api/things')", 'HttpClient with a generic'],
      ["axios.post('/api', body)", 'axios.post'],
      ["got.get('/api')", 'got.get'],
      ['new XMLHttpRequest()', 'XMLHttpRequest'],
    ])('still reports %s — %s', source => {
      expect(reportsHttp(source)).toBe(true);
    });

    it('stays silent once the request is mocked', () => {
      expect(reportsHttp("jest.mock('./api');\nawait fetch('/api');")).toBe(
        false
      );
    });
  });
});
