import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Unit Test Coverage - Test Quality Constants
 * Defines what constitutes good quality tests
 */
export class UnitTestCoverageQualityConstants {
  /**
   * Test structure expectations
   */
  static readonly TEST_STRUCTURE_PATTERNS = {
    DESCRIBE_BLOCK: /describe\s*\(/,
    TEST_CASE: /it\s*\(|test\s*\(/,
    EXPECT_ASSERTION: /expect\s*\(/,
    BEFORE_EACH: /beforeEach\s*\(/,
    BEFORE_ALL: /beforeAll\s*\(/,
    AFTER_EACH: /afterEach\s*\(/,
    AFTER_ALL: /afterAll\s*\(/,
  };

  /**
   * Anti-patterns indicating isolation issues
   */
  static readonly ISOLATION_ANTI_PATTERNS = {
    GLOBAL_STATE: /global\./,
    WINDOW_STATE: /window\./,
    SHARED_VARIABLES: /let\s+\w+\s*=.*(?=describe|it)/,
    STATIC_CLASS_STATE: /static\s+.*=(?!.*readonly)/,
  };

  /**
   * Indicators of good test practices
   */
  static readonly QUALITY_INDICATORS = {
    MOCKING: /jest\.mock|sinon\.stub|mock/i,
    SETUP: /beforeEach|beforeAll|setup/i,
    CLEANUP: /afterEach|afterAll|teardown/i,
    ASSERTIONS: /expect|assert|toBe|toEqual/i,
    ASYNC_HANDLING: /async\s+\(|await|Promise/,
  };

  /**
   * Quality score weights
   */
  static readonly SCORING_WEIGHTS = {
    STRUCTURE: 30,
    ISOLATION: 30,
    ASSERTIONS: 25,
    SETUP_CLEANUP: 15,
  };

  /**
   * Quality score thresholds
   */
  static readonly QUALITY_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    ACCEPTABLE: 60,
    POOR: 40,
    CRITICAL: 20,
  };

  /**
   * Recommendations for improvement
   */
  static readonly IMPROVEMENT_TIPS = {
    MISSING_DESCRIBE: 'Use describe() blocks to organize related tests',
    MISSING_SETUP: 'Add beforeEach() or beforeAll() for common setup',
    MISSING_CLEANUP: 'Add afterEach() or afterAll() for cleanup',
    SHARED_STATE: 'Avoid global/module variables - tests should be isolated',
    POOR_NAMING: 'Use descriptive test names explaining what is being tested',
    MISSING_MOCKS: 'Mock external dependencies for unit tests',
    WEAK_ASSERTIONS: 'Ensure each test has meaningful assertions',
  };

  /**
   * Check if test has proper structure
   */
  static hasProperStructure(content: string): boolean {
    const hasDescribe = PatternMatchingUtils.hasRegexPattern(
      content,
      this.TEST_STRUCTURE_PATTERNS.DESCRIBE_BLOCK
    );
    const hasTests = PatternMatchingUtils.hasRegexPattern(
      content,
      this.TEST_STRUCTURE_PATTERNS.TEST_CASE
    );
    const hasAssertions = PatternMatchingUtils.hasRegexPattern(
      content,
      this.TEST_STRUCTURE_PATTERNS.EXPECT_ASSERTION
    );

    return hasDescribe && hasTests && hasAssertions;
  }

  /**
   * Check for isolation issues
   */
  static hasIsolationIssues(content: string): boolean {
    const isolationPatterns = [
      this.ISOLATION_ANTI_PATTERNS.GLOBAL_STATE,
      this.ISOLATION_ANTI_PATTERNS.WINDOW_STATE,
      this.ISOLATION_ANTI_PATTERNS.SHARED_VARIABLES,
      this.ISOLATION_ANTI_PATTERNS.STATIC_CLASS_STATE,
    ];
    return isolationPatterns.some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Get quality level
   */
  static getQualityLevel(score: number): string {
    if (score >= this.QUALITY_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (score >= this.QUALITY_THRESHOLDS.GOOD) return 'GOOD';
    if (score >= this.QUALITY_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
    if (score >= this.QUALITY_THRESHOLDS.POOR) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Count quality indicators
   */
  static countQualityIndicators(content: string): number {
    let count = 0;
    const indicators = [
      this.QUALITY_INDICATORS.MOCKING,
      this.QUALITY_INDICATORS.SETUP,
      this.QUALITY_INDICATORS.CLEANUP,
      this.QUALITY_INDICATORS.ASSERTIONS,
      this.QUALITY_INDICATORS.ASYNC_HANDLING,
    ];

    for (const pattern of indicators) {
      if (PatternMatchingUtils.hasRegexPattern(content, pattern)) {
        count++;
      }
    }

    return count;
  }
}
