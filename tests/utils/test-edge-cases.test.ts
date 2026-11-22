/**
 * TestEdgeCases — the edge-case vocabulary of Unit Test Quality, moved out
 * of the coverage analyzer configuration, which still exposes both tables
 * under their old names and delegates testsEdgeCases here.
 */
import { TestCoverageAnalyzerConfiguration } from '../../src/utils/testing/test-coverage-analyzer/test-coverage-analyzer-configuration';
import { TestEdgeCases } from '../../src/utils/testing/test-coverage-analyzer/test-edge-cases';

describe('TestEdgeCases', () => {
  it('reads an edge case from a title', () => {
    expect(
      TestEdgeCases.found("it('returns 0 for an empty list', () => {});")
    ).toBe(true);
  });

  it('reads an edge case from the body', () => {
    expect(TestEdgeCases.found('expect(() => run(null)).toThrow();')).toBe(
      true
    );
  });

  it('finds none in a happy-path test', () => {
    expect(
      TestEdgeCases.found("it('adds', () => { expect(sum(1, 2)).toBe(3); });")
    ).toBe(false);
  });

  it('is what the configuration answers, with the same tables', () => {
    const source = "it('handles a missing value', () => {});";
    expect(TestCoverageAnalyzerConfiguration.testsEdgeCases(source)).toBe(
      TestEdgeCases.found(source)
    );
    expect(TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS).toBe(
      TestEdgeCases.TITLE_PATTERNS
    );
    expect(TestCoverageAnalyzerConfiguration.EDGE_CASE_BODY_PATTERNS).toBe(
      TestEdgeCases.BODY_PATTERNS
    );
  });
});
