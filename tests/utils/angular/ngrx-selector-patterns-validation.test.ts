/**
 * @fileoverview Tests for ngrx-selector-patterns-validation.ts
 * @description Tests for NgRx Selector Patterns Validation utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxMemoizationValidationPatterns } from '../../../src/utils/angular/ngrx-memoization';
import { NgRxSelectorPatternsConfiguration } from '../../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-configuration';
import { NgRxSelectorPatternsValidation } from '../../../src/utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-validation';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup';

describe('utils/angular/ngrx-selector-patterns/ngrx-selector-patterns-validation', () => {
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

  describe('NgRxSelectorPatternsValidation', () => {
    describe('executeAnalysisWorkflow', () => {
      let validateProjectConfigSpy: jest.SpyInstance;
      let validateAllMemoizationPatternsSpy: jest.SpyInstance;

      beforeEach(() => {
        validateProjectConfigSpy = jest.spyOn(
          NgRxSelectorPatternsConfiguration,
          'validateProjectConfig'
        );
        validateAllMemoizationPatternsSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'validateAllMemoizationPatterns'
        );
      });

      afterEach(() => {
        validateProjectConfigSpy.mockRestore();
        validateAllMemoizationPatternsSpy.mockRestore();
      });

      it('should return early with errors when config validation fails', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: false,
          errors: ['Invalid project configuration'],
          warnings: [],
        });

        const result = NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toContain('Invalid project configuration');
        expect(result.suggestions).toHaveLength(0);
        expect(validateAllMemoizationPatternsSpy).not.toHaveBeenCalled();
      });

      it('should delegate to memoization validation when config is valid', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        validateAllMemoizationPatternsSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(validateAllMemoizationPatternsSpy).toHaveBeenCalledWith(
          '/test/project',
          mockConfig
        );
      });

      it('should deduplicate violations', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        validateAllMemoizationPatternsSpy.mockReturnValue({
          violations: ['duplicate', 'duplicate', 'unique'],
          suggestions: [],
        });

        const result = NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(
          result.violations.filter((v: string) => v === 'duplicate')
        ).toHaveLength(1);
        expect(result.violations).toContain('unique');
      });

      it('should deduplicate suggestions', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        validateAllMemoizationPatternsSpy.mockReturnValue({
          violations: [],
          suggestions: ['duplicate', 'duplicate', 'unique'],
        });

        const result = NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter((s: string) => s === 'duplicate')
        ).toHaveLength(1);
        expect(result.suggestions).toContain('unique');
      });

      it('should return empty arrays when no issues found', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        validateAllMemoizationPatternsSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxSelectorPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('analyzeIndividualSelectorFile', () => {
      let analyzeSelectorFileSpy: jest.SpyInstance;

      beforeEach(() => {
        analyzeSelectorFileSpy = jest.spyOn(
          NgRxMemoizationValidationPatterns,
          'analyzeSelectorFileComprehensive'
        );
      });

      afterEach(() => {
        analyzeSelectorFileSpy.mockRestore();
      });

      it('should delegate to memoization validation patterns', () => {
        analyzeSelectorFileSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxSelectorPatternsValidation.analyzeIndividualSelectorFile(
          '/test/file.selectors.ts'
        );

        expect(analyzeSelectorFileSpy).toHaveBeenCalledWith(
          '/test/file.selectors.ts'
        );
      });

      it('should return violations from analysis', () => {
        analyzeSelectorFileSpy.mockReturnValue({
          violations: ['Missing createSelector'],
          suggestions: [],
        });

        const result =
          NgRxSelectorPatternsValidation.analyzeIndividualSelectorFile(
            '/test/file.selectors.ts'
          );

        expect(result.violations).toContain('Missing createSelector');
      });

      it('should return suggestions from analysis', () => {
        analyzeSelectorFileSpy.mockReturnValue({
          violations: [],
          suggestions: ['Use memoization'],
        });

        const result =
          NgRxSelectorPatternsValidation.analyzeIndividualSelectorFile(
            '/test/file.selectors.ts'
          );

        expect(result.suggestions).toContain('Use memoization');
      });
    });

    describe('getAnalysisSummary', () => {
      let calculateSeveritySpy: jest.SpyInstance;
      let countIssuesByCategorySpy: jest.SpyInstance;

      beforeEach(() => {
        calculateSeveritySpy = jest.spyOn(
          NgRxSetupConfiguration,
          'calculateSeverity'
        );
        countIssuesByCategorySpy = jest.spyOn(
          NgRxSetupConfiguration,
          'countIssuesByCategory'
        );
      });

      afterEach(() => {
        calculateSeveritySpy.mockRestore();
        countIssuesByCategorySpy.mockRestore();
      });

      it('should calculate total issues correctly', () => {
        calculateSeveritySpy.mockReturnValue('low');
        countIssuesByCategorySpy.mockReturnValue(0);

        const results = {
          violations: ['v1', 'v2'],
          suggestions: ['s1', 's2', 's3'],
        };

        const summary =
          NgRxSelectorPatternsValidation.getAnalysisSummary(results);

        expect(summary.totalIssues).toBe(5);
        expect(summary.violationsCount).toBe(2);
        expect(summary.suggestionsCount).toBe(3);
      });

      it('should use calculateSeverity for severity', () => {
        calculateSeveritySpy.mockReturnValue('high');
        countIssuesByCategorySpy.mockReturnValue(0);

        const results = {
          violations: Array(15).fill('violation'),
          suggestions: [],
        };

        const summary =
          NgRxSelectorPatternsValidation.getAnalysisSummary(results);

        expect(calculateSeveritySpy).toHaveBeenCalledWith(15);
        expect(summary.severity).toBe('high');
      });

      it('should mark analysis as complete', () => {
        calculateSeveritySpy.mockReturnValue('low');
        countIssuesByCategorySpy.mockReturnValue(0);

        const results = { violations: [], suggestions: [] };

        const summary =
          NgRxSelectorPatternsValidation.getAnalysisSummary(results);

        expect(summary.analysisComplete).toBe(true);
      });

      it('should return pattern breakdown', () => {
        calculateSeveritySpy.mockReturnValue('low');
        countIssuesByCategorySpy.mockReturnValue(2);

        const results = { violations: [], suggestions: [] };

        const summary =
          NgRxSelectorPatternsValidation.getAnalysisSummary(results);

        expect(summary.patterns).toBeDefined();
        expect(summary.patterns.namingIssues).toBeDefined();
        expect(summary.patterns.memoizationIssues).toBeDefined();
        expect(summary.patterns.parameterIssues).toBeDefined();
        expect(summary.patterns.reusabilityIssues).toBeDefined();
        expect(summary.patterns.propsIssues).toBeDefined();
      });

      it('should call countIssuesByCategory for each pattern type', () => {
        calculateSeveritySpy.mockReturnValue('low');
        countIssuesByCategorySpy.mockReturnValue(0);

        const results = {
          violations: ['naming issue'],
          suggestions: ['memoization suggestion'],
        };

        NgRxSelectorPatternsValidation.getAnalysisSummary(results);

        expect(countIssuesByCategorySpy).toHaveBeenCalledWith(
          results.violations,
          results.suggestions,
          'naming'
        );
        expect(countIssuesByCategorySpy).toHaveBeenCalledWith(
          results.violations,
          results.suggestions,
          'createSelector'
        );
        expect(countIssuesByCategorySpy).toHaveBeenCalledWith(
          results.violations,
          results.suggestions,
          'parameter'
        );
        expect(countIssuesByCategorySpy).toHaveBeenCalledWith(
          results.violations,
          results.suggestions,
          'props'
        );
      });
    });

    describe('validateAnalysisPrerequisites', () => {
      let validateProjectConfigSpy: jest.SpyInstance;

      beforeEach(() => {
        validateProjectConfigSpy = jest.spyOn(
          NgRxSelectorPatternsConfiguration,
          'validateProjectConfig'
        );
      });

      afterEach(() => {
        validateProjectConfigSpy.mockRestore();
      });

      it('should return canProceed true when config is valid', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });

        const result =
          NgRxSelectorPatternsValidation.validateAnalysisPrerequisites(
            '/test/project',
            mockConfig
          );

        expect(result.canProceed).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should return canProceed false when config is invalid', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: false,
          errors: ['Config error'],
          warnings: [],
        });

        const result =
          NgRxSelectorPatternsValidation.validateAnalysisPrerequisites(
            '/test/project',
            mockConfig
          );

        expect(result.canProceed).toBe(false);
        expect(result.issues).toContain('Config error');
      });

      it('should include warnings in issues', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: ['Warning message'],
        });

        const result =
          NgRxSelectorPatternsValidation.validateAnalysisPrerequisites(
            '/test/project',
            mockConfig
          );

        expect(result.issues).toContain('Warning message');
      });

      it('should combine errors and warnings in issues', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: false,
          errors: ['Error 1'],
          warnings: ['Warning 1'],
        });

        const result =
          NgRxSelectorPatternsValidation.validateAnalysisPrerequisites(
            '/test/project',
            mockConfig
          );

        expect(result.issues).toContain('Error 1');
        expect(result.issues).toContain('Warning 1');
      });
    });
  });
});
