/**
 * @fileoverview Tests for ngrx-setup-validation.ts
 * @description Tests for NgRx Setup Validation utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreStructureAnalyzer } from '../../../src/utils/angular/ngrx-feature-store';
import { NgRxModuleAnalyzer } from '../../../src/utils/angular/ngrx-module';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-configuration';
import { NgRxSetupValidation } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-validation';
import { NgRxAnalysisUtilities } from '../../../src/utils/angular/shared-ngrx-utilities';

describe('utils/angular/ngrx-setup/ngrx-setup-validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxSetupValidation', () => {
    const mockConfig = {
      projectRoot: '/test/project',
      laws: {},
    } as unknown as RuleOfCodeConfig;

    describe('executeAnalysisWorkflow', () => {
      it('should return violations when project root is empty', () => {
        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '',
          mockConfig
        );

        expect(result.violations).toContain('Project root path is required');
      });

      it('should return violations when package.json not found', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue(null);

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should execute complete analysis when prerequisites pass', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });

        const analyzeDependenciesSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'analyzeDependencies'
        );
        analyzeDependenciesSpy.mockReturnValue({
          dependencies: {
            hasStore: true,
            hasEffects: false,
            hasDevTools: false,
          },
          suggestions: ['Consider adding @ngrx/effects'],
        });

        const moduleAnalyzeSpy = jest.spyOn(NgRxModuleAnalyzer, 'analyze');
        moduleAnalyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const featureStoreSpy = jest.spyOn(
          NgRxFeatureStoreStructureAnalyzer,
          'checkFeatureStoreStructure'
        );
        featureStoreSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const deduplicateSpy = jest.spyOn(
          NgRxAnalysisUtilities,
          'deduplicateResults'
        );
        deduplicateSpy.mockImplementation(results => results);

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(analyzeDependenciesSpy).toHaveBeenCalled();
        expect(moduleAnalyzeSpy).toHaveBeenCalled();
        expect(featureStoreSpy).toHaveBeenCalled();
        expect(deduplicateSpy).toHaveBeenCalled();
        expect(result.suggestions).toContain('Consider adding @ngrx/effects');
      });

      it('should collect violations from module analyzer', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });

        const analyzeDependenciesSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'analyzeDependencies'
        );
        analyzeDependenciesSpy.mockReturnValue({
          dependencies: { hasStore: true, hasEffects: true, hasDevTools: true },
          suggestions: [],
        });

        const moduleAnalyzeSpy = jest.spyOn(NgRxModuleAnalyzer, 'analyze');
        moduleAnalyzeSpy.mockReturnValue({
          violations: ['StoreModule.forRoot not configured'],
          suggestions: ['Add StoreModule.forRoot to app.module.ts'],
        });

        const featureStoreSpy = jest.spyOn(
          NgRxFeatureStoreStructureAnalyzer,
          'checkFeatureStoreStructure'
        );
        featureStoreSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        jest
          .spyOn(NgRxAnalysisUtilities, 'deduplicateResults')
          .mockImplementation(results => results);

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toContain(
          'StoreModule.forRoot not configured'
        );
      });

      it('should collect suggestions from feature store analyzer', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });

        const analyzeDependenciesSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'analyzeDependencies'
        );
        analyzeDependenciesSpy.mockReturnValue({
          dependencies: { hasStore: true, hasEffects: true, hasDevTools: true },
          suggestions: [],
        });

        const moduleAnalyzeSpy = jest.spyOn(NgRxModuleAnalyzer, 'analyze');
        moduleAnalyzeSpy.mockReturnValue({
          violations: [],
          suggestions: [],
        });

        const featureStoreSpy = jest.spyOn(
          NgRxFeatureStoreStructureAnalyzer,
          'checkFeatureStoreStructure'
        );
        featureStoreSpy.mockReturnValue({
          violations: [],
          suggestions: ['Consider organizing feature stores in modules'],
        });

        jest
          .spyOn(NgRxAnalysisUtilities, 'deduplicateResults')
          .mockImplementation(results => results);

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions).toContain(
          'Consider organizing feature stores in modules'
        );
      });

      it('should deduplicate results', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });

        jest
          .spyOn(NgRxSetupConfiguration, 'analyzeDependencies')
          .mockReturnValue({
            dependencies: {
              hasStore: true,
              hasEffects: true,
              hasDevTools: true,
            },
            suggestions: ['Duplicate suggestion', 'Duplicate suggestion'],
          });

        jest.spyOn(NgRxModuleAnalyzer, 'analyze').mockReturnValue({
          violations: [],
          suggestions: [],
        });

        jest
          .spyOn(
            NgRxFeatureStoreStructureAnalyzer,
            'checkFeatureStoreStructure'
          )
          .mockReturnValue({
            violations: [],
            suggestions: [],
          });

        const deduplicateSpy = jest.spyOn(
          NgRxAnalysisUtilities,
          'deduplicateResults'
        );
        deduplicateSpy.mockReturnValue({
          violations: [],
          suggestions: ['Duplicate suggestion'],
        });

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          '/test/project',
          mockConfig
        );

        expect(deduplicateSpy).toHaveBeenCalled();
        expect(result.suggestions).toHaveLength(1);
      });
    });

    describe('getSetupAnalysisSummary', () => {
      it('should delegate to NgRxAnalysisUtilities.getSetupAnalysisSummary', () => {
        expect(NgRxSetupValidation.getSetupAnalysisSummary).toBe(
          NgRxAnalysisUtilities.getSetupAnalysisSummary
        );
      });
    });

    describe('validateAnalysisPrerequisites', () => {
      it('should return canProceed false when project root is empty', () => {
        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          '',
          mockConfig
        );

        expect(result.canProceed).toBe(false);
        expect(result.issues).toContain('Project root path is required');
      });

      it('should return canProceed false when package.json not found', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue(null);

        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          '/test/project',
          mockConfig
        );

        expect(result.canProceed).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it('should return canProceed true when prerequisites pass', () => {
        const getPackageJsonSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getPackageJsonData'
        );
        getPackageJsonSpy.mockReturnValue({
          dependencies: { '@ngrx/store': '^15.0.0' },
        });

        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          '/test/project',
          mockConfig
        );

        expect(result.canProceed).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
    });

    describe('legacy API', () => {
      describe('analyzeDependencies', () => {
        it('should delegate to NgRxSetupConfiguration.analyzeDependencies', () => {
          const analyzeSpy = jest.spyOn(
            NgRxSetupConfiguration,
            'analyzeDependencies'
          );
          analyzeSpy.mockReturnValue({
            dependencies: {
              hasStore: true,
              hasEffects: false,
              hasDevTools: false,
            },
            suggestions: [],
          });

          const packageJson = { dependencies: { '@ngrx/store': '^15.0.0' } };
          const result = NgRxSetupValidation.analyzeDependencies(packageJson);

          expect(analyzeSpy).toHaveBeenCalledWith(packageJson);
          expect(result.dependencies.hasStore).toBe(true);
        });
      });

      describe('analyzeAppModuleConfiguration', () => {
        it('should delegate to NgRxModuleAnalyzer.analyze', () => {
          const analyzeSpy = jest.spyOn(NgRxModuleAnalyzer, 'analyze');
          analyzeSpy.mockReturnValue({
            violations: ['Test violation'],
            suggestions: ['Test suggestion'],
          });

          const violations: string[] = [];
          const suggestions: string[] = [];
          const dependencies = {
            hasStore: true,
            hasEffects: true,
            hasDevTools: true,
          };

          NgRxSetupValidation.analyzeAppModuleConfiguration(
            '/test/project',
            dependencies,
            violations,
            suggestions
          );

          expect(analyzeSpy).toHaveBeenCalledWith(
            '/test/project',
            dependencies
          );
          expect(violations).toContain('Test violation');
          expect(suggestions).toContain('Test suggestion');
        });
      });
    });
  });
});
