import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Unit Test Documentation Constants
 *
 * Centralized test documentation patterns and helper methods
 * for identifying proper documentation in test suites.
 *
 * Patterns cover:
 * - Test documentation files
 * - File-level documentation
 * - Test descriptions and naming
 * - Setup/teardown documentation
 * - Testing strategy documentation
 */
export class UnitTestDocumentationConstants {
  // ============================================
  // 1. Test Documentation File Patterns
  // ============================================

  static readonly TEST_DOCUMENTATION_FILES = [
    'README.md',
    'TESTING.md',
    'docs/testing.md',
    'docs/test-guide.md',
    'test/README.md',
    'tests/README.md',
    'e2e/README.md',
  ];

  static readonly STRATEGY_DOCUMENTATION_FILES = [
    'docs/testing-strategy.md',
    'docs/test-strategy.md',
    'TESTING_STRATEGY.md',
    'TEST_PLAN.md',
  ];

  // ============================================
  // 2. Test Documentation Content Patterns
  // ============================================

  static readonly TEST_DOC_CONTENT_PATTERNS = {
    TEST_KEYWORD: /test/i,
    TESTING_KEYWORD: /testing/i,
    SPEC_KEYWORD: /spec/i,
    UNIT_TEST: /unit\s+test/i,
    INTEGRATION_TEST: /integration\s+test/i,
    E2E_TEST: /e2e\s+test/i,
    JEST_FRAMEWORK: /jest/i,
    CYPRESS_FRAMEWORK: /cypress/i,
    KARMA_FRAMEWORK: /karma/i,
    VITEST_FRAMEWORK: /vitest/i,
    PLAYWRIGHT_FRAMEWORK: /playwright/i,
  };

  // ============================================
  // 3. File-Level Documentation Patterns
  // ============================================

  static readonly FILE_DOCUMENTATION_PATTERNS = {
    JSDOC_COMMENT: /^\/\*\*[\s\S]*?\*\//m,
    TEST_COMMENT: /^\/\/.*test/im,
    DESCRIBE_BLOCK: /describe\s*\(\s*['"][^'"]{5,}['"]/,
    MARKDOWN_HEADER: /^#.*test/im,
  };

  // ============================================
  // 4. Test Description Quality Patterns
  // ============================================

  static readonly POOR_DESCRIPTION_PATTERNS = {
    GENERIC_TEST: /^test\s*\d*$/i,
    VAGUE_SHOULD_WORK: /^should.*work$/i,
    VAGUE_IT_WORKS: /^it.*works$/i,
    GENERIC_BASIC: /^basic.*test$/i,
    GENERIC_SIMPLE: /^simple.*test$/i,
  };

  // ============================================
  // 5. Setup/Teardown Documentation Patterns
  // ============================================

  static readonly SETUP_TEARDOWN_PATTERNS = {
    SETUP_DOC_COMMENT: /\/\*\*.*setup.*\*\//is,
    SETUP_LINE_COMMENT: /\/\/.*setup/i,
    BEFORE_EACH_COMMENT: /beforeEach.*\/\//,
    BEFORE_ALL_COMMENT: /beforeAll.*\/\//,
    BEFORE_EACH_JSDOC: /\/\*\*.*beforeEach.*\*\//is,
    AFTER_EACH_COMMENT: /afterEach.*\/\//,
    AFTER_ALL_COMMENT: /afterAll.*\/\//,
  };

  // ============================================
  // 6. Test Structure Documentation Patterns
  // ============================================

  static readonly TEST_STRUCTURE_PATTERNS = {
    DESCRIBE_BLOCK: /describe\s*\(/,
    IT_BLOCK: /it\s*\(/,
    TEST_BLOCK: /test\s*\(/,
    CONTEXT_BLOCK: /context\s*\(/,
    SPEC_BLOCK: /spec\s*\(/,
    SUITE_BLOCK: /suite\s*\(/,
  };

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if content contains test documentation keywords
   */
  static containsTestDocumentation(
    content: string,
    minLength: number = 100
  ): boolean {
    const hasKeyword = Object.values(this.TEST_DOC_CONTENT_PATTERNS).some(
      pattern => PatternMatchingUtils.hasRegexPattern(content, pattern)
    );

    return hasKeyword && content.length > minLength;
  }

  /**
   * Check if file has proper documentation
   */
  static hasProperFileDocumentation(content: string): boolean {
    return Object.values(this.FILE_DOCUMENTATION_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if test description is poor quality
   */
  static hasPoorDescription(
    testDescription: string,
    minLength: number = 10
  ): boolean {
    const isTooShort = testDescription.length < minLength;
    const isPoorPattern = Object.values(this.POOR_DESCRIPTION_PATTERNS).some(
      pattern => PatternMatchingUtils.hasRegexPattern(testDescription, pattern)
    );

    return isTooShort || isPoorPattern;
  }

  /**
   * Check if content has setup/teardown documentation
   */
  static hasSetupDocumentation(content: string): boolean {
    return Object.values(this.SETUP_TEARDOWN_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Check if content has test structure documentation
   */
  static hasTestStructureDocumentation(content: string): boolean {
    return Object.values(this.TEST_STRUCTURE_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Extract test cases from content
   */
  static extractTestCases(content: string): string[] {
    const itMatches = content.match(/it\s*\(\s*['"]([^'"]+)['"]/g) ?? [];
    const testMatches = content.match(/test\s*\(\s*['"]([^'"]+)['"]/g) ?? [];

    return [
      ...itMatches.map(match => {
        return match.match(/['"]([^'"]+)['"]/)?.[1] ?? '';
      }),
      ...testMatches.map(match => {
        return match.match(/['"]([^'"]+)['"]/)?.[1] ?? '';
      }),
    ];
  }

  /**
   * Calculate documentation coverage percentage
   */
  static calculateCoverage(
    documentedCount: number,
    totalCount: number
  ): number {
    return totalCount > 0 ? (documentedCount / totalCount) * 100 : 100;
  }

  /**
   * Get documentation quality level
   */
  static getDocumentationLevel(coverage: number): string {
    if (coverage >= 90) return 'EXCELLENT';
    if (coverage >= 75) return 'GOOD';
    if (coverage >= 60) return 'ACCEPTABLE';
    if (coverage >= 40) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Get score deduction for documentation level
   */
  static getScoreDeduction(level: string): number {
    const deductions: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 10,
      ACCEPTABLE: 25,
      POOR: 40,
      CRITICAL: 50,
    };

    return deductions[level] ?? 0;
  }
}
