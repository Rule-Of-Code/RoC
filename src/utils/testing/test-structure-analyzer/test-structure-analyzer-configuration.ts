/**
 * Test Structure Analyzer Configuration
 * Centralized configuration for test structure patterns and validation (RULE 1: Single source of truth)
 * Eliminates hardcoded patterns and messages scattered across methods
 */

/**
 * Configuration for test name quality detection
 */
interface TestNameQualityConfig {
  checker: (description: string) => boolean;
  issue: string;
}

/**
 * Test analysis result structure (RULE 1: Centralized type definition)
 */
export interface TestAnalysisResult {
  hasDescribeBlocks: boolean;
  hasDescribeableTestNames: boolean;
  testsWithoutAssertions: number;
  hasRepeatedSetup: boolean;
  needsTeardown: boolean;
  hasSharedState: boolean;
  poorTestNames: number;
}

export class TestStructureAnalyzerConfiguration {
  /**
   * Test name validation constants (RULE 1: Eliminate hardcoded values)
   */
  static readonly MIN_TEST_NAME_LENGTH = 5;
  static readonly MIN_DESCRIPTIVE_NAME_LENGTH = 10;
  static readonly MIN_DESCRIPTION_WORDS = 1;
  static readonly REPEATED_SETUP_RATIO = 0.5; // 50% threshold for considering setup repeated

