import { TestCoverageAnalyzerConfiguration } from '../../src/utils/testing/test-coverage-analyzer/test-coverage-analyzer-configuration';

/**
 * Every body pattern named a JavaScript VALUE — `null`, `undefined`, `NaN`,
 * `.toThrow`, `.rejects`. A suite that drives a real page has no `null` to
 * assert on: its degenerate cases are a list that must be empty, a count that
 * must not be zero, a route that must not be missing, a host that must not be
 * reached.
 *
 * The vocabulary is different, not absent. One consumer measured 11 of 13
 * reported files asserting exactly these — including files that exist for
 * nothing else, and one whose title says "and say so when unset" in English.
 *
 * Follow-on to #102, which made Playwright titles readable at all.
 */
describe('edge cases are recognised in an integration suite’s vocabulary', () => {
  const readsEdgeCases = (source: string): boolean =>
    TestCoverageAnalyzerConfiguration.testsEdgeCases(source);

  describe('absence, as an integration test asserts it', () => {
    it.each([
      ["expect(strangers).toEqual([]);", 'an empty list'],
      ["await expect(page.locator('.err')).toHaveCount(0);", 'a zero count'],
      ['expect(missing).toHaveLength(0);', 'a zero length'],
      ["await expect(page.locator('.spinner')).not.toBeVisible();", 'a negated matcher'],
    ])('reads %s — %s', (source, _label) => {
      expect(readsEdgeCases(source)).toBe(true);
    });

    it('reads a whitespace-tolerant empty list', () => {
      expect(readsEdgeCases('expect(rows).toEqual( [ ] );')).toBe(true);
    });
  });

  describe('the words an integration test uses in its titles', () => {
    it.each([
      ["test('should say so when unset', () => {});", 'unset'],
      ["test('reports a missing route', () => {});", 'missing'],
      ["test('renders a not found page', () => {});", 'not found'],
      ["test('there is no such law', () => {});", 'no such'],
      ["test('never reaches a foreign host', () => {});", 'never'],
    ])('reads %s — %s', (source, _label) => {
      expect(readsEdgeCases(source)).toBe(true);
    });
  });

  /**
   * The red controls. Widening the vocabulary must not make every suite pass:
   * a law that cannot say no has stopped being a law.
   */
  describe('a happy-path suite is still a happy-path suite', () => {
    it.each([
      ["test('renders the header', async () => { await expect(h).toBeVisible(); });"],
      ["test('navigates to start', async () => { await expect(page).toHaveURL(/start/); });"],
      ["test('shows one description', async () => { await expect(d).toHaveCount(1); });"],
      ["test('links to the law', async () => { await expect(a).toHaveAttribute('href', /x/); });"],
    ])('says nothing about %s', source => {
      expect(readsEdgeCases(source)).toBe(false);
    });

    /** A non-zero count is not an absence assertion. */
    it('does not read toHaveCount(1) as an edge case', () => {
      expect(readsEdgeCases('await expect(x).toHaveCount(1);')).toBe(false);
    });

    it('does not read a non-empty toEqual as an edge case', () => {
      expect(readsEdgeCases('expect(rows).toEqual([1, 2, 3]);')).toBe(false);
    });
  });

  /** What #102 fixed must keep working. */
  it('still reads the value vocabulary it always did', () => {
    expect(readsEdgeCases('expect(() => f()).toThrow();')).toBe(true);
    expect(readsEdgeCases("test('handles an empty result', () => {});")).toBe(
      true
    );
  });
});
