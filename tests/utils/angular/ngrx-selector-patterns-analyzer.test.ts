/**
 * @fileoverview Tests for ngrx-selector-patterns-analyzer.ts
 * @description Tests for NgRx Selector Patterns Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxSelectorPatternsAnalyzer } from '../../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-analyzer';
import { NgRxSelectorPatternsValidation } from '../../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-validation';

describe('utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-analyzer', () => {
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

  describe('NgRxSelectorPatternsAnalyzer', () => {
    describe('checkSelectorPatterns', () => {
      let executeAnalysisWorkflowSpy: jest.SpyInstance;

      beforeEach(() => {
        executeAnalysisWorkflowSpy = jest.spyOn(
          NgRxSelectorPatternsValidation,
          'executeAnalysisWorkflow'
        );
      });

      afterEach(() => {
        executeAnalysisWorkflowSpy.mockRestore();
      });

      it('should delegate to NgRxSelectorPatternsValidation.executeAnalysisWorkflow', () => {
        const mockResult = { violations: [], suggestions: [] };
        executeAnalysisWorkflowSpy.mockReturnValue(mockResult);

        NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
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
          violations: ['selector violation'],
          suggestions: ['selector suggestion'],
        };
        executeAnalysisWorkflowSpy.mockReturnValue(mockResult);

        const result = NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
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

        const result = NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
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

        NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
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
          'Missing createSelector usage',
          'Selector naming convention violation',
        ];
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: mockViolations,
          suggestions: [],
        });

        const result = NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toEqual(mockViolations);
      });

      it('should return suggestions from validation workflow', () => {
        const mockSuggestions = [
          'Consider memoizing selector',
          'Use feature selector for better composition',
        ];
        executeAnalysisWorkflowSpy.mockReturnValue({
          violations: [],
          suggestions: mockSuggestions,
        });

        const result = NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions).toEqual(mockSuggestions);
      });
    });
  });
});
