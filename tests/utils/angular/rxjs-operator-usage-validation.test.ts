/**
 * @fileoverview Tests for rxjs-operator-usage-validation.ts
 * @description Tests for RxJS Operator Usage Validation utilities
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { RxJSFileDiscovery } from '../../../src/utils/angular/rxjs-file-discovery';
import {
  DeprecatedOperatorAnalyzer,
  FlatteningOperatorAnalyzer,
  TransformationOperatorAnalyzer,
} from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-analyzers';
import { RxJSOperatorUsageConfiguration } from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-usage-configuration';
import { RxJSOperatorUsageValidation } from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-usage-validation';

describe('utils/angular/rxjs-operator-usage/rxjs-operator-usage-validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockConfig = (): RuleOfCodeConfig =>
    ({
      projectRoot: '/test/project',
      enabled: true,
    }) as any;

  describe('executeAnalysisWorkflow', () => {
    it('should return errors when project config validation fails', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: false,
        errors: ['Invalid project configuration'],
        warnings: [],
      });

      const result = RxJSOperatorUsageValidation.executeAnalysisWorkflow(
        '',
        createMockConfig()
      );

      expect(result.violations).toContain('Invalid project configuration');
      expect(result.suggestions).toEqual([]);
    });

    it('should return suggestion when no NgRx files found', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const findFilesSpy = jest.spyOn(RxJSFileDiscovery, 'findNgRxFiles');
      findFilesSpy.mockReturnValue([]);

      const result = RxJSOperatorUsageValidation.executeAnalysisWorkflow(
        '/test/project',
        createMockConfig()
      );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toContain(
        'No NgRx effects files found for operator analysis'
      );
    });

    it('should run analyzers and return combined results', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const findFilesSpy = jest.spyOn(RxJSFileDiscovery, 'findNgRxFiles');
      findFilesSpy.mockReturnValue(['/test/user.effects.ts']);

      const flatteningSpy = jest.spyOn(FlatteningOperatorAnalyzer, 'analyze');
      flatteningSpy.mockReturnValue({
        violations: ['switchMap violation'],
        suggestions: ['Use exhaustMap'],
      });

      const deprecatedSpy = jest.spyOn(DeprecatedOperatorAnalyzer, 'analyze');
      deprecatedSpy.mockReturnValue({
        violations: ['Deprecated operator'],
        suggestions: [],
      });

      const transformationSpy = jest.spyOn(
        TransformationOperatorAnalyzer,
        'analyze'
      );
      transformationSpy.mockReturnValue({
        violations: [],
        suggestions: ['Use map instead of pluck'],
      });

      const result = RxJSOperatorUsageValidation.executeAnalysisWorkflow(
        '/test/project',
        createMockConfig()
      );

      expect(result.violations).toContain('switchMap violation');
      expect(result.violations).toContain('Deprecated operator');
      expect(result.suggestions).toContain('Use exhaustMap');
      expect(result.suggestions).toContain('Use map instead of pluck');
    });

    it('should deduplicate violations and suggestions', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const findFilesSpy = jest.spyOn(RxJSFileDiscovery, 'findNgRxFiles');
      findFilesSpy.mockReturnValue(['/test/user.effects.ts']);

      const flatteningSpy = jest.spyOn(FlatteningOperatorAnalyzer, 'analyze');
      flatteningSpy.mockReturnValue({
        violations: ['duplicate violation'],
        suggestions: ['duplicate suggestion'],
      });

      const deprecatedSpy = jest.spyOn(DeprecatedOperatorAnalyzer, 'analyze');
      deprecatedSpy.mockReturnValue({
        violations: ['duplicate violation'],
        suggestions: ['duplicate suggestion'],
      });

      const transformationSpy = jest.spyOn(
        TransformationOperatorAnalyzer,
        'analyze'
      );
      transformationSpy.mockReturnValue({
        violations: [],
        suggestions: [],
      });

      const result = RxJSOperatorUsageValidation.executeAnalysisWorkflow(
        '/test/project',
        createMockConfig()
      );

      expect(result.violations.length).toBe(1);
      expect(result.suggestions.length).toBe(1);
    });

    it('should call all three analyzers', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const findFilesSpy = jest.spyOn(RxJSFileDiscovery, 'findNgRxFiles');
      findFilesSpy.mockReturnValue(['/test/user.effects.ts']);

      const flatteningSpy = jest.spyOn(FlatteningOperatorAnalyzer, 'analyze');
      flatteningSpy.mockReturnValue({ violations: [], suggestions: [] });

      const deprecatedSpy = jest.spyOn(DeprecatedOperatorAnalyzer, 'analyze');
      deprecatedSpy.mockReturnValue({ violations: [], suggestions: [] });

      const transformationSpy = jest.spyOn(
        TransformationOperatorAnalyzer,
        'analyze'
      );
      transformationSpy.mockReturnValue({ violations: [], suggestions: [] });

      RxJSOperatorUsageValidation.executeAnalysisWorkflow(
        '/test/project',
        createMockConfig()
      );

      expect(flatteningSpy).toHaveBeenCalledWith(['/test/user.effects.ts']);
      expect(deprecatedSpy).toHaveBeenCalledWith(['/test/user.effects.ts']);
      expect(transformationSpy).toHaveBeenCalledWith(['/test/user.effects.ts']);
    });
  });

  describe('getAnalysisSummary', () => {
    it('should return summary with zero counts for empty results', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: [],
        suggestions: [],
      });

      expect(result.totalIssues).toBe(0);
      expect(result.violationsCount).toBe(0);
      expect(result.suggestionsCount).toBe(0);
      expect(result.severity).toBe('low');
    });

    it('should return low severity for 0-3 violations', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['v1', 'v2', 'v3'],
        suggestions: [],
      });

      expect(result.severity).toBe('low');
      expect(result.violationsCount).toBe(3);
    });

    it('should return medium severity for 4-8 violations', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['v1', 'v2', 'v3', 'v4', 'v5'],
        suggestions: [],
      });

      expect(result.severity).toBe('medium');
    });

    it('should return high severity for more than 8 violations', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'],
        suggestions: [],
      });

      expect(result.severity).toBe('high');
    });

    it('should count flattening operator issues', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['flattening operator issue', 'another flattening problem'],
        suggestions: ['use flattening operator properly'],
      });

      expect(result.operatorAreas.flattening).toBe(3);
    });

    it('should count deprecated operator issues', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['deprecated operator found'],
        suggestions: ['replace deprecated operator'],
      });

      expect(result.operatorAreas.deprecated).toBe(2);
    });

    it('should count transformation operator issues', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['transformation issue'],
        suggestions: [],
      });

      expect(result.operatorAreas.transformation).toBe(1);
    });

    it('should count error handling issues', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['missing error handling'],
        suggestions: ['add error handler'],
      });

      expect(result.operatorAreas.errorHandling).toBe(2);
    });

    it('should calculate total issues correctly', () => {
      const result = RxJSOperatorUsageValidation.getAnalysisSummary({
        violations: ['v1', 'v2'],
        suggestions: ['s1', 's2', 's3'],
      });

      expect(result.totalIssues).toBe(5);
      expect(result.violationsCount).toBe(2);
      expect(result.suggestionsCount).toBe(3);
    });
  });

  describe('validatePrerequisites', () => {
    it('should return canProceed true when validation passes', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = RxJSOperatorUsageValidation.validatePrerequisites(
        '/test/project',
        createMockConfig()
      );

      expect(result.canProceed).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should return canProceed false when validation fails', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: false,
        errors: ['Missing project root'],
        warnings: [],
      });

      const result = RxJSOperatorUsageValidation.validatePrerequisites(
        '',
        createMockConfig()
      );

      expect(result.canProceed).toBe(false);
      expect(result.issues).toContain('Missing project root');
    });

    it('should include both errors and warnings in issues', () => {
      const validateSpy = jest.spyOn(
        RxJSOperatorUsageConfiguration,
        'validateProjectConfig'
      );
      validateSpy.mockReturnValue({
        isValid: false,
        errors: ['Error 1'],
        warnings: ['Warning 1'],
      });

      const result = RxJSOperatorUsageValidation.validatePrerequisites(
        '/test',
        createMockConfig()
      );

      expect(result.issues).toContain('Error 1');
      expect(result.issues).toContain('Warning 1');
    });
  });

  describe('legacy API methods (backward compatibility)', () => {
    describe('analyzeFlatteningOperators', () => {
      it('should delegate to FlatteningOperatorAnalyzer.analyze', () => {
        const analyzeSpy = jest.spyOn(FlatteningOperatorAnalyzer, 'analyze');
        analyzeSpy.mockReturnValue({
          violations: ['test violation'],
          suggestions: [],
        });

        const result = RxJSOperatorUsageValidation.analyzeFlatteningOperators([
          '/test/file.ts',
        ]);

        expect(analyzeSpy).toHaveBeenCalledWith(['/test/file.ts']);
        expect(result.violations).toContain('test violation');
      });
    });

    describe('analyzeDeprecatedOperators', () => {
      it('should delegate to DeprecatedOperatorAnalyzer.analyze', () => {
        const analyzeSpy = jest.spyOn(DeprecatedOperatorAnalyzer, 'analyze');
        analyzeSpy.mockReturnValue({
          violations: ['deprecated violation'],
          suggestions: [],
        });

        const result = RxJSOperatorUsageValidation.analyzeDeprecatedOperators([
          '/test/file.ts',
        ]);

        expect(analyzeSpy).toHaveBeenCalledWith(['/test/file.ts']);
        expect(result.violations).toContain('deprecated violation');
      });
    });

    describe('analyzeTransformationOperators', () => {
      it('should delegate to TransformationOperatorAnalyzer.analyze', () => {
        const analyzeSpy = jest.spyOn(
          TransformationOperatorAnalyzer,
          'analyze'
        );
        analyzeSpy.mockReturnValue({
          violations: ['transformation violation'],
          suggestions: [],
        });

        const result =
          RxJSOperatorUsageValidation.analyzeTransformationOperators([
            '/test/file.ts',
          ]);

        expect(analyzeSpy).toHaveBeenCalledWith(['/test/file.ts']);
        expect(result.violations).toContain('transformation violation');
      });
    });

    describe('getOperatorAnalysisSummary', () => {
      it('should return summary with analysisComplete flag', () => {
        const result = RxJSOperatorUsageValidation.getOperatorAnalysisSummary({
          violations: ['v1', 'v2'],
          suggestions: ['s1'],
        });

        expect(result.analysisComplete).toBe(true);
        expect(result.totalIssues).toBe(3);
      });

      it('should return operatorAreas with Issues suffix naming', () => {
        const result = RxJSOperatorUsageValidation.getOperatorAnalysisSummary({
          violations: ['flattening issue', 'deprecated issue'],
          suggestions: ['transformation issue', 'error issue'],
        });

        expect(result.operatorAreas).toHaveProperty('flatteningIssues');
        expect(result.operatorAreas).toHaveProperty('deprecatedIssues');
        expect(result.operatorAreas).toHaveProperty('transformationIssues');
        expect(result.operatorAreas).toHaveProperty('errorHandlingIssues');
      });

      it('should count operator area issues correctly', () => {
        const result = RxJSOperatorUsageValidation.getOperatorAnalysisSummary({
          violations: ['flattening violation'],
          suggestions: [],
        });

        expect(result.operatorAreas.flatteningIssues).toBe(1);
      });
    });

    describe('validateAnalysisPrerequisites', () => {
      it('should delegate to validatePrerequisites', () => {
        const validateSpy = jest.spyOn(
          RxJSOperatorUsageConfiguration,
          'validateProjectConfig'
        );
        validateSpy.mockReturnValue({
          isValid: true,
          errors: [],
          warnings: [],
        });

        const result =
          RxJSOperatorUsageValidation.validateAnalysisPrerequisites(
            '/test/project',
            createMockConfig()
          );

        expect(result.canProceed).toBe(true);
        expect(result.issues).toEqual([]);
      });
    });
  });
});
