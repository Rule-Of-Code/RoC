import type * as TS from 'typescript';
import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { loadTypeScript, type TypeScriptModule } from '../../../../utils/react/tsx-source';

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
    // Whole words: "should … never the network" is not "should … work".
    VAGUE_SHOULD_WORK: /^should\b.*\bwork$/i,
    VAGUE_IT_WORKS: /^it\b.*\bworks$/i,
    GENERIC_BASIC: /^basic\b.*\btest$/i,
    GENERIC_SIMPLE: /^simple\b.*\btest$/i,
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
  static extractTestCases(content: string, fileName?: string, projectRoot?: string): string[] {
    const ts = projectRoot ? loadTypeScript(projectRoot) : null;
    if (ts) return this.titlesFromSyntax(ts, content, fileName ?? 'test.ts');
    // No parser: the regex below, which a comment such as
    // "round to it (`toBlob`)" can still mislead.
    return [
      ...this.titlesOf(content, UnitTestDocumentationConstants.IT_CALL),
      ...this.titlesOf(content, UnitTestDocumentationConstants.TEST_CALL),
    ];
  }

  /**
   * `it(` / `test(` as a CALL — not the tail of `split(` or `submit(`, which
   * made `'\n'` a "test title" — then a title closed by the SAME quote that
   * opened it, escapes included, so `"user's cart"` is not cut at the
   * apostrophe. `xit`/`fit`, `.only`/`.skip`/`.todo`/`.concurrent`/`.failing`
   * and template-literal titles count.
   */
  private static readonly TITLE =
    String.raw`(?:\.(?:only|skip|todo|concurrent|failing|fixme|fail|slow))*\s*\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|` +
    '`' +
    String.raw`((?:[^` +
    '`' +
    String.raw`\\]|\\.)*)` +
    '`)';
  private static readonly IT_CALL = new RegExp(
    String.raw`(?<![\w$.])[xf]?it` + UnitTestDocumentationConstants.TITLE,
    'g'
  );
  private static readonly TEST_CALL = new RegExp(
    String.raw`(?<![\w$.])x?test` + UnitTestDocumentationConstants.TITLE,
    'g'
  );

  private static readonly TEST_FUNCTIONS = new Set(['it', 'xit', 'fit', 'test', 'xtest']);
  private static readonly TEST_MODIFIERS = new Set([
    'only',
    'skip',
    'todo',
    'concurrent',
    'failing',
    'fixme',
    'fail',
    'slow',
  ]);

  /**
   * Titles from the parse: the first argument of a call to it/test (or
   * `it.only`, `test.skip`, …) when it is a string or a template. Comments and
   * strings that merely contain `it(` are not calls, so they are not read.
   */
  private static titlesFromSyntax(ts: TypeScriptModule, content: string, fileName: string): string[] {
    const kind = /\.(?:tsx|jsx)$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, kind);
    const titles: string[] = [];
    // `test.only(…)` is a test; `test.describe(…)` / `test.step(…)` (Playwright)
    // are not — only a chain of modifiers keeps it a test.
    const calleeName = (callee: TS.Expression): string | null => {
      let node = callee;
      while (ts.isPropertyAccessExpression(node)) {
        if (!UnitTestDocumentationConstants.TEST_MODIFIERS.has(node.name.text)) return null;
        node = node.expression;
      }
      return ts.isIdentifier(node) ? node.text : null;
    };
    const visit = (node: TS.Node): void => {
      if (ts.isCallExpression(node)) {
        const name = calleeName(node.expression);
        const [first] = node.arguments;
        if (name && UnitTestDocumentationConstants.TEST_FUNCTIONS.has(name) && first) {
          if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
            titles.push(first.text);
          } else if (ts.isTemplateExpression(first)) {
            titles.push(first.getText(source).slice(1, -1));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return titles;
  }

  private static titlesOf(content: string, call: RegExp): string[] {
    const titles: string[] = [];
    for (const match of content.matchAll(call)) {
      const raw = match[1] ?? match[2] ?? match[3] ?? '';
      titles.push(raw.replace(/\\(.)/g, '$1'));
    }
    return titles;
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
