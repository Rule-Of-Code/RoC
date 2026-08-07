import { LawBase } from '../../checkers/law-base';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestDocumentationAnalyzerService } from './unit-test-documentation/services/documentation-analyzer.service';

/**
 * Test Documentation Requirements Law
 *
 * Comprehensive test documentation validation that ensures:
 * - All test suites have proper documentation
 * - Test files include descriptive comments and documentation
 * - Test cases have clear descriptions and purposes
 * - Test data and setup are properly documented
 * - Testing strategies and patterns are documented
 * - README files for testing approaches
 *
 * Architecture:
 * - Coordinates documentation analyzer service
 * - File discovery: finds test and documentation files
 * - Documentation analysis: checks documentation quality
 */
export class TestDocumentationRequirementsLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const analysisResult = this.runAllAnalyses(context);
      return this.buildFinalResult(context, analysisResult);
    } catch (error: unknown) {
      return LawBase.createErrorResult(
        'Test Documentation Requirements',
        error,
        context
      );
    }
  }

  /**
   * Run all documentation analyses and aggregate results
   */
  private static runAllAnalyses(context: LawCheckContext): {
    violations: string[];
    suggestions: string[];
    score: number;
    testDocsAnalysis: { hasTestDocumentation: boolean };
    testFileDocsAnalysis: { poorlyDocumentedFiles: string[] };
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;
    const analyzer = UnitTestDocumentationAnalyzerService;

    // Initialize configurable thresholds
    const thresholds = {
      missingTestDocsDeduction:
        config.thresholds?.testing?.documentation?.missingTestDocsDeduction ??
        25,
      poorlyDocumentedFileDeduction:
        config.thresholds?.testing?.documentation
          ?.poorlyDocumentedFileDeduction ?? 3,
      maxPoorlyDocumentedDeduction:
        config.thresholds?.testing?.documentation
          ?.maxPoorlyDocumentedDeduction ?? 30,
      poorDescriptionDeduction:
        config.thresholds?.testing?.documentation?.poorDescriptionDeduction ??
        2,
      maxPoorDescriptionDeduction:
        config.thresholds?.testing?.documentation
          ?.maxPoorDescriptionDeduction ?? 25,
      missingSetupDocsDeduction:
        config.thresholds?.testing?.documentation?.missingSetupDocsDeduction ??
        15,
      missingStrategyDocsDeduction:
        config.thresholds?.testing?.documentation
          ?.missingStrategyDocsDeduction ?? 10,
      lowStructureDocDeduction:
        config.thresholds?.testing?.documentation?.lowStructureDocDeduction ??
        5,
      minStructureDocCoverage:
        config.thresholds?.testing?.documentation?.minStructureDocCoverage ??
        70,
    };

    // 1. Check for test documentation files
    const testDocsAnalysis = analyzer.analyzeTestDocumentationFiles(
      projectRoot,
      context.config
    );
    if (!testDocsAnalysis.hasTestDocumentation) {
      violations.push('Missing test documentation files (README, test guides)');
      suggestions.push(
        'Create comprehensive test documentation in README or docs folder'
      );
      score -= thresholds.missingTestDocsDeduction;
    }

    // 2. Analyze test file documentation
    const testFileDocsAnalysis = analyzer.analyzeTestFileDocumentation(
      projectRoot,
      context.config
    );
    if (testFileDocsAnalysis.poorlyDocumentedFiles.length > 0) {
      violations.push(
        `${testFileDocsAnalysis.poorlyDocumentedFiles.length} test files lack proper documentation`
      );
      suggestions.push(
        'Add descriptive comments and documentation to test files'
      );
      score -= Math.min(
        thresholds.maxPoorlyDocumentedDeduction,
        testFileDocsAnalysis.poorlyDocumentedFiles.length *
          thresholds.poorlyDocumentedFileDeduction
      );
    }

    // 3-6. Additional documentation checks
    score = this.checkAdditionalDocumentation(
      context,
      violations,
      suggestions,
      score,
      thresholds
    );

    return {
      violations,
      suggestions,
      score: Math.max(0, score),
      testDocsAnalysis,
      testFileDocsAnalysis,
    };
  }

  /**
   * Check additional documentation requirements
   */
  private static checkAdditionalDocumentation(
    context: LawCheckContext,
    violations: string[],
    suggestions: string[],
    score: number,
    thresholds: {
      poorDescriptionDeduction: number;
      maxPoorDescriptionDeduction: number;
      missingSetupDocsDeduction: number;
      missingStrategyDocsDeduction: number;
      lowStructureDocDeduction: number;
      minStructureDocCoverage: number;
    }
  ): number {
    const { projectRoot } = context;
    const analyzer = UnitTestDocumentationAnalyzerService;

    // 3. Check test case descriptions
    const testDescriptionsAnalysis = analyzer.analyzeTestDescriptions(
      projectRoot,
      context.config
    );
    if (testDescriptionsAnalysis.poorDescriptions > 0) {
      violations.push(
        `${testDescriptionsAnalysis.poorDescriptions} test cases have unclear descriptions`
      );
      suggestions.push(
        'Write clear, descriptive test case names and descriptions'
      );
      score -= Math.min(
        thresholds.maxPoorDescriptionDeduction,
        testDescriptionsAnalysis.poorDescriptions *
          thresholds.poorDescriptionDeduction
      );
    }

    // 4. Check for setup and teardown documentation
    const setupDocsAnalysis = analyzer.analyzeSetupDocumentation(
      projectRoot,
      context.config
    );
    if (!setupDocsAnalysis.hasSetupDocumentation) {
      suggestions.push(
        'Document test setup, configuration, and data requirements'
      );
      // Note: No score reduction for setup docs - it's a suggestion, not a violation
    }

    // 5. Check for testing strategy documentation
    const strategyDocsAnalysis =
      analyzer.analyzeTestingStrategyDocumentation(projectRoot);
    if (!strategyDocsAnalysis.hasStrategyDocs) {
      suggestions.push(
        'Document testing strategies, patterns, and best practices'
      );
      // Note: No score reduction for strategy docs - it's a suggestion, not a violation
    }

    // 6. Check test structure documentation
    const structureAnalysis = analyzer.analyzeTestStructureDocumentation(
      projectRoot,
      context.config
    );
    if (
      structureAnalysis.structureDocCoverage <
      thresholds.minStructureDocCoverage
    ) {
      suggestions.push('Improve test structure documentation in test files');
      score -= thresholds.lowStructureDocDeduction;
    }

    return score;
  }

  /**
   * Build the final result
   */
  private static buildFinalResult(
    context: LawCheckContext,
    analysisResult: {
      violations: string[];
      suggestions: string[];
      score: number;
      testDocsAnalysis: { hasTestDocumentation: boolean };
      testFileDocsAnalysis: { poorlyDocumentedFiles: string[] };
    }
  ): LawResult {
    const {
      violations,
      suggestions,
      score,
      testDocsAnalysis,
      testFileDocsAnalysis,
    } = analysisResult;

    // Fail on violations, not on score: the structure-doc deduction lowered score
    // without a violation, so a well-documented suite returned passed:false with an
    // EMPTY violation list and a green "✅ Excellent" message. The score is
    // informational; the verdict is the violations.
    const passed = violations.length === 0;
    const message = this.generateMessage(
      violations.length,
      testDocsAnalysis,
      testFileDocsAnalysis
    );

    return LawBase.buildDetailedResult({
      passed,
      message,
      violations,
      suggestions,
      score,
      context,
    });
  }

  private static generateMessage(
    violationCount: number,
    testDocsAnalysis: { hasTestDocumentation: boolean },
    testFileDocsAnalysis: { poorlyDocumentedFiles: string[] }
  ): string {
    if (violationCount === 0) {
      return '✅ Test Documentation Requirements: Excellent test documentation practices';
    }

    if (!testDocsAnalysis.hasTestDocumentation) {
      return '⚠️ Test Documentation Requirements: Missing test documentation files';
    }

    if (testFileDocsAnalysis.poorlyDocumentedFiles.length > 0) {
      return `⚠️ Test Documentation Requirements: ${testFileDocsAnalysis.poorlyDocumentedFiles.length} files need better documentation`;
    }

    return `⚠️ Test Documentation Requirements: ${violationCount} documentation issues found`;
  }
}
