/**
 * Whether a test file tests edge cases: the words its titles use and the
 * assertions and inputs its body holds. Moved out of the coverage analyzer
 * configuration unchanged; that configuration keeps its names for both
 * tables and delegates testsEdgeCases here.
 */
export class TestEdgeCases {
  /**
   * Edge case detection patterns (RULE 1: Centralized pattern definitions)
   * Note: Using /i flag only (not /gi) since these are used with .test()
   * which has issues with global regex state
   */
  static readonly TITLE_PATTERNS = {
    NULL_CHECK: /null/i,
    UNDEFINED_CHECK: /undefined/i,
    EMPTY_VALUE: /empty/i,
    ZERO_VALUE: /zero/i,
    NEGATIVE_VALUE: /negative/i,
    BOUNDARY_VALUE: /boundary/i,
    LIMIT_VALUE: /limit/i,
    MAX_VALUE: /max/i,
    MIN_VALUE: /min/i,
    EDGE_CASE: /edge\s*case/i,
    INVALID_VALUE: /invalid/i,
    ERROR_CASE: /error/i,
    EXCEPTION_CASE: /exception/i,

    // The words an integration test uses for the same idea. A spec whose title
    // says "and say so when unset" was counted as naming no edge case.
    UNSET_VALUE: /\bunset\b/i,
    MISSING_VALUE: /\bmissing\b/i,
    NOT_FOUND: /not found|no such|\bnever\b/i,
  } as const;

  /**
   * Edge-case signals in the test BODY — the assertions and inputs a real
   * edge-case test uses. The old check read only it()/describe() TITLES, so a
   * spec full of `.toThrow()`, null/undefined inputs and empty-collection
   * assertions was scored as testing NO edge cases — punishing exactly the
   * tests it should reward (a consumer's violations rose as they added genuine
   * edge-case specs). These are matched against the whole file.
   */
  static readonly BODY_PATTERNS = {
    TO_THROW: /\.toThrow/,
    REJECTS: /\.rejects\b/,
    TO_BE_NULL: /\.toBeNull\b/,
    TO_BE_UNDEFINED: /\.toBeUndefined\b/,
    TO_BE_NAN: /\.toBeNaN\b/,
    NULL_LITERAL: /\bnull\b/,
    UNDEFINED_LITERAL: /\bundefined\b/,
    NAN_LITERAL: /\bNaN\b/,
    INFINITY_LITERAL: /\bInfinity\b/,

    // ABSENCE, as a suite that drives a real page expresses it.
    //
    // Every pattern above names a JavaScript VALUE. An integration test has no
    // `null` to assert on: its degenerate cases are a list that must be empty,
    // a count that must not be zero, a route that must not be missing, a host
    // that must not be reached. The vocabulary is different, not absent — one
    // consumer had 11 of 13 reported files asserting exactly these, including
    // files that exist for nothing else.
    //
    // Nobody writes `toHaveCount(0)` on a happy path.
    EMPTY_LIST_MATCHER: /\.toEqual\(\s*\[\s*\]\s*\)/,
    EMPTY_COUNT: /\.toHaveCount\(\s*0\s*\)/,
    EMPTY_LENGTH: /\.toHaveLength\(\s*0\s*\)/,
    NEGATED_MATCHER: /\.not\.to[A-Z]\w+/,
  } as const;

  /**
   * Analyze if content tests edge cases using centralized patterns
   */
  static found(content: string): boolean {
    // Titles first — but capture the CANONICAL multiline form `it('title', () =>`.
    // The old regex required the quoted title to be immediately followed by `)`,
    // so it never matched a real test and always fell through to false.
    //
    // `test` is read as well as `it`. Playwright — and Jest, for anyone who
    // prefers it — declares tests with `test(...)`, and only `test.describe(...)`
    // survived a scan for `describe(`. A Playwright suite was therefore judged
    // on its describe titles alone and every test name inside it was invisible:
    // one consumer could read 24 titles out of 106, and a file written for
    // nothing but empty states was reported as testing no edge cases.
    //
    // Modifiers are allowed (`it.only`, `test.skip`, `test.describe`) because
    // the title follows them directly. The leading word boundary matters:
    // without it, `submit(` matched on its final `it`.
    const titles = [
      ...content.matchAll(
        /\b(?:it|test|describe)(?:\.\w+)*\s*\(\s*['"`]([^'"`]+)['"`]/g
      ),
    ]
      .map(match => match[1])
      .join(' ');
    if (
      Object.values(this.TITLE_PATTERNS).some(pattern => pattern.test(titles))
    ) {
      return true;
    }

    // ...then the body: a file that asserts throwing, or exercises
    // null/undefined/NaN, is testing edge cases whatever its titles say.
    return Object.values(this.BODY_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }
}
