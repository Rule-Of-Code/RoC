import { UnitTestCoverageCoverageConstants } from '../constants/coverage';

/**
 * Unit Test Coverage - Coverage Analysis Service
 * Analyzes test coverage metrics and calculates scores
 */
export class UnitTestCoverageCoverageAnalysisService {
  /**
   * Analyze coverage metrics
   */
  static analyzeCoverage(coverage: number): {
    level: string;
    message: string;
    scoreDeduction: number;
    passesMinimum: boolean;
  } {
    const level = UnitTestCoverageCoverageConstants.getCoverageLevel(coverage);
    const message = UnitTestCoverageCoverageConstants.getLevelMessage(coverage);
    const scoreDeduction =
      UnitTestCoverageCoverageConstants.getScoreDeduction(coverage);
    const passesMinimum =
      UnitTestCoverageCoverageConstants.meetsMinimu(coverage);

    return {
      level,
      message,
      scoreDeduction,
      passesMinimum,
    };
  }

  /**
   * Generate coverage feedback
   */
  static generateFeedback(
    coverage: number,
    sourceFileCount: number,
    uncoveredFileCount: number
  ): {
    summary: string;
    details: string[];
    recommendations: string[];
  } {
    const _level = UnitTestCoverageCoverageConstants.getCoverageLevel(coverage);
    const message = UnitTestCoverageCoverageConstants.getLevelMessage(coverage);

    const details: string[] = [
      `Coverage: ${coverage}% of ${sourceFileCount} source files`,
    ];

    if (uncoveredFileCount > 0) {
      details.push(`${uncoveredFileCount} files without tests`);
    }

    const recommendations: string[] = [];

    if (coverage < UnitTestCoverageCoverageConstants.THRESHOLDS.GOOD) {
      recommendations.push(
        'Increase test coverage to at least 80% to meet industry standards'
      );
    }

    if (coverage < UnitTestCoverageCoverageConstants.THRESHOLDS.ACCEPTABLE) {
      recommendations.push(
        'Critical: Add tests for uncovered source files immediately'
      );
    }

    return {
      summary: message,
      details,
      recommendations,
    };
  }

  /**
   * Calculate coverage score contribution
   */
  static calculateScoreImpact(coverage: number): number {
    const threshold = UnitTestCoverageCoverageConstants.THRESHOLDS.GOOD;

    if (coverage >= threshold) {
      return 0; // No deduction
    }

    return UnitTestCoverageCoverageConstants.getScoreDeduction(coverage);
  }
}
