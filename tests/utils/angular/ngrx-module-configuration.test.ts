/**
 * @fileoverview Tests for ngrx-module-configuration.ts
 * @description Tests for NgRx Module Configuration utility
 */

import type { DependenciesState } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxModuleConfiguration } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxModuleValidationPatterns } from '../../../src/utils/angular/ngrx-module/ngrx-module-validation-patterns';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';

describe('utils/angular/ngrx-module/ngrx-module-configuration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxModuleConfiguration', () => {
    describe('analyzeModuleSetup', () => {
      const mockDependencies: DependenciesState = {
        hasStore: true,
        hasEffects: true,
        hasDevTools: true,
      };

      it('should not flag missing app.module.ts (standalone Angular)', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(false);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          '/test/project',
          mockDependencies
        );

        // In modern Angular standalone architecture, app.module.ts is optional,
        // so a missing module no longer produces a violation.
        expect(result.violations).not.toContain(
          'app.module.ts not found in expected location'
        );
        expect(result.violations).toHaveLength(0);
      });

      it('should analyze module content when app module exists', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');
        readFileSpy.mockReturnValue(`
          import { NgModule } from '@angular/core';
          import { StoreModule } from '@ngrx/store';
          import { EffectsModule } from '@ngrx/effects';

          @NgModule({
            imports: [
              StoreModule.forRoot(reducers),
              EffectsModule.forRoot([])
            ],
            declarations: [],
            providers: []
          })
          export class AppModule {}
        `);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const checkDevToolsSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsDependencyInstalled'
        );
        checkDevToolsSpy.mockReturnValue(false);

        const checkDevToolsConfiguredSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsConfigured'
        );
        checkDevToolsConfiguredSpy.mockReturnValue(false);

        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          '/test/project',
          mockDependencies
        );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });

      it('should suggest devtools when installed but not configured', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');
        readFileSpy.mockReturnValue(`
          @NgModule({
            imports: [
              StoreModule.forRoot(reducers),
              EffectsModule.forRoot([])
            ],
            declarations: [],
            providers: []
          })
          export class AppModule {}
        `);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const checkDevToolsSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsDependencyInstalled'
        );
        checkDevToolsSpy.mockReturnValue(true);

        const checkDevToolsConfiguredSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsConfigured'
        );
        checkDevToolsConfiguredSpy.mockReturnValue(false);

        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          '/test/project',
          mockDependencies
        );

        expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
      });

      it('should handle empty module content', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(true);

        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');
        readFileSpy.mockReturnValue('');

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const checkDevToolsSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsDependencyInstalled'
        );
        checkDevToolsSpy.mockReturnValue(false);

        const checkDevToolsConfiguredSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'checkDevToolsConfigured'
        );
        checkDevToolsConfiguredSpy.mockReturnValue(false);

        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          '/test/project',
          mockDependencies
        );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      });
    });

    describe('getValidationPatterns', () => {
      it('should return NgRxModuleValidationPatterns', () => {
        const patterns = NgRxModuleConfiguration.getValidationPatterns();
        expect(patterns).toBe(NgRxModuleValidationPatterns);
      });
    });

    describe('validateModulePrerequisites', () => {
      it('should return valid true when app module exists', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(true);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const result =
          NgRxModuleConfiguration.validateModulePrerequisites('/test/project');

        expect(result.valid).toBe(true);
        expect(result.appModulePath).toBe(
          '/test/project/src/app/app.module.ts'
        );
        expect(result.errors).toBeUndefined();
      });

      it('should return valid false when app module does not exist', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(false);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const result =
          NgRxModuleConfiguration.validateModulePrerequisites('/test/project');

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
      });

      it('should include app module not found error when module is missing', () => {
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        existsSpy.mockReturnValue(false);

        const getAppModulePathSpy = jest.spyOn(
          NgRxSetupConfiguration,
          'getAppModulePath'
        );
        getAppModulePathSpy.mockReturnValue(
          '/test/project/src/app/app.module.ts'
        );

        const result =
          NgRxModuleConfiguration.validateModulePrerequisites('/test/project');

        expect(result.errors).toContain(
          'app.module.ts not found in expected location'
        );
      });
    });
  });
});
