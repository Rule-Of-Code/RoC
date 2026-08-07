/**
 * Tests for UnitTestCoverageCoverageConstants
 *
 * Tests coverage thresholds, score deductions, and coverage level calculations.
 */
import { UnitTestCoverageCoverageConstants } from '../../../src/laws/testing/unit-test-coverage/constants/coverage';

describe('UnitTestCoverageCoverageConstants', () => {
  describe('THRESHOLDS', () => {
    it('should have correct EXCELLENT threshold', () => {
      expect(UnitTestCoverageCoverageConstants.THRESHOLDS.EXCELLENT).toBe(90);
    });

    it('should have correct GOOD threshold', () => {
      expect(UnitTestCoverageCoverageConstants.THRESHOLDS.GOOD).toBe(80);
    });

    it('should have correct ACCEPTABLE threshold', () => {
      expect(UnitTestCoverageCoverageConstants.THRESHOLDS.ACCEPTABLE).toBe(60);
    });

    it('should have correct POOR threshold', () => {
      expect(UnitTestCoverageCoverageConstants.THRESHOLDS.POOR).toBe(40);
    });

    it('should have correct CRITICAL threshold', () => {
      expect(UnitTestCoverageCoverageConstants.THRESHOLDS.CRITICAL).toBe(20);
    });

    it('should have thresholds in descending order', () => {
      const thresholds = UnitTestCoverageCoverageConstants.THRESHOLDS;
      expect(thresholds.EXCELLENT).toBeGreaterThan(thresholds.GOOD);
      expect(thresholds.GOOD).toBeGreaterThan(thresholds.ACCEPTABLE);
      expect(thresholds.ACCEPTABLE).toBeGreaterThan(thresholds.POOR);
      expect(thresholds.POOR).toBeGreaterThan(thresholds.CRITICAL);
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have 0 deduction for EXCELLENT', () => {
      expect(UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS.EXCELLENT).toBe(
        0
      );
    });

    it('should have 10 deduction for GOOD', () => {
      expect(UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS.GOOD).toBe(10);
    });

    it('should have 20 deduction for ACCEPTABLE', () => {
      expect(
        UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS.ACCEPTABLE
      ).toBe(20);
    });

    it('should have 30 deduction for POOR', () => {
      expect(UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS.POOR).toBe(30);
    });

    it('should have 50 deduction for CRITICAL', () => {
      expect(UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS.CRITICAL).toBe(
        50
      );
    });

    it('should have deductions in ascending order as coverage worsens', () => {
      const deductions = UnitTestCoverageCoverageConstants.SCORE_DEDUCTIONS;
      expect(deductions.EXCELLENT).toBeLessThan(deductions.GOOD);
      expect(deductions.GOOD).toBeLessThan(deductions.ACCEPTABLE);
      expect(deductions.ACCEPTABLE).toBeLessThan(deductions.POOR);
      expect(deductions.POOR).toBeLessThan(deductions.CRITICAL);
    });
  });

  describe('LEVEL_MESSAGES', () => {
    it('should have EXCELLENT message', () => {
      expect(UnitTestCoverageCoverageConstants.LEVEL_MESSAGES.EXCELLENT).toBe(
        'Excellent test coverage - keep it up!'
      );
    });

    it('should have GOOD message', () => {
      expect(UnitTestCoverageCoverageConstants.LEVEL_MESSAGES.GOOD).toBe(
        'Good test coverage - maintain this level'
      );
    });

    it('should have ACCEPTABLE message', () => {
      expect(UnitTestCoverageCoverageConstants.LEVEL_MESSAGES.ACCEPTABLE).toBe(
        'Acceptable coverage - consider improving'
      );
    });

    it('should have POOR message', () => {
      expect(UnitTestCoverageCoverageConstants.LEVEL_MESSAGES.POOR).toBe(
        'Poor coverage - significant improvement needed'
      );
    });

    it('should have CRITICAL message', () => {
      expect(UnitTestCoverageCoverageConstants.LEVEL_MESSAGES.CRITICAL).toBe(
        'Critical coverage - immediate action required'
      );
    });

    it('should have all message keys matching threshold keys', () => {
      const thresholdKeys = Object.keys(
        UnitTestCoverageCoverageConstants.THRESHOLDS
      );
      const messageKeys = Object.keys(
        UnitTestCoverageCoverageConstants.LEVEL_MESSAGES
      );
      expect(messageKeys).toEqual(thresholdKeys);
    });
  });

  describe('getCoverageLevel', () => {
    it('should return EXCELLENT for 90%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(90)).toBe(
        'EXCELLENT'
      );
    });

    it('should return EXCELLENT for 100%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(100)).toBe(
        'EXCELLENT'
      );
    });

    it('should return EXCELLENT for 95%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(95)).toBe(
        'EXCELLENT'
      );
    });

    it('should return GOOD for 80%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(80)).toBe(
        'GOOD'
      );
    });

    it('should return GOOD for 89%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(89)).toBe(
        'GOOD'
      );
    });

    it('should return GOOD for 85%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(85)).toBe(
        'GOOD'
      );
    });

    it('should return ACCEPTABLE for 60%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(60)).toBe(
        'ACCEPTABLE'
      );
    });

    it('should return ACCEPTABLE for 79%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(79)).toBe(
        'ACCEPTABLE'
      );
    });

    it('should return ACCEPTABLE for 70%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(70)).toBe(
        'ACCEPTABLE'
      );
    });

    it('should return POOR for 40%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(40)).toBe(
        'POOR'
      );
    });

    it('should return POOR for 59%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(59)).toBe(
        'POOR'
      );
    });

    it('should return POOR for 50%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(50)).toBe(
        'POOR'
      );
    });

    it('should return CRITICAL for 20%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(20)).toBe(
        'CRITICAL'
      );
    });

    it('should return CRITICAL for 0%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(0)).toBe(
        'CRITICAL'
      );
    });

    it('should return CRITICAL for 19%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(19)).toBe(
        'CRITICAL'
      );
    });

    it('should return CRITICAL for 39%', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(39)).toBe(
        'CRITICAL'
      );
    });
  });

  describe('getScoreDeduction', () => {
    it('should return 0 for excellent coverage (90%+)', () => {
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(90)).toBe(0);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(95)).toBe(0);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(100)).toBe(0);
    });

    it('should return 10 for good coverage (80-89%)', () => {
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(80)).toBe(10);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(85)).toBe(10);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(89)).toBe(10);
    });

    it('should return 20 for acceptable coverage (60-79%)', () => {
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(60)).toBe(20);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(70)).toBe(20);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(79)).toBe(20);
    });

    it('should return 30 for poor coverage (40-59%)', () => {
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(40)).toBe(30);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(50)).toBe(30);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(59)).toBe(30);
    });

    it('should return 50 for critical coverage (<40%)', () => {
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(0)).toBe(50);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(20)).toBe(50);
      expect(UnitTestCoverageCoverageConstants.getScoreDeduction(39)).toBe(50);
    });
  });

  describe('getScoreDeductionForLevel', () => {
    it('should return 0 for EXCELLENT level', () => {
      expect(
        UnitTestCoverageCoverageConstants.getScoreDeductionForLevel('EXCELLENT')
      ).toBe(0);
    });

    it('should return 10 for GOOD level', () => {
      expect(
        UnitTestCoverageCoverageConstants.getScoreDeductionForLevel('GOOD')
      ).toBe(10);
    });

    it('should return 0 for unknown level (fallback)', () => {
      expect(
        UnitTestCoverageCoverageConstants.getScoreDeductionForLevel('UNKNOWN')
      ).toBe(0);
      expect(
        UnitTestCoverageCoverageConstants.getScoreDeductionForLevel('')
      ).toBe(0);
    });
  });

  describe('getLevelMessage', () => {
    it('should return correct message for excellent coverage', () => {
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(90)).toBe(
        'Excellent test coverage - keep it up!'
      );
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(100)).toBe(
        'Excellent test coverage - keep it up!'
      );
    });

    it('should return correct message for good coverage', () => {
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(80)).toBe(
        'Good test coverage - maintain this level'
      );
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(89)).toBe(
        'Good test coverage - maintain this level'
      );
    });

    it('should return correct message for acceptable coverage', () => {
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(60)).toBe(
        'Acceptable coverage - consider improving'
      );
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(79)).toBe(
        'Acceptable coverage - consider improving'
      );
    });

    it('should return correct message for poor coverage', () => {
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(40)).toBe(
        'Poor coverage - significant improvement needed'
      );
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(59)).toBe(
        'Poor coverage - significant improvement needed'
      );
    });

    it('should return correct message for critical coverage', () => {
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(0)).toBe(
        'Critical coverage - immediate action required'
      );
      expect(UnitTestCoverageCoverageConstants.getLevelMessage(39)).toBe(
        'Critical coverage - immediate action required'
      );
    });
  });

  describe('getLevelMessageForLevel', () => {
    it('should return correct message for EXCELLENT level', () => {
      expect(
        UnitTestCoverageCoverageConstants.getLevelMessageForLevel('EXCELLENT')
      ).toBe('Excellent test coverage - keep it up!');
    });

    it('should return correct message for GOOD level', () => {
      expect(
        UnitTestCoverageCoverageConstants.getLevelMessageForLevel('GOOD')
      ).toBe('Good test coverage - maintain this level');
    });

    it('should return empty string for unknown level (fallback)', () => {
      expect(
        UnitTestCoverageCoverageConstants.getLevelMessageForLevel('UNKNOWN')
      ).toBe('');
      expect(
        UnitTestCoverageCoverageConstants.getLevelMessageForLevel('')
      ).toBe('');
    });
  });

  describe('meetsMinimu', () => {
    it('should return true for coverage at GOOD threshold (80%)', () => {
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(80)).toBe(true);
    });

    it('should return true for coverage above GOOD threshold', () => {
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(85)).toBe(true);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(90)).toBe(true);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(100)).toBe(true);
    });

    it('should return false for coverage below GOOD threshold', () => {
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(79)).toBe(false);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(70)).toBe(false);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(60)).toBe(false);
    });

    it('should return false for very low coverage', () => {
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(0)).toBe(false);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(20)).toBe(false);
      expect(UnitTestCoverageCoverageConstants.meetsMinimu(40)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle boundary values correctly', () => {
      // At exact thresholds
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(90)).toBe(
        'EXCELLENT'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(80)).toBe(
        'GOOD'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(60)).toBe(
        'ACCEPTABLE'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(40)).toBe(
        'POOR'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(20)).toBe(
        'CRITICAL'
      );
    });

    it('should handle one below threshold correctly', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(89.9)).toBe(
        'GOOD'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(79.9)).toBe(
        'ACCEPTABLE'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(59.9)).toBe(
        'POOR'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(39.9)).toBe(
        'CRITICAL'
      );
    });

    it('should handle negative values as critical', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(-1)).toBe(
        'CRITICAL'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(-100)).toBe(
        'CRITICAL'
      );
    });

    it('should handle values above 100 as excellent', () => {
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(101)).toBe(
        'EXCELLENT'
      );
      expect(UnitTestCoverageCoverageConstants.getCoverageLevel(200)).toBe(
        'EXCELLENT'
      );
    });
  });
});
