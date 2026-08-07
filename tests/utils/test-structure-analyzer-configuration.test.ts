/**
 * Tests for TestStructureAnalyzerConfiguration
 *
 * Tests the test structure analyzer configuration patterns and methods.
 */
import {
  TestAnalysisResult,
  TestStructureAnalyzerConfiguration,
} from '../../src/utils/testing/test-structure-analyzer/test-structure-analyzer-configuration';

describe('TestStructureAnalyzerConfiguration', () => {
  describe('constants', () => {
    it('should have MIN_TEST_NAME_LENGTH as 5', () => {
      expect(TestStructureAnalyzerConfiguration.MIN_TEST_NAME_LENGTH).toBe(5);
    });

    it('should have MIN_DESCRIPTIVE_NAME_LENGTH as 10', () => {
      expect(
        TestStructureAnalyzerConfiguration.MIN_DESCRIPTIVE_NAME_LENGTH
      ).toBe(10);
    });

    it('should have MIN_DESCRIPTION_WORDS as 1', () => {
      expect(TestStructureAnalyzerConfiguration.MIN_DESCRIPTION_WORDS).toBe(1);
    });

    it('should have REPEATED_SETUP_RATIO as 0.5', () => {
      expect(TestStructureAnalyzerConfiguration.REPEATED_SETUP_RATIO).toBe(0.5);
    });
  });

  describe('TEST_PATTERNS', () => {
    it('should have DESCRIBE_BLOCK pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.DESCRIBE_BLOCK
      ).toBeDefined();
    });

    it('should have IT_BLOCK pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.IT_BLOCK
      ).toBeDefined();
    });

    it('should have TEST_BLOCK pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.TEST_BLOCK
      ).toBeDefined();
    });

    it('should have ASSERTION_PATTERNS pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.ASSERTION_PATTERNS
      ).toBeDefined();
    });

    it('should match describe block', () => {
      const code = 'describe("Test Suite", () => {})';
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.DESCRIBE_BLOCK.test(
          code
        )
      ).toBe(true);
    });

    it('should match it block', () => {
      const code = 'it("should work", () => {})';
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.IT_BLOCK.test(code)
      ).toBe(true);
    });

    it('should match expect assertion', () => {
      const code = 'expect(result).toBe(true)';
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.ASSERTION_PATTERNS.test(
          code
        )
      ).toBe(true);
    });

    it('should match assert assertion', () => {
      const code = 'assert(condition)';
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.ASSERTION_PATTERNS.test(
          code
        )
      ).toBe(true);
    });

    it('should match toBe assertion', () => {
      const code = 'expect(x).toBe(y)';
      expect(
        TestStructureAnalyzerConfiguration.TEST_PATTERNS.ASSERTION_PATTERNS.test(
          code
        )
      ).toBe(true);
    });
  });

  describe('SETUP_PATTERNS', () => {
    it('should have CONST_DECLARATION', () => {
      expect(
        TestStructureAnalyzerConfiguration.SETUP_PATTERNS.CONST_DECLARATION
      ).toBe('const ');
    });

    it('should have LET_DECLARATION', () => {
      expect(
        TestStructureAnalyzerConfiguration.SETUP_PATTERNS.LET_DECLARATION
      ).toBe('let ');
    });

    it('should have VAR_DECLARATION', () => {
      expect(
        TestStructureAnalyzerConfiguration.SETUP_PATTERNS.VAR_DECLARATION
      ).toBe('var ');
    });

    it('should have NEW_KEYWORD', () => {
      expect(
        TestStructureAnalyzerConfiguration.SETUP_PATTERNS.NEW_KEYWORD
      ).toBe('new ');
    });

    it('should have MOCK_IMPLEMENTATION', () => {
      expect(
        TestStructureAnalyzerConfiguration.SETUP_PATTERNS.MOCK_IMPLEMENTATION
      ).toBe('mockImplementation');
    });

    it('should have JEST_FN', () => {
      expect(TestStructureAnalyzerConfiguration.SETUP_PATTERNS.JEST_FN).toBe(
        'jest.fn()'
      );
    });
  });

  describe('TEARDOWN_INDICATORS', () => {
    it('should have ADD_EVENT_LISTENER', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS
          .ADD_EVENT_LISTENER
      ).toBe('addEventListener');
    });

    it('should have SET_INTERVAL', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.SET_INTERVAL
      ).toBe('setInterval');
    });

    it('should have SET_TIMEOUT', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.SET_TIMEOUT
      ).toBe('setTimeout');
    });

    it('should have GLOBAL_SCOPE', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.GLOBAL_SCOPE
      ).toBe('global.');
    });

    it('should have WINDOW_SCOPE', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.WINDOW_SCOPE
      ).toBe('window.');
    });

    it('should have DOCUMENT_SCOPE', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.DOCUMENT_SCOPE
      ).toBe('document.');
    });

    it('should have LOCAL_STORAGE', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.LOCAL_STORAGE
      ).toBe('localStorage');
    });

    it('should have SESSION_STORAGE', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEARDOWN_INDICATORS.SESSION_STORAGE
      ).toBe('sessionStorage');
    });
  });

  describe('SHARED_STATE_PATTERNS', () => {
    it('should have LET_VARIABLE pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.SHARED_STATE_PATTERNS.LET_VARIABLE
      ).toBeDefined();
    });

    it('should have VAR_VARIABLE pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.SHARED_STATE_PATTERNS.VAR_VARIABLE
      ).toBeDefined();
    });

    it('should have BEFORE_EACH_HOOK', () => {
      expect(
        TestStructureAnalyzerConfiguration.SHARED_STATE_PATTERNS
          .BEFORE_EACH_HOOK
      ).toBe('beforeEach');
    });

    it('should have AFTER_EACH_HOOK', () => {
      expect(
        TestStructureAnalyzerConfiguration.SHARED_STATE_PATTERNS.AFTER_EACH_HOOK
      ).toBe('afterEach');
    });
  });

  describe('POOR_TEST_NAME_PATTERNS', () => {
    it('should have TEST_NUMBER pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.TEST_NUMBER.test(
          'test1'
        )
      ).toBe(true);
    });

    it('should have SHOULD_ONLY pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.SHOULD_ONLY.test(
          'should'
        )
      ).toBe(true);
    });

    it('should have WORKS pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.WORKS.test(
          'works'
        )
      ).toBe(true);
    });

    it('should have OK pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.OK.test('ok')
      ).toBe(true);
    });

    it('should have GOOD pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.GOOD.test(
          'good'
        )
      ).toBe(true);
    });

    it('should have BASIC pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.BASIC.test(
          'basic'
        )
      ).toBe(true);
    });

    it('should have SIMPLE pattern', () => {
      expect(
        TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS.SIMPLE.test(
          'simple'
        )
      ).toBe(true);
    });
  });

  describe('TEST_NAME_QUALITY_CONFIGS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          TestStructureAnalyzerConfiguration.TEST_NAME_QUALITY_CONFIGS
        )
      ).toBe(true);
    });

    it('should have 2 configs', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_NAME_QUALITY_CONFIGS.length
      ).toBe(2);
    });

    it('should detect generic test names', () => {
      const config =
        TestStructureAnalyzerConfiguration.TEST_NAME_QUALITY_CONFIGS[0]!;
      expect(config.checker('test1')).toBe(true);
      expect(config.checker('should handle valid input')).toBe(false);
    });

    it('should detect short test names', () => {
      const config =
        TestStructureAnalyzerConfiguration.TEST_NAME_QUALITY_CONFIGS[1]!;
      expect(config.checker('ab')).toBe(true);
      expect(config.checker('should work correctly')).toBe(false);
    });
  });

  describe('TEST_STRUCTURE_RECOMMENDATIONS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(
          TestStructureAnalyzerConfiguration.TEST_STRUCTURE_RECOMMENDATIONS
        )
      ).toBe(true);
    });

    it('should have 7 recommendations', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_STRUCTURE_RECOMMENDATIONS.length
      ).toBe(7);
    });

    it('should include describe blocks recommendation', () => {
      expect(
        TestStructureAnalyzerConfiguration.TEST_STRUCTURE_RECOMMENDATIONS
      ).toContain('Use describe() blocks to organize related tests');
    });
  });

  describe('extractDescription', () => {
    it('should extract description from single quotes', () => {
      const match = "'should work correctly'";
      expect(TestStructureAnalyzerConfiguration.extractDescription(match)).toBe(
        'should work correctly'
      );
    });

    it('should extract description from double quotes', () => {
      const match = '"should work correctly"';
      expect(TestStructureAnalyzerConfiguration.extractDescription(match)).toBe(
        'should work correctly'
      );
    });

    it('should return empty string for no match', () => {
      const match = 'no quotes here';
      expect(TestStructureAnalyzerConfiguration.extractDescription(match)).toBe(
        ''
      );
    });
  });

  describe('isDescriptionLongEnough', () => {
    it('should return true for long descriptions', () => {
      expect(
        TestStructureAnalyzerConfiguration.isDescriptionLongEnough(
          'should handle valid input correctly'
        )
      ).toBe(true);
    });

    it('should return false for short descriptions', () => {
      expect(
        TestStructureAnalyzerConfiguration.isDescriptionLongEnough('works')
      ).toBe(false);
    });

    it('should return false for exactly MIN_DESCRIPTIVE_NAME_LENGTH', () => {
      const exactLength = 'a'.repeat(
        TestStructureAnalyzerConfiguration.MIN_DESCRIPTIVE_NAME_LENGTH
      );
      expect(
        TestStructureAnalyzerConfiguration.isDescriptionLongEnough(exactLength)
      ).toBe(false);
    });
  });

  describe('hasMultipleWords', () => {
    it('should return true for multiple words', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasMultipleWords(
          'should work correctly'
        )
      ).toBe(true);
    });

    it('should return false for single word', () => {
      expect(TestStructureAnalyzerConfiguration.hasMultipleWords('works')).toBe(
        false
      );
    });

    it('should return true for exactly 2 words', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasMultipleWords('works correctly')
      ).toBe(true);
    });
  });

  describe('hasDescriptiveNames', () => {
    it('should return true for descriptive test names', () => {
      const matches = ['"should handle valid input correctly"'];
      expect(
        TestStructureAnalyzerConfiguration.hasDescriptiveNames(matches)
      ).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(TestStructureAnalyzerConfiguration.hasDescriptiveNames([])).toBe(
        false
      );
    });

    it('should return false for short names', () => {
      const matches = ['"works"'];
      expect(
        TestStructureAnalyzerConfiguration.hasDescriptiveNames(matches)
      ).toBe(false);
    });
  });

  describe('containsAnyPattern', () => {
    it('should return true when string pattern matches', () => {
      const patterns = { test: 'hello' };
      expect(
        TestStructureAnalyzerConfiguration.containsAnyPattern(
          'hello world',
          patterns
        )
      ).toBe(true);
    });

    it('should return true when regex pattern matches', () => {
      const patterns = { test: /world/i };
      expect(
        TestStructureAnalyzerConfiguration.containsAnyPattern(
          'hello WORLD',
          patterns
        )
      ).toBe(true);
    });

    it('should return false when no pattern matches', () => {
      const patterns = { test: 'foo', bar: /baz/i };
      expect(
        TestStructureAnalyzerConfiguration.containsAnyPattern(
          'hello world',
          patterns
        )
      ).toBe(false);
    });
  });

  describe('hasAfterEachHook', () => {
    it('should return true when afterEach is present', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasAfterEachHook(
          'afterEach(() => {})'
        )
      ).toBe(true);
    });

    it('should return false when afterEach is not present', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasAfterEachHook(
          'beforeEach(() => {})'
        )
      ).toBe(false);
    });
  });

  describe('requiresTeardown', () => {
    it('should return true when teardown indicators present without afterEach', () => {
      expect(
        TestStructureAnalyzerConfiguration.requiresTeardown(
          'addEventListener("click", fn)'
        )
      ).toBe(true);
    });

    it('should return false when afterEach is present', () => {
      expect(
        TestStructureAnalyzerConfiguration.requiresTeardown(
          'addEventListener("click", fn); afterEach(() => {})'
        )
      ).toBe(false);
    });

    it('should return false when no teardown indicators', () => {
      expect(
        TestStructureAnalyzerConfiguration.requiresTeardown('const x = 1;')
      ).toBe(false);
    });
  });

  describe('hasSharedState', () => {
    it('should return true for let variable without beforeEach', () => {
      expect(TestStructureAnalyzerConfiguration.hasSharedState('let x;')).toBe(
        true
      );
    });

    it('should return false when beforeEach is present', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasSharedState(
          'let x; beforeEach(() => { x = 1; })'
        )
      ).toBe(false);
    });
  });

  describe('splitTestBlocks', () => {
    it('should split by it( pattern', () => {
      const content =
        'describe("suite", () => { it ("test1", () => {}); it ("test2", () => {}); });';
      const blocks =
        TestStructureAnalyzerConfiguration.splitTestBlocks(content);
      expect(blocks.length).toBeGreaterThan(1);
    });
  });

  describe('getTestBlocksSkippingFirst', () => {
    it('should return blocks without first element', () => {
      const content =
        'describe("suite", () => { it ("test1", () => {}); it ("test2", () => {}); });';
      const blocks =
        TestStructureAnalyzerConfiguration.getTestBlocksSkippingFirst(content);
      expect(blocks.length).toBeGreaterThan(0);
    });
  });

  describe('getTestBlockMatches', () => {
    it('should return test block matches', () => {
      const content = 'it("test1", () => {}); it("test2", () => {});';
      const matches =
        TestStructureAnalyzerConfiguration.getTestBlockMatches(content);
      expect(matches.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      const content = 'const x = 1;';
      const matches =
        TestStructureAnalyzerConfiguration.getTestBlockMatches(content);
      expect(matches.length).toBe(0);
    });
  });

  describe('findMatchingBrace', () => {
    it('should find matching closing brace', () => {
      const content = 'a { b } c }';
      const index =
        TestStructureAnalyzerConfiguration.findMatchingBrace(content);
      expect(index).toBe(10);
    });

    it('should handle nested braces', () => {
      const content = 'a { { } } c }';
      const index =
        TestStructureAnalyzerConfiguration.findMatchingBrace(content);
      expect(index).toBe(12);
    });

    it('should ignore braces in strings', () => {
      const content = 'a "}" }';
      const index =
        TestStructureAnalyzerConfiguration.findMatchingBrace(content);
      expect(index).toBe(6);
    });

    it('should return content length if no match', () => {
      const content = '{ { }';
      const index =
        TestStructureAnalyzerConfiguration.findMatchingBrace(content);
      expect(index).toBe(content.length);
    });
  });

  describe('hasAssertion', () => {
    it('should return true for expect', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasAssertion('expect(x).toBe(1)')
      ).toBe(true);
    });

    it('should return true for assert', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasAssertion('assert(condition)')
      ).toBe(true);
    });

    it('should return false for no assertion', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasAssertion('const x = 1;')
      ).toBe(false);
    });
  });

  describe('countSetupPatterns', () => {
    it('should count occurrences of pattern', () => {
      const block = 'const a = 1; const b = 2; const c = 3;';
      expect(
        TestStructureAnalyzerConfiguration.countSetupPatterns(block, 'const')
      ).toBe(3);
    });

    it('should return 0 for no matches', () => {
      const block = 'let x = 1;';
      expect(
        TestStructureAnalyzerConfiguration.countSetupPatterns(block, 'const')
      ).toBe(0);
    });
  });

  describe('hasDescribeBlocks', () => {
    it('should return true when describe block exists', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasDescribeBlocks(
          'describe("test", () => {})'
        )
      ).toBe(true);
    });

    it('should return false when no describe block', () => {
      expect(
        TestStructureAnalyzerConfiguration.hasDescribeBlocks(
          'it("test", () => {})'
        )
      ).toBe(false);
    });
  });

  describe('getDefaultAnalysisResult', () => {
    it('should return default TestAnalysisResult', () => {
      const result =
        TestStructureAnalyzerConfiguration.getDefaultAnalysisResult();
      expect(result.hasDescribeBlocks).toBe(false);
      expect(result.hasDescribeableTestNames).toBe(false);
      expect(result.testsWithoutAssertions).toBe(0);
      expect(result.hasRepeatedSetup).toBe(false);
      expect(result.needsTeardown).toBe(false);
      expect(result.hasSharedState).toBe(false);
      expect(result.poorTestNames).toBe(0);
    });

    it('should return a new object each time', () => {
      const result1 =
        TestStructureAnalyzerConfiguration.getDefaultAnalysisResult();
      const result2 =
        TestStructureAnalyzerConfiguration.getDefaultAnalysisResult();
      expect(result1).not.toBe(result2);
    });
  });

  describe('TestAnalysisResult interface', () => {
    it('should accept valid result object', () => {
      const result: TestAnalysisResult = {
        hasDescribeBlocks: true,
        hasDescribeableTestNames: true,
        testsWithoutAssertions: 2,
        hasRepeatedSetup: false,
        needsTeardown: true,
        hasSharedState: false,
        poorTestNames: 1,
      };
      expect(result.hasDescribeBlocks).toBe(true);
      expect(result.testsWithoutAssertions).toBe(2);
    });
  });
});
