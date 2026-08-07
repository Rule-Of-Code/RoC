/**
 * @fileoverview Tests for ngrx-feature-store-validation-patterns.ts
 * @description Tests for NgRx Feature Store Validation Patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreConfiguration } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-configuration';
import { NgRxFeatureStoreValidationPatterns } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-validation-patterns';

describe('utils/angular/ngrx-feature-store/ngrx-feature-store-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFeatureStoreValidationPatterns', () => {
    describe('validateAllFeatureStorePatterns', () => {
      it('should return suggestion when no feature directories found', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue([]);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(false);

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('feature directories');
      });

      it('should validate feature with missing +state directory', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue(['/test/project/src/app/users']);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: false,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: [],
          optionalFiles: [],
        });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(
            v => v.includes('users') && v.includes('+state')
          )
        ).toBe(true);
        expect(result.suggestions.some(s => s.includes('users'))).toBe(true);
      });

      it('should validate feature with missing required files', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue(['/test/project/src/app/users']);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: true,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: ['users.actions.ts', 'users.reducer.ts'],
          optionalFiles: [],
        });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.violations.some(v => v.includes('users.actions.ts'))
        ).toBe(true);
        expect(
          result.violations.some(v => v.includes('users.reducer.ts'))
        ).toBe(true);
      });

      it('should suggest optional files for better architecture', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue(['/test/project/src/app/users']);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: true,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: [],
          optionalFiles: ['users.facade.ts'],
        });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(
          result.suggestions.some(s => s.includes('users.facade.ts'))
        ).toBe(true);
      });

      it('should return empty arrays when all features are valid', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue(['/test/project/src/app/users']);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: true,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: [],
          optionalFiles: [],
        });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should validate multiple feature directories', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue([
          '/test/project/src/app/users',
          '/test/project/src/app/products',
        ]);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy
          .mockReturnValueOnce({
            featureName: 'users',
            hasStateDir: false,
            stateDir: '/test/project/src/app/users/+state',
            missingFiles: [],
            optionalFiles: [],
          })
          .mockReturnValueOnce({
            featureName: 'products',
            hasStateDir: true,
            stateDir: '/test/project/src/app/products/+state',
            missingFiles: ['products.actions.ts'],
            optionalFiles: [],
          });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.some(v => v.includes('users'))).toBe(true);
        expect(
          result.violations.some(v => v.includes('products.actions.ts'))
        ).toBe(true);
      });

      it('should filter directories without feature indicators', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue([
          '/test/project/src/app/users',
          '/test/project/src/app/shared',
        ]);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockImplementation((dir: string) => {
          return dir.includes('users');
        });

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: true,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: [],
          optionalFiles: [],
        });

        NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
          '/test/project',
          mockConfig
        );

        expect(analyzeFeatureSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle mixed violations and suggestions correctly', () => {
        const findDirsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'findPotentialFeatureDirectories'
        );
        findDirsSpy.mockReturnValue(['/test/project/src/app/users']);

        const hasIndicatorsSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'hasFeatureIndicators'
        );
        hasIndicatorsSpy.mockReturnValue(true);

        const analyzeFeatureSpy = jest.spyOn(
          NgRxFeatureStoreConfiguration,
          'analyzeFeatureStructure'
        );
        analyzeFeatureSpy.mockReturnValue({
          featureName: 'users',
          hasStateDir: true,
          stateDir: '/test/project/src/app/users/+state',
          missingFiles: ['users.actions.ts'],
          optionalFiles: ['users.facade.ts'],
        });

        const result =
          NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });
  });
});
