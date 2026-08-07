import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { UnitTestCoverageQualityConstants } from '../constants/quality';

/**
 * Unit Test Coverage - Quality Analysis Service
 * Analyzes test quality metrics (structure, isolation, assertions)
 */
export class UnitTestCoverageQualityAnalysisService {
  /**
   * Analyze test quality for a set of test files
   */
  static analyzeTestFiles(
    projectRoot: string,
    testFiles: string[]
  ): {
    lowQualityTests: string[];
    qualityScore: number;
    hasIsolationIssues: boolean;
    details: string[];
  } {
    let qualityScore = 100;
    const lowQualityTests: string[] = [];
    let hasIsolationIssues = false;
    const issues: string[] = [];

    for (const testFile of testFiles) {
      const testFileIssues = this.analyzeTestFile(projectRoot, testFile);

      if (!testFileIssues.isGoodQuality) {
        lowQualityTests.push(testFile);
        qualityScore -=
          UnitTestCoverageQualityConstants.SCORING_WEIGHTS.STRUCTURE;
      }

      if (testFileIssues.hasIsolationIssues) {
        hasIsolationIssues = true;
        qualityScore -=
          UnitTestCoverageQualityConstants.SCORING_WEIGHTS.ISOLATION;
        issues.push(`${testFile}: isolation issues detected`);
      }

      qualityScore = Math.max(0, qualityScore);
    }

    return {
      lowQualityTests,
      qualityScore: Math.min(100, qualityScore),
      hasIsolationIssues,
      details: issues,
    };
  }

  /**
   * Analyze individual test file
   */
  private static analyzeTestFile(
    projectRoot: string,
    testFile: string
  ): {
    isGoodQuality: boolean;
    hasIsolationIssues: boolean;
  } {
    try {
      const content = FileUtils.readFile(
        PathOperations.join(projectRoot, testFile),
        { encoding: 'utf8' }
      );

      const hasProperStructure =
        UnitTestCoverageQualityConstants.hasProperStructure(content);
      const hasIsolationIssues =
        UnitTestCoverageQualityConstants.hasIsolationIssues(content);

      return {
        isGoodQuality: hasProperStructure,
        hasIsolationIssues,
      };
    } catch (_error) {
      return {
        isGoodQuality: false,
        hasIsolationIssues: false,
      };
    }
  }

  /**
   * Get quality recommendations
   */
  static getQualityRecommendations(lowQualityCount: number): string[] {
    const recommendations: string[] = [];

    if (lowQualityCount > 0) {
      recommendations.push(
        `${lowQualityCount} test(s) need quality improvements`
      );
      recommendations.push(
        'Ensure tests use describe() and it() blocks for proper structure'
      );
      recommendations.push(
        'Add meaningful assertions (expect statements) to each test'
      );
      recommendations.push('Use beforeEach/afterEach for setup and cleanup');
    }

    return recommendations;
  }

  /**
   * Calculate quality score contribution
   */
  static calculateScoreImpact(lowQualityCount: number): number {
    if (lowQualityCount === 0) {
      return 0; // No deduction
    }

    // Deduct 20 points for having low-quality tests
    return Math.min(20, lowQualityCount * 5);
  }
}
