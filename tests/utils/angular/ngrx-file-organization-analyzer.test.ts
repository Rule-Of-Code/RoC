/**
 * @fileoverview Tests for ngrx-file-organization-analyzer.ts
 * @description Tests for NgRx File Organization Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFileOrganizationAnalyzer } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-analyzer';
import { NgRxFileOrganizationValidationPatterns } from '../../../src/utils/angular/ngrx-file-organization/ngrx-file-organization-validation-patterns';

describe('utils/angular/ngrx-file-organization/ngrx-file-organization-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFileOrganizationAnalyzer', () => {
    describe('checkFileOrganization', () => {
      it('should delegate to NgRxFileOrganizationValidationPatterns.validateAllFileOrganizationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return violations from validation patterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: ['Missing index.ts barrel export in users/+state/'],
          suggestions: [],
        });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(1);
        expect(result.violations[0]).toContain('index.ts');
      });

      it('should return suggestions from validation patterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Consider adding test files to users/+state/ directory',
          ],
        });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('test files');
      });

      it('should return empty results when no issues found', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Missing index.ts barrel export in users/+state/',
            'Missing index.ts barrel export in products/+state/',
          ],
          suggestions: [
            'Create index.ts to export public API from users/+state/',
            'Create index.ts to export public API from products/+state/',
          ],
        });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(2);
      });

      it('should handle different project roots', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/different/project/path',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith(
          '/different/project/path',
          mockConfig
        );
      });

      it('should pass config to validation patterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        const customConfig = {
          ...mockConfig,
          verbose: true,
        } as unknown as RuleOfCodeConfig;

        NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);
      });

      it('should handle naming convention violations', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            "File myfile.ts should start with feature name 'users' in users/+state/",
          ],
        });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions[0]).toContain('feature name');
      });

      it('should handle multiple file type violations', () => {
        const validateSpy = jest.spyOn(
          NgRxFileOrganizationValidationPatterns,
          'validateAllFileOrganizationPatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Multiple action files found in users/+state/, consider consolidating',
            'Multiple reducer files found in users/+state/, consider consolidating',
          ],
        });

        const result = NgRxFileOrganizationAnalyzer.checkFileOrganization(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('action files'))).toBe(
          true
        );
        expect(result.suggestions.some(s => s.includes('reducer files'))).toBe(
          true
        );
      });
    });
  });
});
