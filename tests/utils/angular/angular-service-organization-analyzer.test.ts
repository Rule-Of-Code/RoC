/**
 * @fileoverview Tests for angular-service-organization-analyzer.ts
 * @description Tests for Angular service organization analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularServiceOrganizationAnalyzer } from '../../../src/utils/angular/angular-service-organization/angular-service-organization-analyzer';
import { AngularServiceOrganizationValidationPatterns } from '../../../src/utils/angular/angular-service-organization/angular-service-organization-validation-patterns';

describe('utils/angular/angular-service-organization/angular-service-organization-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularServiceOrganizationAnalyzer', () => {
    describe('checkServiceOrganization', () => {
      it('should delegate to AngularServiceOrganizationValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        const result =
          AngularServiceOrganizationAnalyzer.checkServiceOrganization(
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
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: ['Services not organized'],
          suggestions: ['Consider organizing services'],
          filesScanned: 1,
          patternsFound: 1,
        });

        const result =
          AngularServiceOrganizationAnalyzer.checkServiceOrganization(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toContain('Services not organized');
        expect(result.suggestions).toContain('Consider organizing services');

        validateSpy.mockRestore();
      });

      it('should return empty arrays when no issues found', () => {
        const validateSpy = jest.spyOn(
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        const result =
          AngularServiceOrganizationAnalyzer.checkServiceOrganization(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        validateSpy.mockRestore();
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [
            'Unorganized services in root',
            'Missing barrel exports',
          ],
          suggestions: [
            'Consider organizing services',
            'Create index.ts barrel export',
            'Use subdirectories for services',
          ],
          filesScanned: 3,
          patternsFound: 3,
        });

        const result =
          AngularServiceOrganizationAnalyzer.checkServiceOrganization(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(3);

        validateSpy.mockRestore();
      });

      it('should pass different project roots correctly', () => {
        const validateSpy = jest.spyOn(
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        AngularServiceOrganizationAnalyzer.checkServiceOrganization(
          '/different/project/path',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith(
          '/different/project/path',
          mockConfig
        );

        validateSpy.mockRestore();
      });

      it('should pass config correctly', () => {
        const validateSpy = jest.spyOn(
          AngularServiceOrganizationValidationPatterns,
          'validateAllServiceOrganizationPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        const customConfig = {
          ...mockConfig,
          verbose: true,
        } as unknown as RuleOfCodeConfig;

        AngularServiceOrganizationAnalyzer.checkServiceOrganization(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);

        validateSpy.mockRestore();
      });
    });
  });
});
