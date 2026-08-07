/**
 * Unit Test Coverage - Coverage Thresholds Constants
 * Defines what percentage of test coverage means good, acceptable, or poor
 */
export class UnitTestCoverageCoverageConstants {
  /**
   * Coverage level thresholds (percentage)
   */
  static readonly THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 80,
    ACCEPTABLE: 60,
    POOR: 40,
    CRITICAL: 20,
  };

  /**
   * Score deductions based on coverage level
   */
  static readonly SCORE_DEDUCTIONS = {
    EXCELLENT: 0,
    GOOD: 10,
    ACCEPTABLE: 20,
    POOR: 30,
    CRITICAL: 50,
  };

  /**
   * Coverage level descriptions
   */
  static readonly LEVEL_MESSAGES = {
    EXCELLENT: 'Excellent test coverage - keep it up!',
    GOOD: 'Good test coverage - maintain this level',
    ACCEPTABLE: 'Acceptable coverage - consider improving',
    POOR: 'Poor coverage - significant improvement needed',
    CRITICAL: 'Critical coverage - immediate action required',
  };

  /**
   * Get coverage level category from percentage
   */
  static getCoverageLevel(percentage: number): string {
    if (percentage >= this.THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (percentage >= this.THRESHOLDS.GOOD) return 'GOOD';
    if (percentage >= this.THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
    if (percentage >= this.THRESHOLDS.POOR) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Calculate score deduction for coverage level
   */
  static getScoreDeduction(percentage: number): number {
    const level = this.getCoverageLevel(percentage);
    return this.getScoreDeductionForLevel(level);
  }

  /**
   * Get score deduction for a specific level string
   */
  static getScoreDeductionForLevel(level: string): number {
    const deductionMap: Record<string, number> = {
      EXCELLENT: this.SCORE_DEDUCTIONS.EXCELLENT,
      GOOD: this.SCORE_DEDUCTIONS.GOOD,
      ACCEPTABLE: this.SCORE_DEDUCTIONS.ACCEPTABLE,
      POOR: this.SCORE_DEDUCTIONS.POOR,
      CRITICAL: this.SCORE_DEDUCTIONS.CRITICAL,
    };
    return deductionMap[level] ?? 0;
  }

  /**
   * Get message for coverage level
   */
  static getLevelMessage(percentage: number): string {
    const level = this.getCoverageLevel(percentage);
    return this.getLevelMessageForLevel(level);
  }

  /**
   * Get message for a specific level string
   */
  static getLevelMessageForLevel(level: string): string {
    const messageMap: Record<string, string> = {
      EXCELLENT: this.LEVEL_MESSAGES.EXCELLENT,
      GOOD: this.LEVEL_MESSAGES.GOOD,
      ACCEPTABLE: this.LEVEL_MESSAGES.ACCEPTABLE,
      POOR: this.LEVEL_MESSAGES.POOR,
      CRITICAL: this.LEVEL_MESSAGES.CRITICAL,
    };
    return messageMap[level] ?? '';
  }

  /**
   * Check if coverage meets minimum standard
   */
  static meetsMinimu(percentage: number): boolean {
    return percentage >= this.THRESHOLDS.GOOD;
  }
}