  /**
   * Test pattern detection (RULE 1: Centralized pattern definitions)
   */
  static readonly TEST_PATTERNS = {
    DESCRIBE_BLOCK: /describe\(/,
    IT_BLOCK: /it\s*\(/,
    TEST_BLOCK: /it\s*\(['"](.*?)['"]/g,
    ASSERTION_PATTERNS: /expect\(|assert\(|should\.|toBe\(|toEqual\(/,
    BRACE_OPEN: '{',
    BRACE_CLOSE: '}',
    QUOTE_DOUBLE: '"',
    QUOTE_SINGLE: "'",
    ESCAPE_CHAR: '\\',
  } as const;

  /**
   * Setup patterns detection
   */
  static readonly SETUP_PATTERNS = {
    CONST_DECLARATION: 'const ',
    LET_DECLARATION: 'let ',
    VAR_DECLARATION: 'var ',
    NEW_KEYWORD: 'new ',
    MOCK_IMPLEMENTATION: 'mockImplementation',
    JEST_FN: 'jest.fn()',
  } as const;

  /**
   * Teardown requirement patterns
   */
  static readonly TEARDOWN_INDICATORS = {
    ADD_EVENT_LISTENER: 'addEventListener',
    SET_INTERVAL: 'setInterval',
    SET_TIMEOUT: 'setTimeout',
    GLOBAL_SCOPE: 'global.',
    WINDOW_SCOPE: 'window.',
    DOCUMENT_SCOPE: 'document.',
    LOCAL_STORAGE: 'localStorage',
    SESSION_STORAGE: 'sessionStorage',
  } as const;

  /**
   * Shared state patterns
   */
  static readonly SHARED_STATE_PATTERNS = {
    LET_VARIABLE: /let\s+\w+;/g,
    VAR_VARIABLE: /var\s+\w+;/g,
    BEFORE_EACH_HOOK: 'beforeEach',
    AFTER_EACH_HOOK: 'afterEach',
  } as const;

  /**
   * Poor test name patterns (RULE 1: Centralized)
   */
  static readonly POOR_TEST_NAME_PATTERNS = {
    TEST_NUMBER: /^test\d*/i,
    SHOULD_ONLY: /^should$/i,
    WORKS: /^works$/i,
    OK: /^ok$/i,
    GOOD: /^good$/i,
    BASIC: /^basic$/i,
    SIMPLE: /^simple$/i,
  } as const;

  /**
   * Description extraction pattern (RULE 1: Centralized)
   */
  static readonly DESCRIPTION_PATTERN = /['"](.*)['"]/;

  /**
   * Test name quality configuration (RULE 1: Eliminate duplicate checks)
   */
  static readonly TEST_NAME_QUALITY_CONFIGS: TestNameQualityConfig[] = [
    {
      checker: (desc: string) =>
        Object.values(
          TestStructureAnalyzerConfiguration.POOR_TEST_NAME_PATTERNS
        ).some(pattern => pattern.test(desc)),
      issue: 'Test name is too generic - use descriptive behavior-driven names',
    },
    {
      checker: (desc: string) =>
        desc.length < TestStructureAnalyzerConfiguration.MIN_TEST_NAME_LENGTH,
      issue: `Test name is too short - should be at least ${TestStructureAnalyzerConfiguration.MIN_TEST_NAME_LENGTH} characters`,
    },
  ];

  /**
   * Test structure recommendations (RULE 1: Centralized)
   */
  static readonly TEST_STRUCTURE_RECOMMENDATIONS = [
    'Use describe() blocks to organize related tests',
    'Write descriptive test names that explain the behavior being tested',
    'Ensure every test has at least one assertion',
    'Extract repeated setup code to beforeEach() hooks',
    'Clean up resources in afterEach() hooks when needed',
    'Avoid shared mutable state between tests',
    'Use meaningful test names that describe the expected behavior',
  ] as const;

  /**
   * Extract test description from test match
   */
  static extractDescription(testMatch: string): string {
    return testMatch.match(this.DESCRIPTION_PATTERN)?.[1] ?? '';
  }

  /**
   * Check if description is long enough (RULE 1: Use constant, RULE 2: Helper method)
   */
  static isDescriptionLongEnough(description: string): boolean {
    return description.length > this.MIN_DESCRIPTIVE_NAME_LENGTH;
  }

  /**
   * Check if description has multiple words (RULE 1: Use constant, RULE 2: Helper method)
   */
  static hasMultipleWords(description: string): boolean {
    return description.split(' ').length > this.MIN_DESCRIPTION_WORDS;
  }

  /**
   * Check if test name is descriptive (minimum length and contains space)
   */
  static hasDescriptiveNames(testMatches: readonly string[]): boolean {
    return (
      testMatches.length > 0 &&
      testMatches.every(match => {
        const description = this.extractDescription(match);
        return (
          this.isDescriptionLongEnough(description) &&
          this.hasMultipleWords(description)
        );
      })
    );
  }

  /**
   * Check if content contains any pattern from a pattern collection
   * Helper method for reducing duplicated pattern checking logic (RULE 2: Optimize internals)
   */
  static containsAnyPattern(
    content: string,
    patterns: Readonly<Record<string, RegExp | string>>
  ): boolean {
    return Object.values(patterns).some(pattern => {
      if (typeof pattern === 'string') {
        return content.includes(pattern);
      }
      return pattern.test(content);
    });
  }

  /**
   * Check if afterEach hook exists (RULE 1: Helper for better naming)
   */
  static hasAfterEachHook(content: string): boolean {
    return content.includes(this.SHARED_STATE_PATTERNS.AFTER_EACH_HOOK);
  }

  /**
   * Check if content needs teardown
   */
  static requiresTeardown(content: string): boolean {
    return (
      this.containsAnyPattern(content, this.TEARDOWN_INDICATORS) &&
      !this.hasAfterEachHook(content)
    );
  }

  /**
   * Check if content has shared state
   */
  static hasSharedState(content: string): boolean {
    return (
      this.containsAnyPattern(content, this.SHARED_STATE_PATTERNS) &&
      !content.includes(this.SHARED_STATE_PATTERNS.BEFORE_EACH_HOOK)
    );
  }

  /**
   * Split test content into blocks (RULE 1: Centralized, reduces duplication)
   */
  static splitTestBlocks(content: string): string[] {
    return content.split(this.TEST_PATTERNS.IT_BLOCK);
  }

  /**
   * Get test blocks excluding the first split artifact (RULE 1: Centralized)
   */
  static getTestBlocksSkippingFirst(content: string): string[] {
    return this.splitTestBlocks(content).slice(1);
  }

  /**
   * Get test block matches from content (RULE 1: Centralized)
   */
  static getTestBlockMatches(content: string): readonly string[] {
    return content.match(this.TEST_PATTERNS.TEST_BLOCK) ?? [];
  }

  /**
   * Find matching closing brace in test block content
   * Helper for parsing test block boundaries (RULE 1: Centralized)
   */
  static findMatchingBrace(content: string): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (!inString) {
        if (
          char === this.TEST_PATTERNS.QUOTE_DOUBLE ||
          char === this.TEST_PATTERNS.QUOTE_SINGLE
        ) {
          inString = true;
          stringChar = char;
        } else if (char === this.TEST_PATTERNS.BRACE_OPEN) {
          braceCount++;
        } else if (char === this.TEST_PATTERNS.BRACE_CLOSE) {
          braceCount--;
          if (braceCount < 0) {
            return i;
          }
        }
      } else if (
        char === stringChar &&
        content[i - 1] !== this.TEST_PATTERNS.ESCAPE_CHAR
      ) {
        inString = false;
      }
    }

    return content.length;
  }

  /**
   * Check if test block has assertion (RULE 1: Centralized, RULE 2: Helper method)
   */
  static hasAssertion(testContent: string): boolean {
    return this.TEST_PATTERNS.ASSERTION_PATTERNS.test(testContent);
  }

  /**
   * Get setup pattern count for a block (RULE 1: Centralized, RULE 2: Helper method)
   */
  static countSetupPatterns(block: string, setupPattern: string): number {
    return (block.match(new RegExp(setupPattern, 'g')) ?? []).length;
  }

  /**
   * Check if file has describe blocks (RULE 1: Centralized, RULE 2: Helper method)
   */
  static hasDescribeBlocks(content: string): boolean {
    return this.TEST_PATTERNS.DESCRIBE_BLOCK.test(content);
  }

  /**
   * Create default test analysis result (RULE 1: Centralized default values)
   */
  static getDefaultAnalysisResult(): TestAnalysisResult {
    return {
      hasDescribeBlocks: false,
      hasDescribeableTestNames: false,
      testsWithoutAssertions: 0,
      hasRepeatedSetup: false,
      needsTeardown: false,
      hasSharedState: false,
      poorTestNames: 0,
    };
  }
}
