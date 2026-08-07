/**
 * @fileoverview Tests for licensing-validation-base.ts
 * @description Tests for licensing validation base class
 */

// Create a concrete test class to test the abstract base
import { LicensingValidationBase } from '../../src/utils/licensing/licensing-validation-base';

class TestLicensingValidator extends LicensingValidationBase {
  // Expose protected methods for testing
  static testInitializeValidation(baseScore: number) {
    return this.initializeValidation(baseScore);
  }

  static testApplyScorePenalty(
    violations: string[],
    currentScore: number,
    penalty: number,
    maxPenalty: number
  ) {
    return this.applyScorePenalty(
      violations,
      currentScore,
      penalty,
      maxPenalty
    );
  }
}

describe('utils/licensing/licensing-validation-base', () => {
  describe('initializeValidation', () => {
    it('should initialize with base score', () => {
      const result = TestLicensingValidator.testInitializeValidation(100);

      expect(result.score).toBe(100);
    });

    it('should initialize empty violations array', () => {
      const result = TestLicensingValidator.testInitializeValidation(100);

      expect(result.violations).toEqual([]);
      expect(result.violations).toHaveLength(0);
    });

    it('should initialize empty suggestions array', () => {
      const result = TestLicensingValidator.testInitializeValidation(100);

      expect(result.suggestions).toEqual([]);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should allow modifying violations', () => {
      const result = TestLicensingValidator.testInitializeValidation(100);
      result.violations.push('test violation');

      expect(result.violations).toHaveLength(1);
    });

    it('should allow modifying suggestions', () => {
      const result = TestLicensingValidator.testInitializeValidation(100);
      result.suggestions.push('test suggestion');

      expect(result.suggestions).toHaveLength(1);
    });

    it('should accept different base scores', () => {
      expect(TestLicensingValidator.testInitializeValidation(0).score).toBe(0);
      expect(TestLicensingValidator.testInitializeValidation(50).score).toBe(
        50
      );
      expect(TestLicensingValidator.testInitializeValidation(100).score).toBe(
        100
      );
    });

    it('should create independent result objects', () => {
      const result1 = TestLicensingValidator.testInitializeValidation(100);
      const result2 = TestLicensingValidator.testInitializeValidation(100);

      result1.violations.push('v1');

      expect(result1.violations).toHaveLength(1);
      expect(result2.violations).toHaveLength(0);
    });
  });

  describe('applyScorePenalty', () => {
    it('should apply penalty based on violation count', () => {
      const violations = ['v1', 'v2'];
      const result = TestLicensingValidator.testApplyScorePenalty(
        violations,
        100,
        10,
        50
      );

      // 100 - min(50, 2 * 10) = 100 - 20 = 80
      expect(result).toBe(80);
    });

    it('should cap penalty at max', () => {
      const violations = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
      const result = TestLicensingValidator.testApplyScorePenalty(
        violations,
        100,
        10,
        30 // max penalty
      );

      // 100 - min(30, 6 * 10) = 100 - 30 = 70
      expect(result).toBe(70);
    });

    it('should return original score for no violations', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        [],
        100,
        10,
        50
      );

      expect(result).toBe(100);
    });

    it('should handle single violation', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        ['v1'],
        100,
        5,
        50
      );

      expect(result).toBe(95);
    });

    it('should handle zero penalty', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        ['v1', 'v2'],
        100,
        0,
        50
      );

      expect(result).toBe(100);
    });

    it('should handle zero max penalty', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        ['v1', 'v2'],
        100,
        10,
        0
      );

      expect(result).toBe(100);
    });

    it('should work with different starting scores', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        ['v1'],
        50,
        10,
        50
      );

      expect(result).toBe(40);
    });

    it('should allow score to go negative', () => {
      const result = TestLicensingValidator.testApplyScorePenalty(
        ['v1', 'v2', 'v3', 'v4', 'v5'],
        20,
        10,
        100 // allows up to 100 penalty
      );

      // 20 - min(100, 5 * 10) = 20 - 50 = -30
      expect(result).toBe(-30);
    });
  });

  describe('Abstract class behavior', () => {
    it('should be an abstract class (cannot be instantiated directly)', () => {
      // TypeScript prevents direct instantiation at compile time
      // We can only verify it exists as a class
      expect(typeof LicensingValidationBase).toBe('function');
    });
  });
});
