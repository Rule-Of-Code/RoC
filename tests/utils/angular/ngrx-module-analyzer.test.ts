/**
 * @fileoverview Tests for ngrx-module-analyzer.ts
 * @description Tests for NgRx Module Analyzer utility
 */

import { NgRxModuleAnalyzer } from '../../../src/utils/angular/ngrx-module/ngrx-module-analyzer';
import type { DependenciesState } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxModuleConfiguration } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';

describe('utils/angular/ngrx-module/ngrx-module-analyzer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxModuleAnalyzer', () => {
    describe('analyze', () => {
      const mockDependencies: DependenciesState = {
        hasStore: true,
        hasEffects: true,
        hasDevTools: true,
      };

      it('should return empty violations and suggestions when module is properly configured', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const result = NgRxModuleAnalyzer.analyze(
          '/test/project',
          mockDependencies
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(analyzeSpy).toHaveBeenCalledWith(
          '/test/project',
          mockDependencies
        );
      });

      it('should return violations when module configuration issues are detected', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: [
            'StoreModule.forRoot should be configured in app.module.ts',
            'Module missing @NgModule decorator in app.module.ts',
          ],
          suggestions: ['Add StoreModule.forRoot to imports in app.module.ts'],
        });

        const result = NgRxModuleAnalyzer.analyze(
          '/test/project',
          mockDependencies
        );

        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('StoreModule.forRoot');
        expect(result.violations[1]).toContain('@NgModule decorator');
      });

      it('should return suggestions for module improvements', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [
            'Add EffectsModule.forRoot to imports in app.module.ts',
            'StoreDevtoolsModule should be configured in app.module.ts',
          ],
        });

        const result = NgRxModuleAnalyzer.analyze(
          '/test/project',
          mockDependencies
        );

        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions[0]).toContain('EffectsModule.forRoot');
        expect(result.suggestions[1]).toContain('StoreDevtoolsModule');
      });

      it('should delegate to NgRxModuleConfiguration.analyzeModuleSetup', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: ['test violation'],
          suggestions: ['test suggestion'],
        });

        const result = NgRxModuleAnalyzer.analyze(
          '/custom/project/path',
          mockDependencies
        );

        expect(analyzeSpy).toHaveBeenCalledTimes(1);
        expect(analyzeSpy).toHaveBeenCalledWith(
          '/custom/project/path',
          mockDependencies
        );
        expect(result).toEqual({
          violations: ['test violation'],
          suggestions: ['test suggestion'],
        });
      });

      it('should handle dependencies without store', () => {
        const depsWithoutStore: DependenciesState = {
          hasStore: false,
          hasEffects: false,
          hasDevTools: false,
        };

        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxModuleAnalyzer.analyze('/test/project', depsWithoutStore);

        expect(analyzeSpy).toHaveBeenCalledWith(
          '/test/project',
          depsWithoutStore
        );
      });

      it('should handle dependencies with only store', () => {
        const depsWithStoreOnly: DependenciesState = {
          hasStore: true,
          hasEffects: false,
          hasDevTools: false,
        };

        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        NgRxModuleAnalyzer.analyze('/test/project', depsWithStoreOnly);

        expect(analyzeSpy).toHaveBeenCalledWith(
          '/test/project',
          depsWithStoreOnly
        );
      });

      it('should return both violations and suggestions together', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: ['Missing StoreModule.forRoot configuration'],
          suggestions: [
            'Add StoreModule.forRoot to imports',
            'Configure StoreDevtoolsModule for debugging',
          ],
        });

        const result = NgRxModuleAnalyzer.analyze(
          '/test/project',
          mockDependencies
        );

        expect(result.violations).toHaveLength(1);
        expect(result.suggestions).toHaveLength(2);
      });

      it('should handle empty project root', () => {
        const analyzeSpy = jest.spyOn(
          NgRxModuleConfiguration,
          'analyzeModuleSetup'
        );
        analyzeSpy.mockReturnValue({
          violations: ['app.module.ts not found in expected location'],
          suggestions: [],
        });

        const result = NgRxModuleAnalyzer.analyze('', mockDependencies);

        expect(analyzeSpy).toHaveBeenCalledWith('', mockDependencies);
        expect(result.violations).toHaveLength(1);
      });
    });
  });
});
