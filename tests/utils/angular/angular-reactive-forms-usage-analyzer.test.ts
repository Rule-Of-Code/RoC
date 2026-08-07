/**
 * @fileoverview Tests for angular-reactive-forms-usage-analyzer.ts
 * @description Tests for Angular reactive forms usage analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularReactiveFormsUsageAnalyzer } from '../../../src/utils/angular/angular-reactive-forms/angular-reactive-forms-usage-analyzer';
import { AngularReactiveFormsValidationPatterns } from '../../../src/utils/angular/angular-reactive-forms/angular-reactive-forms-validation-patterns';

describe('utils/angular/angular-reactive-forms/angular-reactive-forms-usage-analyzer', () => {
  describe('AngularReactiveFormsUsageAnalyzer', () => {
    const mockConfig = {
      projectRoot: '/test/project',
      verbose: false,
      excludePatterns: ['node_modules', 'dist'],
      includePatterns: ['**/*.ts'],
    } as unknown as RuleOfCodeConfig;

    describe('checkReactiveFormsUsage', () => {
      it('should delegate to AngularReactiveFormsValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          AngularReactiveFormsValidationPatterns,
          'validateAllReactiveFormsPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
            '/test/project',
            mockConfig
          );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');

        validateSpy.mockRestore();
      });

      it('should return violations from validation patterns', () => {
        const validateSpy = jest.spyOn(
          AngularReactiveFormsValidationPatterns,
          'validateAllReactiveFormsPatterns'
        );

        validateSpy.mockReturnValue({
          violations: ['Template-driven forms found'],
          suggestions: ['Migrate to reactive forms'],
        });

        const result =
          AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toContain('Template-driven forms found');
        expect(result.suggestions).toContain('Migrate to reactive forms');

        validateSpy.mockRestore();
      });

      it('should return empty arrays when no issues found', () => {
        const validateSpy = jest.spyOn(
          AngularReactiveFormsValidationPatterns,
          'validateAllReactiveFormsPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        validateSpy.mockRestore();
      });

      it('should pass projectRoot and config to validation method', () => {
        const validateSpy = jest.spyOn(
          AngularReactiveFormsValidationPatterns,
          'validateAllReactiveFormsPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const customConfig = {
          projectRoot: '/custom/project',
          verbose: true,
          excludePatterns: ['test'],
          includePatterns: ['src/**/*.ts'],
        } as unknown as RuleOfCodeConfig;

        AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
          '/custom/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith(
          '/custom/project',
          customConfig
        );

        validateSpy.mockRestore();
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          AngularReactiveFormsValidationPatterns,
          'validateAllReactiveFormsPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [
            'Template-driven forms found in component1.ts',
            'Missing imports in component2.ts',
          ],
          suggestions: [
            'Migrate to reactive forms in component1.ts',
            'Import ReactiveFormsModule in component2.ts',
          ],
        });

        const result =
          AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(2);

        validateSpy.mockRestore();
      });
    });
  });
});
