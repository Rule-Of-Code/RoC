import { LawBase } from '../../checkers/law-base';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { UnitTestDataManagementAnalyzerService } from './unit-test-data-management/services/data-management-analyzer.service';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { namedFiles } from '../../utils/testing/fixture-isolation';
import { TestFileDiscovery } from './test-file-discovery';

/** Said when no test imports an external client, so mocking was not judged. */
export const MOCKING_NOT_JUDGED =
  'Mocking not judged: no test file imports a filesystem, network, database or process client, so there is nothing to mock';

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
      const testFiles = TestFileDiscovery.findTestFiles(projectRoot, config);
      if (testFiles.length === 0) {
        const nothing = TestFileDiscovery.nothingToJudge('Test Data Management');
        return markJudgedNothing(
          LawBase.buildDetailedResult({
            passed: false,
            message: nothing,
            violations: [nothing],
            suggestions,
            score: 0,
            context,
          })
        );
      }
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

      // 0. A file no check could read was not judged — say which.
      const unreadable = TestFileDiscovery.unreadable(projectRoot, testFiles);
      if (unreadable.length > 0) {
        violations.push(TestFileDiscovery.unreadableViolation(unreadable));
        suggestions.push('Make the named test files readable (permissions, encoding, broken links)');
      }

      // 1. Check test files for proper data management patterns
      const testDataPatterns =
        UnitTestDataManagementAnalyzerService.analyzeTestDataPatterns(
          projectRoot,
          config
        );
      if (!testDataPatterns.hasProperSetup) {
        violations.push(
          `Test files share module-scope mutable state with no beforeEach/afterEach to reset it: ${namedFiles(testDataPatterns.missingSetupFiles)}`
        );
        suggestions.push('Implement beforeEach/afterEach for test data setup');
        score -= thresholds.missingSetupDeduction;
      }

      if (testDataPatterns.hasHardcodedData && !realDataMode) {
        violations.push(
          `Found hardcoded test data in test files: ${namedFiles(testDataPatterns.hardcodedDataFiles)}`
        );
        suggestions.push(
          'Use test data factories or builders instead of hardcoded values'
        );
        score -= thresholds.hardcodedDataDeduction;
      }

      if (testDataPatterns.hasSharedState) {
        violations.push(
          `Tests have shared mutable state issues: ${namedFiles(testDataPatterns.sharedStateFiles)}`
        );
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
          projectRoot,
          config
        );
      if (!cleanupPatterns.hasProperCleanup) {
        violations.push(
          `Tests missing proper cleanup of external resources: ${namedFiles(
            cleanupPatterns.uncleaned
          )}`
        );
        suggestions.push('Implement proper cleanup in afterEach blocks');
        score -= thresholds.noCleanupDeduction;
      }

      // 4. Check mocking strategies
      const mockingUsage =
        UnitTestDataManagementAnalyzerService.analyzeMockingUsage(
          projectRoot,
          config
        );
      if (!mockingUsage.hasProperMocking) {
        // A deduction that changes the verdict must be visible as a violation —
        // otherwise the law fails with zero findings and a "✅ Excellent"
        // message (QA-7). What costs you the gate must be printable, and
        // the files it is about must be named (#310).
        violations.push(
          `Tests import external clients and no test uses a test double (mock, spy, network interceptor): ${namedFiles(mockingUsage.externalImports)}`
        );
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
          projectRoot,
          config
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

      const result = LawBase.buildDetailedResult({
        passed,
        message,
        violations,
        suggestions,
        score: finalScore,
        context,
      });
      if (!mockingUsage.judged) {
        // Not a pass of the mocking check — there was nothing for it to judge.
        result.details = [...(result.details ?? []), MOCKING_NOT_JUDGED];
      }
      return result;
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
