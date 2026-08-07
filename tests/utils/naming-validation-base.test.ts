/**
 * @fileoverview Tests for naming-validation-base.ts
 * @description Tests for naming validation base utilities
 */

import { initializeNamingValidation } from '../../src/utils/naming/naming-validation-base';

describe('utils/naming/naming-validation-base', () => {
  describe('initializeNamingValidation', () => {
    it('should return object with violations array', () => {
      const result = initializeNamingValidation();
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return object with suggestions array', () => {
      const result = initializeNamingValidation();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return empty violations array', () => {
      const result = initializeNamingValidation();
      expect(result.violations).toHaveLength(0);
    });

    it('should return empty suggestions array', () => {
      const result = initializeNamingValidation();
      expect(result.suggestions).toHaveLength(0);
    });

    it('should return fresh arrays on each call', () => {
      const result1 = initializeNamingValidation();
      const result2 = initializeNamingValidation();

      expect(result1.violations).not.toBe(result2.violations);
      expect(result1.suggestions).not.toBe(result2.suggestions);
    });

    it('should allow pushing to violations', () => {
      const result = initializeNamingValidation();
      result.violations.push('test violation');

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toBe('test violation');
    });

    it('should allow pushing to suggestions', () => {
      const result = initializeNamingValidation();
      result.suggestions.push('test suggestion');

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]).toBe('test suggestion');
    });

    it('should have only violations and suggestions properties', () => {
      const result = initializeNamingValidation();
      const keys = Object.keys(result);

      expect(keys).toHaveLength(2);
      expect(keys).toContain('violations');
      expect(keys).toContain('suggestions');
    });

    it('should work in typical validation pattern', () => {
      const { violations, suggestions } = initializeNamingValidation();

      // Simulating a validation process
      const isValid = false;
      if (!isValid) {
        violations.push('Naming convention violated');
        suggestions.push('Use camelCase for variables');
      }

      expect(violations).toHaveLength(1);
      expect(suggestions).toHaveLength(1);
    });

    it('should support spread operator on arrays', () => {
      const result = initializeNamingValidation();
      result.violations.push('violation1', 'violation2');

      const spreadViolations = [...result.violations];
      expect(spreadViolations).toHaveLength(2);
    });
  });
});
