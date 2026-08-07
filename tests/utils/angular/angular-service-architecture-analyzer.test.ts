/**
 * @fileoverview Tests for angular-service-architecture-analyzer.ts
 * @description Tests for Angular service architecture analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularServiceArchitectureAnalyzer } from '../../../src/utils/angular/angular-service-architecture/angular-service-architecture-analyzer';
import { AngularServiceArchitectureValidationPatterns } from '../../../src/utils/angular/angular-service-architecture/angular-service-architecture-validation-patterns';

describe('utils/angular/angular-service-architecture/angular-service-architecture-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularServiceArchitectureAnalyzer', () => {
    describe('checkServiceArchitecture', () => {
      it('should delegate to AngularServiceArchitectureValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
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
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: ['Missing @Injectable decorator'],
          suggestions: ['Add @Injectable() decorator'],
        });

        const result =
          AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toContain('Missing @Injectable decorator');
        expect(result.suggestions).toContain('Add @Injectable() decorator');

        validateSpy.mockRestore();
      });

      it('should return empty arrays when no issues found', () => {
        const validateSpy = jest.spyOn(
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result =
          AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        validateSpy.mockRestore();
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: [
            'Missing @Injectable in user.service.ts',
            'Observable used but not imported in data.service.ts',
          ],
          suggestions: [
            'Add @Injectable() decorator',
            'Import Observable from rxjs',
            'Use providedIn: root',
          ],
        });

        const result =
          AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(3);

        validateSpy.mockRestore();
      });

      it('should pass different project roots correctly', () => {
        const validateSpy = jest.spyOn(
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
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
          AngularServiceArchitectureValidationPatterns,
          'validateAllServicePatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const customConfig = {
          ...mockConfig,
          verbose: true,
        } as unknown as RuleOfCodeConfig;

        AngularServiceArchitectureAnalyzer.checkServiceArchitecture(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);

        validateSpy.mockRestore();
      });
    });
  });
});
