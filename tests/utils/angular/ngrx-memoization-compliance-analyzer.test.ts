/**
 * @fileoverview Tests for ngrx-memoization-compliance-analyzer.ts
 * @description Tests for NgRx Memoization Compliance Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxMemoizationComplianceAnalyzer } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-compliance-analyzer';
import { NgRxMemoizationValidationPatterns } from '../../../src/utils/angular/ngrx-memoization/ngrx-memoization-validation-patterns';

describe('utils/angular/ngrx-memoization/ngrx-memoization-compliance-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxMemoizationComplianceAnalyzer', () => {
    describe('checkMemoizationCompliance', () => {
      it('should return empty violations and suggestions when no issues found', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return violations when memoization issues are detected', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Direct state access without memoization in test.selectors.ts',
            'createSelector used but @ngrx/store not imported in user.selectors.ts',
          ],
          suggestions: [
            'Wrap state access with createSelector in test.selectors.ts',
            'Import createSelector from @ngrx/store in user.selectors.ts',
          ],
        });

        const result =
          NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('Direct state access');
        expect(result.violations[1]).toContain('@ngrx/store not imported');
      });

      it('should return suggestions for improvement', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Use createFeatureSelector for single state parameter selectors',
            'Consider composing selectors for better reusability',
          ],
        });

        const result =
          NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('createFeatureSelector');
      });

      it('should delegate to NgRxMemoizationValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: ['violation1'],
          suggestions: ['suggestion1'],
        });

        NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
          '/custom/path',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledTimes(1);
        expect(validateSpy).toHaveBeenCalledWith('/custom/path', mockConfig);
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Direct state access without memoization in a.selectors.ts',
            'Direct store.select usage in b.component.ts',
            'Missing store import in c.selectors.ts',
          ],
          suggestions: [
            'Wrap with createSelector in a.selectors.ts',
            'Use memoized selectors in b.component.ts',
            'Import from @ngrx/store in c.selectors.ts',
          ],
        });

        const result =
          NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
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
          includePatterns: ['**/*.selectors.ts'],
        } as unknown as RuleOfCodeConfig;

        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);
      });

      it('should handle component-related violations', () => {
        const validateSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: ['Direct store.select usage in app.component.ts'],
          suggestions: [
            'Use memoized selectors in app.component.ts',
            'Use async pipe instead of subscriptions in app.component.ts',
          ],
        });

        const result =
          NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('store.select'))).toBe(
          true
        );
        expect(result.suggestions.some(s => s.includes('async pipe'))).toBe(
          true
        );
      });
    });
  });
});
