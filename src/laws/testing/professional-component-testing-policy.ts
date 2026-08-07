import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestProfessionalComponentTestingAnalyzerService } from './unit-test-professional-component-testing/services/component-testing-analyzer.service';

/**
 * Professional Component Testing Policy Law
 *
 * Validates professional component testing practices including:
 * - Component test file coverage (.spec.ts files for all components)
 * - Test quality standards (proper describe/it blocks, assertions)
 * - Component testing patterns (Input/Output, lifecycle, user interaction)
 * - Mocking and isolation patterns (TestBed, spies, service mocks)
 * - TestBed configuration and component declarations
 *
 * Delegates all analysis to the specialized analyzer service.
 * Pure coordinator - only aggregates results and returns LawResult.
 */
export class ProfessionalComponentTestingPolicyLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;
      const { projectRoot, config } = context;

      // Get thresholds from config with defaults
      const thresholds = {
        missingSpecFileDeduction:
          config.thresholds?.testing?.componentTesting
            ?.missingSpecFileDeduction ?? 5,
        maxMissingSpecDeduction:
          config.thresholds?.testing?.componentTesting
            ?.maxMissingSpecDeduction ?? 50,
        lowQualityTestDeduction:
          config.thresholds?.testing?.componentTesting
            ?.lowQualityTestDeduction ?? 3,
        maxLowQualityDeduction:
          config.thresholds?.testing?.componentTesting
            ?.maxLowQualityDeduction ?? 30,
        missingPatternsDeduction:
          config.thresholds?.testing?.componentTesting
            ?.missingPatternsDeduction ?? 25,
        missingMockingDeduction:
          config.thresholds?.testing?.componentTesting
            ?.missingMockingDeduction ?? 20,
        missingTestBedDeduction:
          config.thresholds?.testing?.componentTesting
            ?.missingTestBedDeduction ?? 10,
      };

      // 1. Analyze component test coverage
      const componentAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeComponentTestCoverage(
          projectRoot,
          config
        );

      if (componentAnalysis.missingTestFiles.length > 0) {
        violations.push(
          `${componentAnalysis.missingTestFiles.length} components missing .spec.ts files`
        );
        suggestions.push('Create .spec.ts files for all components');
        score -= Math.min(
          thresholds.maxMissingSpecDeduction,
          componentAnalysis.missingTestFiles.length *
            thresholds.missingSpecFileDeduction
        );
      }

      // 2. Analyze test quality
      const testQualityAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeTestQuality(
          componentAnalysis.testFiles
        );

      if (testQualityAnalysis.lowQualityTests.length > 0) {
        violations.push(
          `${testQualityAnalysis.lowQualityTests.length} component tests have low quality`
        );
        suggestions.push(
          'Improve component test quality with proper assertions and coverage'
        );
        score -= Math.min(
          thresholds.maxLowQualityDeduction,
          testQualityAnalysis.lowQualityTests.length *
            thresholds.lowQualityTestDeduction
        );
      }

      // 3. Analyze component testing patterns
      const testPatterns =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeComponentTestPatterns(
          componentAnalysis.testFiles
        );

      if (!testPatterns.hasProperPatterns) {
        violations.push('Component tests missing essential testing patterns');
        suggestions.push(
          'Add input/output testing, lifecycle testing, and user interaction testing'
        );
        score -= thresholds.missingPatternsDeduction;
      }

      // 4. Analyze mocking and isolation
      const mockingAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeMockingPatterns(
          componentAnalysis.testFiles
        );

      if (!mockingAnalysis.hasProperMocking) {
        violations.push('Component tests missing proper mocking and isolation');
        suggestions.push(
          'Use TestBed, spies, and mocks for proper component isolation'
        );
        score -= thresholds.missingMockingDeduction;
      }

      // 5. Analyze TestBed usage
      const testBedAnalysis =
        UnitTestProfessionalComponentTestingAnalyzerService.analyzeTestBedUsage(
          componentAnalysis.testFiles
        );

      if (!testBedAnalysis.hasProperTestBedUsage) {
        suggestions.push(
          'Improve TestBed configuration for more robust component testing'
        );
        score -= thresholds.missingTestBedDeduction;
      }

      // Fail on violations, not on score: the missing-TestBed deduction lowered
      // score without a violation, so a spec passing every listed check but with
      // no proper TestBed returned passed:false, an EMPTY violation list, and a
      // green "✅ Excellent" message — a check-mark on a failing verdict.
      const finalScore = Math.max(0, score);

      return {
        passed: violations.length === 0,
        message: this.generateMessage(
          violations.length,
          componentAnalysis,
          testQualityAnalysis
        ),
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        score: finalScore,
        fixable: true,
        config: context.config,
      };
    } catch (error) {
      return {
        passed: false,
        message:
          '❌ Professional Component Testing Policy: Error during analysis',
        details: [
          `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        violations: [],
        suggestions: ['Check project structure and component files'],
        score: 0,
        fixable: false,
        config: context.config,
      };
    }
  }

  private static generateMessage(
    violationCount: number,
    componentAnalysis: { missingTestFiles: string[] },
    testQualityAnalysis: { lowQualityTests: string[] }
  ): string {
    if (violationCount === 0) {
      return '✅ Professional Component Testing Policy: Excellent component testing practices';
    }

    if (componentAnalysis.missingTestFiles.length > 0) {
      return `⚠️ Professional Component Testing: ${componentAnalysis.missingTestFiles.length} components missing tests`;
    }

    if (testQualityAnalysis.lowQualityTests.length > 0) {
      return `⚠️ Professional Component Testing: ${testQualityAnalysis.lowQualityTests.length} tests need quality improvement`;
    }

    return `⚠️ Professional Component Testing: ${violationCount} issues found`;
  }
}
