/**
 * @fileoverview Tests for ngrx-setup-analyzer.ts
 * @description Tests for NgRx Setup Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxSetupAnalyzer } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-analyzer';
import { NgRxSetupValidation } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-validation';

describe('utils/angular/ngrx-setup/ngrx-setup-analyzer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxSetupAnalyzer', () => {
    describe('checkNgRxSetup', () => {
      const mockConfig = {
        projectRoot: '/test/project',
        laws: {},
      } as unknown as RuleOfCodeConfig;

      it('should delegate to NgRxSetupValidation.executeAnalysisWorkflow', () => {
        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxSetupAnalyzer.checkNgRxSetup(
          '/test/project',
          mockConfig
        );

        expect(executeSpy).toHaveBeenCalledWith('/test/project', mockConfig);
        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return violations when setup issues are detected', () => {
        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [
            'StoreModule.forRoot should be configured in app.module.ts',
            'EffectsModule.forRoot should be configured in app.module.ts',
          ],
          suggestions: ['Consider adding StoreDevtoolsModule for development'],
        });

        const result = NgRxSetupAnalyzer.checkNgRxSetup(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('StoreModule.forRoot');
        expect(result.violations[1]).toContain('EffectsModule.forRoot');
        expect(result.suggestions).toHaveLength(1);
      });

      it('should return suggestions when improvements are possible', () => {
        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Consider adding @ngrx/effects for side effect handling',
            'Consider adding @ngrx/store-devtools for debugging',
          ],
        });

        const result = NgRxSetupAnalyzer.checkNgRxSetup(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('@ngrx/effects');
      });

      it('should handle empty project root gracefully', () => {
        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: ['Project root path is required'],
          suggestions: [],
        });

        const result = NgRxSetupAnalyzer.checkNgRxSetup('', mockConfig);

        expect(executeSpy).toHaveBeenCalledWith('', mockConfig);
        expect(result.violations).toContain('Project root path is required');
      });

      it('should pass the config correctly to validation', () => {
        const customConfig = {
          projectRoot: '/custom/project',
          laws: {
            enabled: { 'test-law': true },
          },
        } as unknown as RuleOfCodeConfig;

        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxSetupAnalyzer.checkNgRxSetup('/custom/project', customConfig);

        expect(executeSpy).toHaveBeenCalledWith('/custom/project', customConfig);
      });

      it('should return both violations and suggestions together', () => {
        const executeSpy = jest.spyOn(
          NgRxSetupValidation,
          'executeAnalysisWorkflow'
        );
        executeSpy.mockReturnValue({
          violations: ['Missing @ngrx/store dependency'],
          suggestions: ['Add feature store for better organization'],
        });

        const result = NgRxSetupAnalyzer.checkNgRxSetup(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(1);
        expect(result.suggestions).toHaveLength(1);
        expect(result.violations[0]).toContain('@ngrx/store');
        expect(result.suggestions[0]).toContain('feature store');
      });
    });
  });
});
