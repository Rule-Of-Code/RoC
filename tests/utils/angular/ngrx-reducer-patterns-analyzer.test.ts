/**
 * @fileoverview Tests for ngrx-reducer-patterns-analyzer.ts
 * @description Tests for NgRx Reducer Patterns Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxReducerPatternsAnalyzer } from '../../../src/utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-analyzer';
import { NgRxReducerPatternsValidation } from '../../../src/utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-validation';

describe('utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-analyzer', () => {
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

  describe('NgRxReducerPatternsAnalyzer', () => {
    describe('checkReducerPatterns', () => {
      let executeAnalysisWorkflowSpy: jest.SpyInstance;

      beforeEach(() => {
        executeAnalysisWorkflowSpy = jest.spyOn(
          NgRxReducerPatternsValidation,
          'executeAnalysisWorkflow'
        );
      });

      afterEach(() => {
        executeAnalysisWorkflowSpy.mockRestore();
      });

      it('should delegate to NgRxReducerPatternsValidation.executeAnalysisWorkflow', () => {
        const mockResult = { violations: [], suggestions: [] };
        executeAnalysisWorkflowSpy.mockReturnValue(mockResult);

        NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          '/test/project',
          mockConfig
        );

        expect(executeAnalysisWorkflowSpy).toHaveBeenCalledWith(
          '/test/project',
          mockConfig
        );
      });

      it('should return result from validation workflow', () => {
        const mockResult = {
          violations: ['test violation'],
          suggestions: ['test suggestion'],
        };
        executeAnalysisWorkflowSpy.mockReturnValue(mockResult);

        const result = NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          '/test/project',
          mockConfig
        );

        expect(result).toEqual(mockResult);
      });

      it('should return empty arrays when no issues found', () => {
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should pass project root correctly', () => {
        const projectRoot = '/custom/project/path';
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          projectRoot,
          mockConfig
        );

        expect(executeAnalysisWorkflowSpy).toHaveBeenCalledWith(
          projectRoot,
          expect.any(Object)
        );
      });

      it('should return violations from validation workflow', () => {
        const mockViolations = [
          'Missing action handling pattern',
          'Immutability violation detected',
        ];
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: mockViolations,
          suggestions: [],
        });

        const result = NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toEqual(mockViolations);
      });

      it('should return suggestions from validation workflow', () => {
        const mockSuggestions = [
          'Consider using createReducer',
          'Use on() for action handling',
        ];
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: [],
          suggestions: mockSuggestions,
        });

        const result = NgRxReducerPatternsAnalyzer.checkReducerPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions).toEqual(mockSuggestions);
      });
    });
  });
});
