/**
 * @fileoverview Tests for ngrx-feature-store-structure-analyzer.ts
 * @description Tests for NgRx Feature Store Structure Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreStructureAnalyzer } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-structure-analyzer';
import { NgRxFeatureStoreValidationPatterns } from '../../../src/utils/angular/ngrx-feature-store/ngrx-feature-store-validation-patterns';

describe('utils/angular/ngrx-feature-store/ngrx-feature-store-structure-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxFeatureStoreStructureAnalyzer', () => {
    describe('checkFeatureStoreStructure', () => {
      it('should delegate to NgRxFeatureStoreValidationPatterns.validateAllFeatureStorePatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
      });

      it('should return violations from validation patterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({
          violations: ['Missing +state directory in users feature'],
          suggestions: [],
        });

        const result =
          NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(1);
        expect(result.violations[0]).toContain('+state');
      });

      it('should return suggestions from validation patterns', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({
          violations: [],
          suggestions: ['Create +state directory in users feature directory'],
        });

        const result =
          NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('+state');
      });

      it('should return empty results when no issues found', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        const result =
          NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should handle multiple violations', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({
          violations: [
            'Missing +state directory in users feature',
            'Missing required file user.actions.ts in products/+state/',
          ],
          suggestions: [
            'Create +state directory in users feature directory',
            'Create user.actions.ts in products/+state/ directory',
          ],
        });

        const result =
          NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(2);
      });

      it('should handle different project roots', () => {
        const validateSpy = jest.spyOn(
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
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
          NgRxFeatureStoreValidationPatterns,
          'validateAllFeatureStorePatterns'
        );
        validateSpy.mockReturnValue({ violations: [], suggestions: [] });

        const customConfig = {
          ...mockConfig,
          verbose: true,
        } as unknown as RuleOfCodeConfig;

        NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
          '/test/project',
          customConfig
        );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', customConfig);
      });
    });
  });
});
