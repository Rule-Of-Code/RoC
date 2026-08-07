import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  UnitTestCoverageCoverageAnalysisService,
  UnitTestCoverageFileDiscoveryService,
  UnitTestCoverageQualityAnalysisService,
} from './unit-test-coverage/index';

/**
 * Unit Test Coverage Standards Law
 * Enforces comprehensive unit testing practices and coverage requirements
 *
 * Architecture:
 * - Coordinates three specialized services
 * - File discovery: finds source and test files
 * - Coverage analysis: analyzes coverage metrics
 * - Quality analysis: evaluates test quality
 */
export class UnitTestCoverageStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;

      // Discover files
      const { sourceFiles, testFiles } =
        UnitTestCoverageFileDiscoveryService.discoverProjectFiles(projectRoot);

      // Analyze coverage
      const coverageAnalysis =
        UnitTestCoverageFileDiscoveryService.analyzeFileCoverage(
          sourceFiles,
          testFiles
        );
      const coverageFeedback =
        UnitTestCoverageCoverageAnalysisService.generateFeedback(
          coverageAnalysis.coverage,
          sourceFiles.length,
          coverageAnalysis.uncoveredFiles.length
        );

      // Analyze quality
      const qualityAnalysis =
        UnitTestCoverageQualityAnalysisService.analyzeTestFiles(
          projectRoot,
          testFiles
        );

      // Calculate score
      let score = 100;
      const issues: string[] = [];
      const details: string[] = [...coverageFeedback.details];

      // Coverage issues
      const coverageDeduction =
        UnitTestCoverageCoverageAnalysisService.calculateScoreImpact(
          coverageAnalysis.coverage
        );
      if (coverageDeduction > 0) {
        score -= coverageDeduction;
        issues.push('insufficient coverage');
      }

      // Quality issues
      if (qualityAnalysis.lowQualityTests.length > 0) {
        score -= UnitTestCoverageQualityAnalysisService.calculateScoreImpact(
          qualityAnalysis.lowQualityTests.length
        );
        issues.push('low quality tests');
        details.push(
          `${qualityAnalysis.lowQualityTests.length} test(s) need quality improvements`
        );
      }

      // Isolation issues
      if (qualityAnalysis.hasIsolationIssues) {
        score -= 15;
        issues.push('shared test state');
        details.push('Tests should be isolated and independent');
      }

      const passed = score >= 100;
      const message = passed
        ? '✅ Unit Test Coverage Standards: All requirements met'
        : `⚠️ Unit Test Coverage Standards: ${issues.join(', ')}`;

      const allSuggestions = [
        ...coverageFeedback.recommendations,
        ...UnitTestCoverageQualityAnalysisService.getQualityRecommendations(
          qualityAnalysis.lowQualityTests.length
        ),
      ];

      return {
        passed,
        score: Math.max(0, score),
        message,
        details,
        violations: issues,
        suggestions: allSuggestions,
        config: context.config,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        score: 0,
        message: `❌ Unit Test Coverage Standards: Error analyzing coverage - ${errorMessage}`,
        details: [],
        violations: [],
        suggestions: ['Check project structure and test configuration'],
        config: context.config,
      };
    }
  }
}
