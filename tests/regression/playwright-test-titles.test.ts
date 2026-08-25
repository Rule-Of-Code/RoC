import { TestCoverageAnalyzerConfiguration } from '../../src/utils/testing/test-coverage-analyzer/test-coverage-analyzer-configuration';

/**
 * A test can be declared three ways. The title extractor read two of them.
 *
 * Playwright declares tests with `test(...)`, not `it(...)`. Only
 * `test.describe(...)` survived, because the substring `describe(` matched — so
 * a Playwright suite was judged on its describe titles alone and every test
 * name inside it was invisible. One consumer could read 24 titles out of 106,
 * and a file written for nothing but empty states was reported as having no
 * edge-case testing.
 */
describe('edge-case detection reads every way a test is named', () => {
  const readsEdgeCases = (source: string): boolean =>
    TestCoverageAnalyzerConfiguration.testsEdgeCases(source);

  it.each([
    ["test('handles an empty result', async () => {});", 'Playwright test()'],
    ["it('handles an empty result', () => {});", 'Jest it()'],
    ["describe('empty states', () => {});", 'describe()'],
    ["test.describe('empty states', () => {});", 'test.describe()'],
    ["it.only('rejects an invalid id', () => {});", 'it.only()'],
    ["test.skip('errors on a null payload', () => {});", 'test.skip()'],
  ])('reads a title declared with %s — %s', source => {
    expect(readsEdgeCases(source)).toBe(true);
  });

  /**
   * The red controls. Widening what counts as a declaration must not widen what
   * counts as an edge case, and must not start matching ordinary code.
   */
  it('says nothing about a suite with no edge-case signal at all', () => {
    expect(
      readsEdgeCases("test('renders the header', async () => { await page.goto('/'); });")
    ).toBe(false);
  });

  /**
   * Without a leading word boundary, `submit(` matched on its final `it`.
   *
   * The fixtures avoid words the BODY scan legitimately catches — `null`,
   * `undefined`, `.toThrow` — because that scan reads the whole file by design
   * and would answer true for a reason that has nothing to do with titles.
   */
  it.each([
    ["submit('an empty form', data);", 'submit('],
    ["await commit('empty branch');", 'commit('],
    ["const granted = permit('limited access');", 'permit('],
  ])('does not read %s as a test declaration — %s', source => {
    expect(readsEdgeCases(source)).toBe(false);
  });

  /**
   * A wrapped declaration is the same declaration. Prettier breaks long
   * Playwright lines, and a finding must not depend on line width.
   */
  it('reads a title split across lines by the formatter', () => {
    const wrapped = [
      'test(',
      "  'should restore the full register when the empty search is cleared',",
      '  async ({ page }) => {}',
      ');',
    ].join('\n');

    expect(readsEdgeCases(wrapped)).toBe(true);
  });
});
