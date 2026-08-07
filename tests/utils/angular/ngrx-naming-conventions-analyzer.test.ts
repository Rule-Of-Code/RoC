/**
 * @fileoverview Tests for ngrx-naming-conventions-analyzer.ts
 * @description Tests for NgRx Naming Conventions Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxNamingConventionsAnalyzer } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-analyzer';
import { NgRxNamingConventionsValidationPatterns } from '../../../src/utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-validation-patterns';

describe('utils/angular/ngrx-naming-conventions/ngrx-naming-conventions-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxNamingConventionsAnalyzer', () => {
    describe('checkNamingConventions', () => {
      it('should return empty violations and suggestions when no issues found', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return violations when naming convention issues are detected', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [
            "Action 'loadUsers' should start with '[User]' prefix in user.actions.ts",
            "Action 'fetchData' should start with '[Data]' prefix in data.actions.ts",
          ],
          suggestions: [
            "Rename action to '[User] loadUsers'",
            "Rename action to '[Data] fetchData'",
          ],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('loadUsers');
        expect(result.violations[1]).toContain('fetchData');
      });

      it('should return suggestions for naming improvements', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [
            "Reducer should be named 'userReducer' in user.reducer.ts",
            "Selector 'getUsers' should start with 'select' prefix in user.selectors.ts",
          ],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('userReducer');
        expect(result.suggestions[1]).toContain('select');
      });

      it('should delegate to NgRxNamingConventionsValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: ['test violation'],
          suggestions: ['test suggestion'],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/custom/project/path',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledTimes(1);
        expect(validateSpy).toHaveBeenCalledWith(
          '/custom/project/path',
          mockConfig
        );
        expect(result).toEqual({
          violations: ['test violation'],
          suggestions: ['test suggestion'],
        });
      });

      it('should handle empty project root', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('', mockConfig);
        expect(result.violations).toHaveLength(0);
      });

      it('should pass config to validation patterns', () => {
        const customConfig = {
          ...mockConfig,
          verbose: true,
          excludePatterns: ['node_modules', 'dist', 'coverage'],
        } as unknown as RuleOfCodeConfig;

        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);
      });

      it('should return both violations and suggestions together', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: ["Action 'test' should start with '[Feature]' prefix"],
          suggestions: [
            "Rename action to '[Feature] test'",
            'Consider using PascalCase for action text',
          ],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(1);
        expect(result.suggestions).toHaveLength(2);
      });

      it('should handle multiple file violations', () => {
        const validateSpy = jest.spyOn(
          NgRxNamingConventionsValidationPatterns,
          'validateAllNamingConventions'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Issue in user.actions.ts',
            'Issue in order.actions.ts',
            'Issue in product.reducer.ts',
          ],
          suggestions: [
            'Fix in user.actions.ts',
            'Fix in order.actions.ts',
            'Fix in product.reducer.ts',
          ],
        });

        const result = NgRxNamingConventionsAnalyzer.checkNamingConventions(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(3);
        expect(result.suggestions).toHaveLength(3);
      });
    });
  });
});
