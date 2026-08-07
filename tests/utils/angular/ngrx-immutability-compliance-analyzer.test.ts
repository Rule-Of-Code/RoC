/**
 * @fileoverview Tests for ngrx-immutability-compliance-analyzer.ts
 * @description Tests for NgRx Immutability Compliance Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxImmutabilityComplianceAnalyzer } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-compliance-analyzer';
import { NgRxImmutabilityValidationPatterns } from '../../../src/utils/angular/ngrx-immutability/ngrx-immutability-validation-patterns';

describe('utils/angular/ngrx-immutability/ngrx-immutability-compliance-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxImmutabilityComplianceAnalyzer', () => {
    describe('checkImmutabilityCompliance', () => {
      it('should return empty violations and suggestions when no issues found', () => {
        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return violations when immutability issues are detected', () => {
        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Direct state mutation detected in test.reducer.ts',
            'Nested object mutation detected in user.reducer.ts',
          ],
          suggestions: [
            'Use immutable update patterns in test.reducer.ts',
            'Use nested spread operators in user.reducer.ts',
          ],
        });

        const result =
          NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('Direct state mutation');
        expect(result.violations[1]).toContain('Nested object mutation');
      });

      it('should return suggestions for improvement', () => {
        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Use spread operator for immutable updates in test.reducer.ts',
            'Use immutable array methods in user.reducer.ts',
          ],
        });

        const result =
          NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('spread operator');
      });

      it('should delegate to NgRxImmutabilityValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: ['violation1'],
          suggestions: ['suggestion1'],
        });

        NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
          '/custom/path',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledTimes(1);
        expect(validateSpy).toHaveBeenCalledWith('/custom/path', mockConfig);
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Direct state mutation detected in a.reducer.ts',
            'Array mutation detected in b.reducer.ts',
            'Object.assign mutation detected in c.reducer.ts',
          ],
          suggestions: [
            'Use spread operator in a.reducer.ts',
            'Use immutable array methods in b.reducer.ts',
            'Use proper patterns in c.reducer.ts',
          ],
        });

        const result =
          NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(3);
        expect(result.suggestions).toHaveLength(3);
      });

      it('should pass the config object correctly', () => {
        const customConfig = {
          projectRoot: '/custom/project',
          verbose: true,
          excludePatterns: ['custom'],
          includePatterns: ['**/*.reducer.ts'],
        } as unknown as RuleOfCodeConfig;

        const validateSpy = jest.spyOn(
          NgRxImmutabilityValidationPatterns,
          'validateAllImmutabilityPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);
      });
    });
  });
});
