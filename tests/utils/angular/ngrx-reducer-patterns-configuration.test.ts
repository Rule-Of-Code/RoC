/**
 * @fileoverview Tests for ngrx-reducer-patterns-configuration.ts
 * @description Tests for NgRx Reducer Patterns Configuration utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxReducerPatternsConfiguration } from '../../../src/utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-configuration';
import { DIRECTORY_NAMES } from '../../../src/utils/constants';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-configuration', () => {
  const mockConfig = {
    project: {
      name: 'test-project',
      componentPrefix: 'app',
      type: 'angular',
    },
    ignores: {
      global: ['node_modules', 'dist'],
    },
  } as unknown as RuleOfCodeConfig;

  describe('NgRxReducerPatternsConfiguration', () => {
    describe('ANALYZER_ORCHESTRATION_CONFIG', () => {
      it('should have actionHandling configuration', () => {
        const config =
          NgRxReducerPatternsConfiguration.ANALYZER_ORCHESTRATION_CONFIG;

        expect(config.actionHandling).toBeDefined();
        expect(config.actionHandling.enabled).toBe(true);
        expect(config.actionHandling.priority).toBe(1);
        expect(config.actionHandling.description).toContain('action handling');
      });

      it('should have immutabilityCompliance configuration', () => {
        const config =
          NgRxReducerPatternsConfiguration.ANALYZER_ORCHESTRATION_CONFIG;

        expect(config.immutabilityCompliance).toBeDefined();
        expect(config.immutabilityCompliance.enabled).toBe(true);
        expect(config.immutabilityCompliance.priority).toBe(2);
        expect(config.immutabilityCompliance.description).toContain(
          'immutability'
        );
      });
    });

    describe('RESULT_AGGREGATION_CONFIG', () => {
      it('should have mergeViolations enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.RESULT_AGGREGATION_CONFIG
            .mergeViolations
        ).toBe(true);
      });

      it('should have mergeSuggestions enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.RESULT_AGGREGATION_CONFIG
            .mergeSuggestions
        ).toBe(true);
      });

      it('should have deduplicateResults enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.RESULT_AGGREGATION_CONFIG
            .deduplicateResults
        ).toBe(true);
      });

      it('should have prioritizeViolations enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.RESULT_AGGREGATION_CONFIG
            .prioritizeViolations
        ).toBe(true);
      });
    });

    describe('DEFAULT_ANALYSIS_OPTIONS', () => {
      it('should have includeActionHandling enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.DEFAULT_ANALYSIS_OPTIONS
            .includeActionHandling
        ).toBe(true);
      });

      it('should have includeImmutabilityCheck enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.DEFAULT_ANALYSIS_OPTIONS
            .includeImmutabilityCheck
        ).toBe(true);
      });

      it('should have enableDeepAnalysis enabled', () => {
        expect(
          NgRxReducerPatternsConfiguration.DEFAULT_ANALYSIS_OPTIONS
            .enableDeepAnalysis
        ).toBe(true);
      });

      it('should have reportDetailLevel set to detailed', () => {
        expect(
          NgRxReducerPatternsConfiguration.DEFAULT_ANALYSIS_OPTIONS
            .reportDetailLevel
        ).toBe('detailed');
      });
    });

    describe('getAnalyzerOrchestration', () => {
      it('should return orchestration configuration', () => {
        const result =
          NgRxReducerPatternsConfiguration.getAnalyzerOrchestration();

        expect(result).toBe(
          NgRxReducerPatternsConfiguration.ANALYZER_ORCHESTRATION_CONFIG
        );
      });

      it('should include action handling config', () => {
        const result =
          NgRxReducerPatternsConfiguration.getAnalyzerOrchestration();

        expect(result.actionHandling).toBeDefined();
        expect(result.actionHandling.enabled).toBe(true);
      });

      it('should include immutability compliance config', () => {
        const result =
          NgRxReducerPatternsConfiguration.getAnalyzerOrchestration();

        expect(result.immutabilityCompliance).toBeDefined();
        expect(result.immutabilityCompliance.enabled).toBe(true);
      });
    });

    describe('getResultAggregationConfig', () => {
      it('should return result aggregation configuration', () => {
        const result =
          NgRxReducerPatternsConfiguration.getResultAggregationConfig();

        expect(result).toBe(
          NgRxReducerPatternsConfiguration.RESULT_AGGREGATION_CONFIG
        );
      });

      it('should have all expected properties', () => {
        const result =
          NgRxReducerPatternsConfiguration.getResultAggregationConfig();

        expect(result.mergeViolations).toBeDefined();
        expect(result.mergeSuggestions).toBeDefined();
        expect(result.deduplicateResults).toBeDefined();
        expect(result.prioritizeViolations).toBeDefined();
      });
    });

    describe('getDefaultAnalysisOptions', () => {
      it('should return default analysis options', () => {
        const result =
          NgRxReducerPatternsConfiguration.getDefaultAnalysisOptions();

        expect(result).toBe(
          NgRxReducerPatternsConfiguration.DEFAULT_ANALYSIS_OPTIONS
        );
      });

      it('should have all expected properties', () => {
        const result =
          NgRxReducerPatternsConfiguration.getDefaultAnalysisOptions();

        expect(result.includeActionHandling).toBeDefined();
        expect(result.includeImmutabilityCheck).toBeDefined();
        expect(result.enableDeepAnalysis).toBeDefined();
        expect(result.reportDetailLevel).toBeDefined();
      });
    });

    describe('getSourcePath', () => {
      let joinSpy: jest.SpyInstance;
      let existsSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
        existsSpy.mockRestore();
      });

      it('should return source path when directory exists', () => {
        existsSpy.mockReturnValue(true);

        const result =
          NgRxReducerPatternsConfiguration.getSourcePath('/test/project');

        expect(result).toBe(`/test/project/${DIRECTORY_NAMES.SRC}`);
      });

      it('should return null when src directory does not exist', () => {
        existsSpy.mockReturnValue(false);

        const result =
          NgRxReducerPatternsConfiguration.getSourcePath('/test/project');

        expect(result).toBeNull();
      });

      it('should check existence of src directory', () => {
        existsSpy.mockReturnValue(true);

        NgRxReducerPatternsConfiguration.getSourcePath('/test/project');

        expect(existsSpy).toHaveBeenCalledWith(
          `/test/project/${DIRECTORY_NAMES.SRC}`
        );
      });
    });

    describe('validateProjectConfig', () => {
      let joinSpy: jest.SpyInstance;
      let existsSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
        existsSpy.mockRestore();
      });

      it('should return valid result when src exists', () => {
        existsSpy.mockReturnValue(true);

        const result = NgRxReducerPatternsConfiguration.validateProjectConfig(
          '/test/project',
          mockConfig
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should add warning when src directory does not exist', () => {
        existsSpy.mockReturnValue(false);

        const result = NgRxReducerPatternsConfiguration.validateProjectConfig(
          '/test/project',
          mockConfig
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Source directory not found');
      });

      it('should return errors for empty project root', () => {
        existsSpy.mockReturnValue(false);

        const result = NgRxReducerPatternsConfiguration.validateProjectConfig(
          '',
          mockConfig
        );

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return validation result structure', () => {
        existsSpy.mockReturnValue(true);

        const result = NgRxReducerPatternsConfiguration.validateProjectConfig(
          '/test/project',
          mockConfig
        );

        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });
    });
  });
});
