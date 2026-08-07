/**
 * @fileoverview Tests for ngrx-reducer-patterns-validation.ts
 * @description Tests for NgRx Reducer Patterns Validation utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxActionHandlingAnalyzer } from '../../../src/utils/angular/ngrx-action-handling';
import { NgRxImmutabilityComplianceAnalyzer } from '../../../src/utils/angular/ngrx-immutability';
import { NgRxReducerPatternsConfiguration } from '../../../src/utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-configuration';
import { NgRxReducerPatternsValidation } from '../../../src/utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-validation';

describe('utils/angular/ngrx-reducer-patterns/ngrx-reducer-patterns-validation', () => {
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

  describe('NgRxReducerPatternsValidation', () => {
    describe('executeAnalysisWorkflow', () => {
      let validateProjectConfigSpy: jest.SpyInstance;
      let getSourcePathSpy: jest.SpyInstance;
      let actionHandlingAnalyzerSpy: jest.SpyInstance;
      let immutabilityAnalyzerSpy: jest.SpyInstance;
      let getOrchestratorSpy: jest.SpyInstance;
      let getAggregationConfigSpy: jest.SpyInstance;

      beforeEach(() => {
        validateProjectConfigSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
          'validateProjectConfig'
        );
        getSourcePathSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
          'getSourcePath'
        );
        actionHandlingAnalyzerSpy = jest.spyOn(
          NgRxActionHandlingAnalyzer,
          'checkActionHandling'
        );
        immutabilityAnalyzerSpy = jest.spyOn(
          NgRxImmutabilityComplianceAnalyzer,
          'checkImmutabilityCompliance'
        );
        getOrchestratorSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
          'getAnalyzerOrchestration'
        );
        getAggregationConfigSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
          'getResultAggregationConfig'
        );
      });

      afterEach(() => {
        validateProjectConfigSpy.mockRestore();
        getSourcePathSpy.mockRestore();
        actionHandlingAnalyzerSpy.mockRestore();
        immutabilityAnalyzerSpy.mockRestore();
        getOrchestratorSpy.mockRestore();
        getAggregationConfigSpy.mockRestore();
      });

      it('should return early with errors when config validation fails', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: false,
          errors: ['Invalid project configuration'],
          warnings: [],
        });

        const result = NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toContain('Invalid project configuration');
        expect(actionHandlingAnalyzerSpy).not.toHaveBeenCalled();
      });

      it('should return empty results when source path does not exist', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        getSourcePathSpy.mockReturnValue(null);

        const result = NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should call action handling analyzer when enabled', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        getSourcePathSpy.mockReturnValue('/test/project/src');
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: true, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: false,
            priority: 2,
            description: '',
          },
        });
        getAggregationConfigSpy.mockReturnValue({
          mergeViolations: true,
          mergeSuggestions: true,
          deduplicateResults: true,
          prioritizeViolations: true,
        });
        actionHandlingAnalyzerSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(actionHandlingAnalyzerSpy).toHaveBeenCalledWith(
          '/test/project',
          mockConfig
        );
      });

      it('should call immutability analyzer when enabled', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        getSourcePathSpy.mockReturnValue('/test/project/src');
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: false, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: true,
            priority: 2,
            description: '',
          },
        });
        getAggregationConfigSpy.mockReturnValue({
          mergeViolations: true,
          mergeSuggestions: true,
          deduplicateResults: true,
          prioritizeViolations: true,
        });
        immutabilityAnalyzerSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(immutabilityAnalyzerSpy).toHaveBeenCalledWith(
          '/test/project',
          mockConfig
        );
      });

      it('should aggregate violations from both analyzers', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        getSourcePathSpy.mockReturnValue('/test/project/src');
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: true, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: true,
            priority: 2,
            description: '',
          },
        });
        getAggregationConfigSpy.mockReturnValue({
          mergeViolations: true,
          mergeSuggestions: true,
          deduplicateResults: true,
          prioritizeViolations: true,
        });
        actionHandlingAnalyzerSpy.mockReturnValue({
          violations: ['action violation'],
          suggestions: [],
        });
        immutabilityAnalyzerSpy.mockReturnValue({
          violations: ['immutability violation'],
          suggestions: [],
        });

        const result = NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toContain('action violation');
        expect(result.violations).toContain('immutability violation');
      });

      it('should deduplicate results when configured', () => {
        validateProjectConfigSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });
        getSourcePathSpy.mockReturnValue('/test/project/src');
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: true, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: true,
            priority: 2,
            description: '',
          },
        });
        getAggregationConfigSpy.mockReturnValue({
          mergeViolations: true,
          mergeSuggestions: true,
          deduplicateResults: true,
          prioritizeViolations: true,
        });
        actionHandlingAnalyzerSpy.mockReturnValue({
          violations: ['duplicate violation'],
          suggestions: [],
        });
        immutabilityAnalyzerSpy.mockReturnValue({
          violations: ['duplicate violation'],
          suggestions: [],
        });

        const result = NgRxReducerPatternsValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        const duplicateCount = result.violations.filter(
          (v: string) => v === 'duplicate violation'
        ).length;
        expect(duplicateCount).toBe(1);
      });
    });

    describe('getAnalysisSummary', () => {
      it('should calculate total issues correctly', () => {
        const results = {
          violations: ['v1', 'v2'],
          suggestions: ['s1', 's2', 's3'],
        };

        const summary =
          NgRxReducerPatternsValidation.getAnalysisSummary(results);

        expect(summary.totalIssues).toBe(5);
        expect(summary.violationsCount).toBe(2);
        expect(summary.suggestionsCount).toBe(3);
      });

      it('should return high severity when violations exceed threshold', () => {
        const results = {
          violations: Array(11).fill('violation'),
          suggestions: [],
        };

        const summary =
          NgRxReducerPatternsValidation.getAnalysisSummary(results);

        expect(summary.severity).toBe('high');
      });

      it('should return medium severity for moderate violations', () => {
        const results = {
          violations: ['v1', 'v2', 'v3', 'v4'],
          suggestions: [],
        };

        const summary =
          NgRxReducerPatternsValidation.getAnalysisSummary(results);

        expect(summary.severity).toBe('medium');
      });

      it('should return low severity for few violations', () => {
        const results = {
          violations: ['v1', 'v2'],
          suggestions: [],
        };

        const summary =
          NgRxReducerPatternsValidation.getAnalysisSummary(results);

        expect(summary.severity).toBe('low');
      });

      it('should mark analysis as complete', () => {
        const results = { violations: [], suggestions: [] };

        const summary =
          NgRxReducerPatternsValidation.getAnalysisSummary(results);

        expect(summary.analysisComplete).toBe(true);
      });
    });

    describe('validateAnalysisPrerequisites', () => {
      let validateProjectConfigSpy: jest.SpyInstance;

      beforeEach(() => {
        validateProjectConfigSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
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
          NgRxReducerPatternsValidation.validateAnalysisPrerequisites(
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
          NgRxReducerPatternsValidation.validateAnalysisPrerequisites(
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
          NgRxReducerPatternsValidation.validateAnalysisPrerequisites(
            '/test/project',
            mockConfig
          );

        expect(result.issues).toContain('Warning message');
      });
    });

    describe('getOrchestratorStatus', () => {
      let getOrchestratorSpy: jest.SpyInstance;

      beforeEach(() => {
        getOrchestratorSpy = jest.spyOn(
          NgRxReducerPatternsConfiguration,
          'getAnalyzerOrchestration'
        );
      });

      afterEach(() => {
        getOrchestratorSpy.mockRestore();
      });

      it('should return correct analyzer status', () => {
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: true, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: true,
            priority: 2,
            description: '',
          },
        });

        const status = NgRxReducerPatternsValidation.getOrchestratorStatus();

        expect(status.actionHandlingAnalyzer).toBe(true);
        expect(status.immutabilityComplianceAnalyzer).toBe(true);
        expect(status.totalEnabledAnalyzers).toBe(2);
      });

      it('should count disabled analyzers correctly', () => {
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: false, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: true,
            priority: 2,
            description: '',
          },
        });

        const status = NgRxReducerPatternsValidation.getOrchestratorStatus();

        expect(status.actionHandlingAnalyzer).toBe(false);
        expect(status.immutabilityComplianceAnalyzer).toBe(true);
        expect(status.totalEnabledAnalyzers).toBe(1);
      });

      it('should return zero when all analyzers disabled', () => {
        getOrchestratorSpy.mockReturnValue({
          actionHandling: { enabled: false, priority: 1, description: '' },
          immutabilityCompliance: {
            enabled: false,
            priority: 2,
            description: '',
          },
        });

        const status = NgRxReducerPatternsValidation.getOrchestratorStatus();

        expect(status.totalEnabledAnalyzers).toBe(0);
      });
    });
  });
});
