/**
 * Core Laws Tests
 * Tests for re-exports from core/laws.ts
 */

import {
  ConstitutionalLaw,
  ConstitutionalLawsRegistry,
  LawResult,
  ModularLawsRegistry,
} from '../../src/core/laws';

describe('core/laws', () => {
  describe('Type exports', () => {
    it('should export ConstitutionalLaw type', () => {
      // Type checking - if this compiles, the type is exported correctly
      const mockLaw: Partial<ConstitutionalLaw> = {
        id: 'test-law',
        name: 'Test Law',
      };
      expect(mockLaw.id).toBe('test-law');
    });

    it('should export LawResult type', () => {
      // Type checking - if this compiles, the type is exported correctly
      const mockResult: Partial<LawResult> = {
        passed: true,
        violations: [],
      };
      expect(mockResult.passed).toBe(true);
    });
  });

  describe('ModularLawsRegistry export', () => {
    it('should export ModularLawsRegistry class', () => {
      expect(ModularLawsRegistry).toBeDefined();
      expect(typeof ModularLawsRegistry).toBe('function');
    });

    it('should have static getInstance method', () => {
      expect(typeof ModularLawsRegistry.getInstance).toBe('function');
    });

    it('should have static getAll method', () => {
      expect(typeof ModularLawsRegistry.getAll).toBe('function');
    });
  });

  describe('ConstitutionalLawsRegistry export', () => {
    it('should export ConstitutionalLawsRegistry class', () => {
      expect(ConstitutionalLawsRegistry).toBeDefined();
      expect(typeof ConstitutionalLawsRegistry).toBe('function');
    });
  });
});
