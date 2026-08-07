import { LawBase } from '../../checkers/law-base';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestDataManagementAnalyzerService } from './unit-test-data-management/services/data-management-analyzer.service';

/**
 * Test Data Management Law
 *
 * Comprehensive test data management implementation that checks for:
 * - Proper test data setup and teardown procedures
 * - Test data factories and builders usage
 * - Mock data structure and organization
 * - Test isolation and cleanup patterns
 * - Avoidance of hardcoded test data
 * - External resource cleanup
 *
 * Architecture:
 * - Coordinates data management analyzer service
 * - File discovery: finds test files
 * - Data pattern analysis: checks data management quality
 */
export class TestDataManagementLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;
      const { projectRoot, config } = context;
      // Real-data mode: a project may deliberately use real inline data instead of
      // factories/mocks — don't flag that as a violation.
      const realDataMode =
        config.thresholds?.testing?.realDataMode === true;

      // Get thresholds from config with defaults
      const thresholds = {
        missingSetupDeduction:
          config.thresholds?.testing?.testData?.missingSetupDeduction ?? 25,
        hardcodedDataDeduction:
          config.thresholds?.testing?.testData?.hardcodedDataDeduction ?? 20,
        sharedStateDeduction:
          config.thresholds?.testing?.testData?.sharedStateDeduction ?? 20,
        noOrganizedDataDeduction:
          config.thresholds?.testing?.testData?.noOrganizedDataDeduction ?? 10,
        noFactoriesDeduction:
          config.thresholds?.testing?.testData?.noFactoriesDeduction ?? 15,
        noCleanupDeduction:
          config.thresholds?.testing?.testData?.noCleanupDeduction ?? 20,
        noMockingDeduction:
          config.thresholds?.testing?.testData?.noMockingDeduction ?? 10,
        lowFactoryCoverageDeduction:
          config.thresholds?.testing?.testData?.lowFactoryCoverageDeduction ??
          5,
        minFactoryCoverage:
          config.thresholds?.testing?.testData?.minFactoryCoverage ?? 50,
      };

      // 1. Check test files for proper data management patterns
      const testDataPatterns =
        UnitTestDataManagementAnalyzerService.analyzeTestDataPatterns(
          projectRoot
        );
      if (!testDataPatterns.hasProperSetup) {
        violations.push('Test files missing proper setup/teardown patterns');
        suggestions.push('Implement beforeEach/afterEach for test data setup');
        score -= thresholds.missingSetupDeduction;
      }

      if (testDataPatterns.hasHardcodedData && !realDataMode) {
        violations.push('Found hardcoded test data in test files');
        suggestions.push(
          'Use test data factories or builders instead of hardcoded values'
        );
        score -= thresholds.hardcodedDataDeduction;
      }

      if (testDataPatterns.hasSharedState) {
        violations.push('Tests have shared mutable state issues');
        suggestions.push('Ensure tests are isolated with proper cleanup');
        score -= thresholds.sharedStateDeduction;
      }

      // 2. Check for test data structure organization
      const dataStructure =
        UnitTestDataManagementAnalyzerService.analyzeTestDataStructure(
          projectRoot
        );
      if (!dataStructure.hasOrganizedData) {
        suggestions.push(
          'Consider creating test fixtures or mock data directories'
        );
        score -= thresholds.noOrganizedDataDeduction;
      }

      if (!dataStructure.hasFactories) {
        suggestions.push(
          'Implement test data factories for maintainable test data'
        );
        score -= thresholds.noFactoriesDeduction;
      }

      // 3. Check for proper cleanup patterns
      const cleanupPatterns =
        UnitTestDataManagementAnalyzerService.analyzeCleanupPatterns(
          projectRoot
        );
      if (!cleanupPatterns.hasProperCleanup) {
        violations.push('Tests missing proper cleanup of external resources');
        suggestions.push('Implement proper cleanup in afterEach blocks');
        score -= thresholds.noCleanupDeduction;
      }

      // 4. Check mocking strategies
      const mockingUsage =
        UnitTestDataManagementAnalyzerService.analyzeMockingUsage(projectRoot);
      if (!mockingUsage.hasProperMocking) {
        // A deduction that changes the verdict must be visible as a violation —
        // otherwise the law fails with zero findings and a "✅ Excellent"
        // message (QA-7). What costs you the gate must be printable.
        violations.push('External dependencies are not properly mocked in tests');
        suggestions.push(
          'Improve mocking strategies for external dependencies'
        );
        score -= thresholds.noMockingDeduction;
      }

      // 5. Data factory usage — ADVISORY ONLY (no violation, no score).
      //
      // factoryCoverage = files-using-factories / ALL-test-files, so writing a
      // correct, simple spec with inline data DILUTES the ratio and used to push
      // the law past its threshold into a violation. A law that gets redder the
      // more genuine tests you add teaches people not to write tests — the exact
      // perverse incentive this tool exists to kill. Factories are a preference
      // for DUPLICATED data, not a correctness requirement, so this is a
      // suggestion that costs neither the verdict nor the score.
      const factoryUsage =
        UnitTestDataManagementAnalyzerService.analyzeDataFactoryUsage(
          projectRoot
        );
      if (factoryUsage.factoryCoverage < thresholds.minFactoryCoverage) {
        suggestions.push(
          'Consider test data factories where setup data repeats across specs'
        );
      }

      // Violations are the verdict: a law with zero findings passes, always.
      const finalScore = Math.max(0, score);
      const passed = violations.length === 0;
      const message = this.generateMessage(
        violations.length,
        testDataPatterns,
        dataStructure
      );

      return LawBase.buildDetailedResult({
        passed,
        message,
        violations,
        suggestions,
        score: finalScore,
        context,
      });
    } catch (error: unknown) {
      return LawBase.createErrorResult('Test Data Management', error, context);
    }
  }

  private static generateMessage(
    violationCount: number,
    testDataPatterns: {
      hasProperSetup: boolean;
      hasHardcodedData: boolean;
      hasSharedState: boolean;
    },
    dataStructure: { hasFactories: boolean }
  ): string {
    if (violationCount === 0) {
      return '✅ Test Data Management: Excellent test data practices';
    }

    const issues = [];
    if (!testDataPatterns.hasProperSetup) issues.push('setup/teardown');
    if (testDataPatterns.hasHardcodedData) issues.push('hardcoded data');
    if (testDataPatterns.hasSharedState) issues.push('shared state');
    if (!dataStructure.hasFactories) issues.push('data factories');

    return `⚠️ Test Data Management issues: ${issues.join(', ')}`;
  }
}
