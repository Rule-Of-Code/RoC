/**
 * @fileoverview Tests for rxjs-operator-usage-analyzer.ts
 * @description Tests for RxJS Operator Usage Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { RxJSOperatorUsageAnalyzer } from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-usage-analyzer';
import { RxJSOperatorUsageValidation } from '../../../src/utils/angular/rxjs-operator-usage/rxjs-operator-usage-validation';

describe('utils/angular/rxjs-operator-usage/rxjs-operator-usage-analyzer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RxJSOperatorUsageAnalyzer', () => {
    describe('checkOperatorUsage', () => {
      const mockConfig = {
        projectRoot: '/test/project',
        laws: {},
      } as unknown as RuleOfCodeConfig;

      it('should delegate to RxJSOperatorUsageValidation.executeAnalysisWorkflow', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(executeSpy).toHaveBeenCalledWith('/test/project', mockConfig);
        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return violations when operator issues are detected', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [
            'switchMap without error handling in user.effects.ts',
            'Deprecated operator "do" found in auth.effects.ts',
          ],
          suggestions: [
            'Add catchError operator after switchMap',
            'Replace "do" with "tap"',
          ],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('switchMap');
        expect(result.violations[1]).toContain('Deprecated');
        expect(result.suggestions).toHaveLength(2);
      });

      it('should return suggestions for operator improvements', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Consider exhaustMap instead of switchMap for POST operations',
            'Consider using map with property access instead of pluck',
          ],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('exhaustMap');
      });

      it('should handle empty project root', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: ['Project root path is required'],
          suggestions: [],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '',
          mockConfig
        );

        expect(executeSpy).toHaveBeenCalledWith('', mockConfig);
        expect(result.violations).toContain('Project root path is required');
      });

      it('should pass the config correctly to validation', () => {
        const customConfig = {
          projectRoot: '/custom/project',
          laws: {
            enabled: { 'rxjs-operators': true },
          },
        } as unknown as RuleOfCodeConfig;

        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/custom/project',
          customConfig
        );

        expect(executeSpy).toHaveBeenCalledWith(
          '/custom/project',
          customConfig
        );
      });

      it('should return both violations and suggestions together', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: ['Operator used outside pipe in component.ts'],
          suggestions: ['Use operators inside pipe() method'],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(1);
        expect(result.suggestions).toHaveLength(1);
        expect(result.violations[0]).toContain('outside pipe');
        expect(result.suggestions[0]).toContain('pipe()');
      });

      it('should handle when no NgRx files are found', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: ['No NgRx effects files found for operator analysis'],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toContain(
          'No NgRx effects files found for operator analysis'
        );
      });

      it('should handle multiple file analysis', () => {
        const executeSpy = jest.spyOn(
          RxJSOperatorUsageValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [
            'switchMap without error handling in user.effects.ts',
            'switchMap without error handling in auth.effects.ts',
            'Deprecated operator "do" found in app.effects.ts',
          ],
          suggestions: [
            'Add catchError operator after switchMap',
            'Replace "do" with "tap"',
          ],
        });

        const result = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(3);
        expect(result.suggestions).toHaveLength(2);
      });
    });
  });
});
