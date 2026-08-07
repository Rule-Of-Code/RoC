/**
 * Tests for TestCoverageAnalyzerConfiguration
 *
 * Tests the test coverage analyzer configuration patterns and methods.
 */
import { TestCoverageAnalyzerConfiguration } from '../../src/utils/testing/test-coverage-analyzer/test-coverage-analyzer-configuration';

describe('TestCoverageAnalyzerConfiguration', () => {
  describe('constants', () => {
    it('should have MOCKING_TO_TEST_RATIO_THRESHOLD as 2', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_TO_TEST_RATIO_THRESHOLD
      ).toBe(2);
    });

    it('should have INTERNAL_MOCKS_THRESHOLD as 3', () => {
      expect(TestCoverageAnalyzerConfiguration.INTERNAL_MOCKS_THRESHOLD).toBe(
        3
      );
    });

    it('should have COVERAGE_SCORE_MULTIPLIER as 10', () => {
      expect(TestCoverageAnalyzerConfiguration.COVERAGE_SCORE_MULTIPLIER).toBe(
        10
      );
    });

    it('should have MOCK_PATTERN_MULTIPLIER regex', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERN_MULTIPLIER
      ).toBeDefined();
    });

    it('should have INTERNAL_MOCK_PATTERN regex', () => {
      expect(
        TestCoverageAnalyzerConfiguration.INTERNAL_MOCK_PATTERN
      ).toBeDefined();
    });
  });

  describe('EDGE_CASE_PATTERNS', () => {
    it('should have NULL_CHECK pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.NULL_CHECK.test(
          'null'
        )
      ).toBe(true);
    });

    it('should have UNDEFINED_CHECK pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.UNDEFINED_CHECK.test(
          'undefined'
        )
      ).toBe(true);
    });

    it('should have EMPTY_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.EMPTY_VALUE.test(
          'empty'
        )
      ).toBe(true);
    });

    it('should have ZERO_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.ZERO_VALUE.test(
          'zero'
        )
      ).toBe(true);
    });

    it('should have NEGATIVE_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.NEGATIVE_VALUE.test(
          'negative'
        )
      ).toBe(true);
    });

    it('should have BOUNDARY_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.BOUNDARY_VALUE.test(
          'boundary'
        )
      ).toBe(true);
    });

    it('should have LIMIT_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.LIMIT_VALUE.test(
          'limit'
        )
      ).toBe(true);
    });

    it('should have MAX_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.MAX_VALUE.test(
          'max'
        )
      ).toBe(true);
    });

    it('should have MIN_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.MIN_VALUE.test(
          'min'
        )
      ).toBe(true);
    });

    it('should have EDGE_CASE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.EDGE_CASE.test(
          'edge case'
        )
      ).toBe(true);
    });

    it('should have INVALID_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.INVALID_VALUE.test(
          'invalid'
        )
      ).toBe(true);
    });

    it('should have ERROR_CASE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.ERROR_CASE.test(
          'error'
        )
      ).toBe(true);
    });

    it('should have EXCEPTION_CASE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_PATTERNS.EXCEPTION_CASE.test(
          'exception'
        )
      ).toBe(true);
    });
  });

  describe('testsEdgeCases() — recognises edge cases in the BODY, not just titles', () => {
    it('recognises a real edge-case spec whose title has no keyword', () => {
      // Canonical multiline it(); title is plain; the edge cases are in the body
      // (toThrow, toBeNull, null input). The old title-only check scored this as
      // NO edge cases — punishing exactly the tests it should reward.
      const spec = [
        "describe('Storage', () => {",
        "  it('reads a missing key', () => {",
        "    expect(store.get('nope')).toBeNull();",
        '    expect(() => store.parse(null)).toThrow();',
        '  });',
        '});',
      ].join('\n');
      expect(
        TestCoverageAnalyzerConfiguration.testsEdgeCases(spec)
      ).toBe(true);
    });

    it('still returns false for a happy-path-only spec', () => {
      const spec =
        "describe('add', () => { it('sums two positives', () => { expect(add(2,3)).toBe(5); }); });";
      expect(
        TestCoverageAnalyzerConfiguration.testsEdgeCases(spec)
      ).toBe(false);
    });

    it('recognises an edge keyword in the title too', () => {
      const spec =
        "describe('x', () => { it('handles an invalid payload', () => { expect(f()).toBe(1); }); });";
      expect(
        TestCoverageAnalyzerConfiguration.testsEdgeCases(spec)
      ).toBe(true);
    });
  });

  describe('DEPENDENCY_PATTERNS', () => {
    it('should have IMPORT_STATEMENT pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.DEPENDENCY_PATTERNS.IMPORT_STATEMENT.test(
          'import x from "y"'
        )
      ).toBe(true);
    });

    it('should have REQUIRE_CALL pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.DEPENDENCY_PATTERNS.REQUIRE_CALL.test(
          'require("module")'
        )
      ).toBe(true);
    });

    it('should have INJECT_FUNCTION pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.DEPENDENCY_PATTERNS.INJECT_FUNCTION.test(
          'inject(Service)'
        )
      ).toBe(true);
    });

    it('should have TEST_BED pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.DEPENDENCY_PATTERNS.TEST_BED.test(
          'TestBed.configureTestingModule'
        )
      ).toBe(true);
    });
  });

  describe('MOCK_PATTERNS', () => {
    it('should have JEST_FN pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.JEST_FN.test(
          'jest.fn()'
        )
      ).toBe(true);
    });

    it('should have JEST_MOCK pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.JEST_MOCK.test(
          'jest.mock("module")'
        )
      ).toBe(true);
    });

    it('should have MOCK_IMPLEMENTATION pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.MOCK_IMPLEMENTATION.test(
          'mockImplementation(() => {})'
        )
      ).toBe(true);
    });

    it('should have MOCK_RETURN_VALUE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.MOCK_RETURN_VALUE.test(
          'mockReturnValue(42)'
        )
      ).toBe(true);
    });

    it('should have SPY pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.SPY.test(
          'spyOn(obj, "method")'
        )
      ).toBe(true);
    });

    it('should have STUB pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.STUB.test(
          'stub function'
        )
      ).toBe(true);
    });

    it('should have FAKE pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.FAKE.test('fake data')
      ).toBe(true);
    });

    it('should have SINON pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCK_PATTERNS.SINON.test(
          'sinon.stub()'
        )
      ).toBe(true);
    });
  });

  describe('TEST_PATTERNS', () => {
    it('should have IT_BLOCK pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_PATTERNS.IT_BLOCK
      ).toBeDefined();
    });

    it('should have IT_BLOCK_DESCRIPTION pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_PATTERNS.IT_BLOCK_DESCRIPTION
      ).toBeDefined();
    });

    it('should have DESCRIBE_BLOCK pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_PATTERNS.DESCRIBE_BLOCK
      ).toBeDefined();
    });

    it('should have EXPECT_STATEMENT pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_PATTERNS.EXPECT_STATEMENT
      ).toBeDefined();
    });

    it('should have TO_THROW pattern', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_PATTERNS.TO_THROW
      ).toBeDefined();
    });
  });

  describe('MOCKING_ISSUE_MESSAGES', () => {
    it('should have MOCKS_WITHOUT_CLEANUP message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
          .MOCKS_WITHOUT_CLEANUP
      ).toBe('Mock functions without cleanup may cause test interference');
    });

    it('should have EXCESSIVE_MOCKING message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
          .EXCESSIVE_MOCKING
      ).toBe(
        'Excessive mocking detected - consider integration testing approach'
      );
    });

    it('should have UNMOCKED_HTTP_CALLS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
          .UNMOCKED_HTTP_CALLS
      ).toBe('HTTP calls should be mocked in unit tests');
    });

    it('should have EXCESSIVE_INTERNAL_MOCKING message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_MESSAGES
          .EXCESSIVE_INTERNAL_MOCKING
      ).toBe(
        'Excessive mocking of internal modules may indicate tight coupling'
      );
    });
  });

  describe('EDGE_CASE_RECOMMENDATION_MESSAGES', () => {
    it('should have NULL_UNDEFINED_TESTS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
          .NULL_UNDEFINED_TESTS
      ).toBe('Consider testing null and undefined input scenarios');
    });

    it('should have ERROR_HANDLING_TESTS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
          .ERROR_HANDLING_TESTS
      ).toBe('Consider testing error conditions and exception handling');
    });

    it('should have BOUNDARY_VALUE_TESTS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
          .BOUNDARY_VALUE_TESTS
      ).toBe('Consider testing boundary values and limits');
    });

    it('should have EMPTY_ARRAY_TESTS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
          .EMPTY_ARRAY_TESTS
      ).toBe('Consider testing empty array scenarios');
    });

    it('should have EMPTY_STRING_TESTS message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_MESSAGES
          .EMPTY_STRING_TESTS
      ).toBe('Consider testing empty strings and whitespace scenarios');
    });
  });

  describe('MOCKING_ISSUE_DETECTION_CONFIGS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS
        )
      ).toBe(true);
    });

    it('should have 4 configs', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS.length
      ).toBe(4);
    });

    it('should detect mocks without cleanup', () => {
      const config =
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS[0]!;
      expect(config.checker('jest.fn()')).toBe(true);
      expect(config.checker('jest.fn(); mockClear()')).toBe(false);
    });

    it('should detect unmocked HTTP calls', () => {
      const config =
        TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS[2]!;
      expect(config.checker('fetch("http://api.example.com")')).toBe(true);
      expect(config.checker('mock fetch("http://api.example.com")')).toBe(
        false
      );
    });

    it('each config should have checker and message', () => {
      TestCoverageAnalyzerConfiguration.MOCKING_ISSUE_DETECTION_CONFIGS.forEach(
        config => {
          expect(typeof config.checker).toBe('function');
          expect(typeof config.message).toBe('string');
        }
      );
    });
  });

  describe('EDGE_CASE_RECOMMENDATION_CONFIGS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS
        )
      ).toBe(true);
    });

    it('should have 5 configs', () => {
      expect(
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS
          .length
      ).toBe(5);
    });

    it('should detect missing null/undefined tests', () => {
      const config =
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS[0]!;
      expect(config.checker('const x = 1;')).toBe(true);
      expect(config.checker('expect(value).toBe(null)')).toBe(false);
    });

    it('should detect missing error handling tests', () => {
      const config =
        TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS[1]!;
      expect(config.checker('const x = 1;')).toBe(true);
      expect(config.checker('expect(() => fn()).toThrow()')).toBe(false);
    });

    it('each config should have checker and message', () => {
      TestCoverageAnalyzerConfiguration.EDGE_CASE_RECOMMENDATION_CONFIGS.forEach(
        config => {
          expect(typeof config.checker).toBe('function');
          expect(typeof config.message).toBe('string');
        }
      );
    });
  });

  describe('TEST_COVERAGE_RECOMMENDATIONS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          TestCoverageAnalyzerConfiguration.TEST_COVERAGE_RECOMMENDATIONS
        )
      ).toBe(true);
    });

    it('should have 8 recommendations', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_COVERAGE_RECOMMENDATIONS.length
      ).toBe(8);
    });

    it('should include edge cases recommendation', () => {
      expect(
        TestCoverageAnalyzerConfiguration.TEST_COVERAGE_RECOMMENDATIONS
      ).toContain(
        'Test edge cases including null, undefined, and empty values'
      );
    });
  });

  describe('MOCKING_BEST_PRACTICES', () => {
    it('should have good practices array', () => {
      expect(
        Array.isArray(
          TestCoverageAnalyzerConfiguration.MOCKING_BEST_PRACTICES.good
        )
      ).toBe(true);
    });

    it('should have bad practices array', () => {
      expect(
        Array.isArray(
          TestCoverageAnalyzerConfiguration.MOCKING_BEST_PRACTICES.bad
        )
      ).toBe(true);
    });

    it('should have 5 good practices', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_BEST_PRACTICES.good.length
      ).toBe(5);
    });

    it('should have 5 bad practices', () => {
      expect(
        TestCoverageAnalyzerConfiguration.MOCKING_BEST_PRACTICES.bad.length
      ).toBe(5);
    });
  });

  describe('QUALITY_SCORE_WEIGHTS', () => {
    it('should have DESCRIBE_BLOCKS weight as 25', () => {
      expect(
        TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.DESCRIBE_BLOCKS
      ).toBe(25);
    });

    it('should have ASSERTIONS weight as 30', () => {
      expect(
        TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.ASSERTIONS
      ).toBe(30);
    });

    it('should have EDGE_CASES weight as 25', () => {
      expect(
        TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.EDGE_CASES
      ).toBe(25);
    });

    it('should have MOCKING weight as 20', () => {
      expect(
        TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS.MOCKING
      ).toBe(20);
    });

    it('weights should sum to 100', () => {
      const weights = TestCoverageAnalyzerConfiguration.QUALITY_SCORE_WEIGHTS;
      const total =
        weights.DESCRIBE_BLOCKS +
        weights.ASSERTIONS +
        weights.EDGE_CASES +
        weights.MOCKING;
      expect(total).toBe(100);
    });
  });

  describe('COVERAGE_MESSAGES', () => {
    it('should have NO_EDGE_CASES_VIOLATION message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .NO_EDGE_CASES_VIOLATION
      ).toBe('No edge case testing found in {fileName}');
    });

    it('should have NO_EDGE_CASES_SUGGESTION message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .NO_EDGE_CASES_SUGGESTION
      ).toBe('Add tests for edge cases like null, undefined, empty values');
    });

    it('should have DEPENDENCIES_WITHOUT_MOCKS_VIOLATION message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .DEPENDENCIES_WITHOUT_MOCKS_VIOLATION
      ).toBe('Dependencies found but no mocking detected in {fileName}');
    });

    it('should have DEPENDENCIES_WITHOUT_MOCKS_SUGGESTION message', () => {
      expect(
        TestCoverageAnalyzerConfiguration.COVERAGE_MESSAGES
          .DEPENDENCIES_WITHOUT_MOCKS_SUGGESTION
      ).toBe('Consider using mocks for external dependencies');
    });
  });

  describe('testsEdgeCases', () => {
    it('should return true when edge case patterns found in test descriptions', () => {
      const content =
        'it("should handle null value") { expect(x).toBe(null); }';
      expect(TestCoverageAnalyzerConfiguration.testsEdgeCases(content)).toBe(
        true
      );
    });

    it('should return true for boundary tests', () => {
      const content = 'describe("boundary tests") { it("test") {} }';
      expect(TestCoverageAnalyzerConfiguration.testsEdgeCases(content)).toBe(
        true
      );
    });

    it('should return false when no edge case patterns', () => {
      const content = 'it("should work") { expect(true).toBe(true); }';
      expect(TestCoverageAnalyzerConfiguration.testsEdgeCases(content)).toBe(
        false
      );
    });
  });

  describe('hasDependencies', () => {
    it('should return true for import statement', () => {
      const content = 'import { Service } from "./service"';
      expect(TestCoverageAnalyzerConfiguration.hasDependencies(content)).toBe(
        true
      );
    });

    it('should return true for require call', () => {
      const content = 'const module = require("module")';
      expect(TestCoverageAnalyzerConfiguration.hasDependencies(content)).toBe(
        true
      );
    });

    it('should return true for TestBed', () => {
      const content = 'TestBed.configureTestingModule({})';
      expect(TestCoverageAnalyzerConfiguration.hasDependencies(content)).toBe(
        true
      );
    });

    it('should return false for no dependencies', () => {
      const content = 'const x = 1;';
      expect(TestCoverageAnalyzerConfiguration.hasDependencies(content)).toBe(
        false
      );
    });
  });

  describe('usesMocks', () => {
    it('should return true for jest.fn()', () => {
      const content = 'const mock = jest.fn()';
      expect(TestCoverageAnalyzerConfiguration.usesMocks(content)).toBe(true);
    });

    it('should return true for jest.mock()', () => {
      const content = 'jest.mock("./module")';
      expect(TestCoverageAnalyzerConfiguration.usesMocks(content)).toBe(true);
    });

    it('should return true for spy', () => {
      const content = 'const spy = jest.spyOn(obj, "method")';
      expect(TestCoverageAnalyzerConfiguration.usesMocks(content)).toBe(true);
    });

    it('should return false for no mocks', () => {
      const content = 'const x = 1;';
      expect(TestCoverageAnalyzerConfiguration.usesMocks(content)).toBe(false);
    });
  });

  describe('countTestBlocks', () => {
    it('should count it blocks', () => {
      const content =
        'it ("test1", () => {}); it ("test2", () => {}); it ("test3", () => {});';
      expect(TestCoverageAnalyzerConfiguration.countTestBlocks(content)).toBe(
        3
      );
    });

    it('should return 0 for no test blocks', () => {
      const content = 'const x = 1;';
      expect(TestCoverageAnalyzerConfiguration.countTestBlocks(content)).toBe(
        0
      );
    });
  });

  describe('countMockPatterns', () => {
    it('should count mock patterns', () => {
      const content = 'jest.fn(); jest.fn(); mockReturnValue(1);';
      expect(TestCoverageAnalyzerConfiguration.countMockPatterns(content)).toBe(
        3
      );
    });

    it('should return 0 for no mocks', () => {
      const content = 'const x = 1;';
      expect(TestCoverageAnalyzerConfiguration.countMockPatterns(content)).toBe(
        0
      );
    });
  });

  describe('getDefaultQualityMetrics', () => {
    it('should return default metrics', () => {
      const metrics =
        TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      expect(metrics.hasDescribeBlocks).toBe(0);
      expect(metrics.hasAssertion).toBe(0);
      expect(metrics.hasEdgeCases).toBe(0);
      expect(metrics.usesMocks).toBe(0);
    });

    it('should return new object each time', () => {
      const m1 = TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      const m2 = TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      expect(m1).not.toBe(m2);
    });
  });

  describe('updateQualityMetrics', () => {
    it('should increment hasDescribeBlocks', () => {
      const metrics =
        TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      TestCoverageAnalyzerConfiguration.updateQualityMetrics(
        'describe("suite", () => {})',
        metrics
      );
      expect(metrics.hasDescribeBlocks).toBe(1);
    });

    it('should increment hasAssertion', () => {
      const metrics =
        TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      TestCoverageAnalyzerConfiguration.updateQualityMetrics(
        'expect(x).toBe(1)',
        metrics
      );
      expect(metrics.hasAssertion).toBe(1);
    });

    it('should increment hasEdgeCases', () => {
      const metrics =
        TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      TestCoverageAnalyzerConfiguration.updateQualityMetrics(
        'it("should handle null") { expect(x).toBe(null); }',
        metrics
      );
      expect(metrics.hasEdgeCases).toBe(1);
    });

    it('should increment usesMocks', () => {
      const metrics =
        TestCoverageAnalyzerConfiguration.getDefaultQualityMetrics();
      TestCoverageAnalyzerConfiguration.updateQualityMetrics(
        'jest.fn()',
        metrics
      );
      expect(metrics.usesMocks).toBe(1);
    });
  });

  describe('addViolationSuggestionPair', () => {
    it('should add violation and suggestion to arrays', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      TestCoverageAnalyzerConfiguration.addViolationSuggestionPair(
        violations,
        suggestions,
        'violation message',
        'suggestion message'
      );
      expect(violations).toEqual(['violation message']);
      expect(suggestions).toEqual(['suggestion message']);
    });

    it('should append to existing arrays', () => {
      const violations = ['existing violation'];
      const suggestions = ['existing suggestion'];
      TestCoverageAnalyzerConfiguration.addViolationSuggestionPair(
        violations,
        suggestions,
        'new violation',
        'new suggestion'
      );
      expect(violations.length).toBe(2);
      expect(suggestions.length).toBe(2);
    });
  });
});
