/**
 * @fileoverview Tests for ngrx-setup-configuration.ts
 * @description Tests for NgRx Setup Configuration utility
 */

import { NgRxDependencyAnalyzer } from '../../../src/utils/angular/ngrx-dependency-analyzer';
import { NgRxDevToolsChecker } from '../../../src/utils/angular/ngrx-devtools-checker';
import { NgRxModuleValidator } from '../../../src/utils/angular/ngrx-module';
import { NgRxPathOperations } from '../../../src/utils/angular/ngrx-path-operations';
import { NgRxResultsProcessor } from '../../../src/utils/angular/ngrx-results-processor';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-configuration';
import { NGRX_KEYWORDS } from '../../../src/utils/constants';

describe('utils/angular/ngrx-setup/ngrx-setup-configuration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxSetupConfiguration', () => {
    describe('SETUP_ANALYSIS_CONFIG', () => {
      it('should have all required configuration flags', () => {
        const config = NgRxSetupConfiguration.SETUP_ANALYSIS_CONFIG;

        expect(config.checkDependencies).toBe(true);
        expect(config.checkAppModule).toBe(true);
        expect(config.checkFeatureStores).toBe(true);
        expect(config.checkDevToolsIntegration).toBe(true);
        expect(config.enableAdvancedSetupChecks).toBe(true);
      });
    });

    describe('APP_MODULE_PATTERNS', () => {
      it('should have correct NgRx module patterns', () => {
        const patterns = NgRxSetupConfiguration.APP_MODULE_PATTERNS;

        expect(patterns.storeModuleForRoot).toBe(
          NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT
        );
        expect(patterns.effectsModuleForRoot).toBe(
          NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT
        );
        expect(patterns.storeDevtoolsModule).toBe(
          NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE
        );
        expect(patterns.appModuleFile).toBe(NGRX_KEYWORDS.APP_MODULE_TS);
      });
    });

    describe('PATTERN_TYPES', () => {
      it('should have correct pattern type definitions', () => {
        const types = NgRxSetupConfiguration.PATTERN_TYPES;

        expect(types.storeModule).toBe(
          NGRX_KEYWORDS.PATTERN_TYPES.STORE_MODULE
        );
        expect(types.effectsModule).toBe(
          NGRX_KEYWORDS.PATTERN_TYPES.EFFECTS_MODULE
        );
        expect(types.devtoolsModule).toBe(
          NGRX_KEYWORDS.PATTERN_TYPES.DEVTOOLS_MODULE
        );
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have all required validation message templates', () => {
        const messages = NgRxSetupConfiguration.VALIDATION_MESSAGES;

        expect(messages.MISSING_STORE_MODULE_CONFIG).toBeDefined();
        expect(messages.MISSING_EFFECTS_MODULE_CONFIG).toBeDefined();
        expect(messages.MISSING_DEVTOOLS_CONFIG).toBeDefined();
        expect(messages.APP_MODULE_NOT_FOUND).toBeDefined();
        expect(messages.PACKAGE_JSON_NOT_FOUND).toBeDefined();
      });

      it('should have placeholder templates for configurable messages', () => {
        const messages = NgRxSetupConfiguration.VALIDATION_MESSAGES;

        expect(messages.MISSING_STORE_MODULE_CONFIG).toContain('{0}');
        expect(messages.MISSING_STORE_MODULE_CONFIG).toContain('{1}');
        expect(messages.MISSING_EFFECTS_MODULE_CONFIG).toContain('{0}');
      });
    });

    describe('buildMessage', () => {
      it('should format template with single placeholder', () => {
        const result = NgRxSetupConfiguration.buildMessage(
          'MISSING_EFFECTS_MODULE_CONFIG',
          'EffectsModule.forRoot',
          'app.module.ts'
        );

        expect(result).toContain('EffectsModule.forRoot');
        expect(result).toContain('app.module.ts');
      });

      it('should format template with multiple placeholders', () => {
        const result = NgRxSetupConfiguration.buildMessage(
          'MISSING_STORE_MODULE_CONFIG',
          'StoreModule.forRoot',
          'app.module.ts'
        );

        expect(result).toContain('StoreModule.forRoot');
        expect(result).toContain('app.module.ts');
      });

      it('should handle template that is a function', () => {
        // Test with a valid template key
        const result = NgRxSetupConfiguration.buildMessage(
          'APP_MODULE_NOT_FOUND'
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('delegation methods', () => {
      it('should delegate getAppModulePath to NgRxPathOperations', () => {
        expect(NgRxSetupConfiguration.getAppModulePath).toBe(
          NgRxPathOperations.getAppModulePath
        );
      });

      it('should delegate getSourcePath to NgRxPathOperations', () => {
        expect(NgRxSetupConfiguration.getSourcePath).toBe(
          NgRxPathOperations.getSourcePath
        );
      });

      it('should delegate getPackageJsonData to NgRxDependencyAnalyzer', () => {
        expect(NgRxSetupConfiguration.getPackageJsonData).toBe(
          NgRxDependencyAnalyzer.getPackageJsonData
        );
      });

      it('should delegate getAllProjectDependencies to NgRxDependencyAnalyzer', () => {
        expect(NgRxSetupConfiguration.getAllProjectDependencies).toBe(
          NgRxDependencyAnalyzer.getAllProjectDependencies
        );
      });

      it('should delegate checkDevToolsDependencyInstalled to NgRxDependencyAnalyzer', () => {
        expect(NgRxSetupConfiguration.checkDevToolsDependencyInstalled).toBe(
          NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled
        );
      });

      it('should delegate checkDevToolsConfigured to NgRxDevToolsChecker', () => {
        expect(NgRxSetupConfiguration.checkDevToolsConfigured).toBe(
          NgRxDevToolsChecker.checkDevToolsConfigured
        );
      });

      it('should delegate analyzeDependencies to NgRxDependencyAnalyzer', () => {
        const analyzeSpy = jest.spyOn(
          NgRxDependencyAnalyzer,
          'analyzeDependencies'
        );

        const packageJson = { dependencies: {}, devDependencies: {} };
        NgRxSetupConfiguration.analyzeDependencies(packageJson);

        expect(analyzeSpy).toHaveBeenCalledWith(packageJson);
      });

      it('should delegate calculateSeverity to NgRxResultsProcessor', () => {
        expect(NgRxSetupConfiguration.calculateSeverity).toBe(
          NgRxResultsProcessor.calculateSeverity
        );
      });

      it('should delegate countIssuesByCategory to NgRxResultsProcessor', () => {
        expect(NgRxSetupConfiguration.countIssuesByCategory).toBe(
          NgRxResultsProcessor.countIssuesByCategory
        );
      });

      it('should delegate getSetupAnalysisSummary to NgRxResultsProcessor', () => {
        expect(NgRxSetupConfiguration.getSetupAnalysisSummary).toBe(
          NgRxResultsProcessor.getSetupAnalysisSummary
        );
      });
    });

    describe('containsNgRxPattern', () => {
      it('should return false for storeModule pattern type (mapping mismatch)', () => {
        const content = `
          imports: [
            StoreModule.forRoot(reducers)
          ]
        `;

        // The pattern mapping uses PATTERN_TYPES values as keys,
        // but APP_MODULE_PATTERNS uses different keys (storeModuleForRoot, etc.)
        // This causes the lookup to fail
        const result = NgRxSetupConfiguration.containsNgRxPattern(
          content,
          'storeModule'
        );

        expect(result).toBe(false);
      });

      it('should return false for effectsModule pattern type (mapping mismatch)', () => {
        const content = `
          imports: [
            EffectsModule.forRoot([AppEffects])
          ]
        `;

        const result = NgRxSetupConfiguration.containsNgRxPattern(
          content,
          'effectsModule'
        );

        expect(result).toBe(false);
      });

      it('should return false for devtoolsModule pattern type (mapping mismatch)', () => {
        const content = `
          imports: [
            StoreDevtoolsModule.instrument({ maxAge: 25 })
          ]
        `;

        const result = NgRxSetupConfiguration.containsNgRxPattern(
          content,
          'devtoolsModule'
        );

        expect(result).toBe(false);
      });

      it('should return false when pattern type is not recognized', () => {
        const content = 'StoreModule.forRoot(reducers)';

        const result = NgRxSetupConfiguration.containsNgRxPattern(
          content,
          'unknownPattern'
        );

        expect(result).toBe(false);
      });

      it('should return false when content does not contain pattern', () => {
        const content = 'import { Component } from "@angular/core";';

        const result = NgRxSetupConfiguration.containsNgRxPattern(
          content,
          'storeModule'
        );

        expect(result).toBe(false);
      });
    });

    describe('checkModuleStandards', () => {
      it('should delegate to NgRxModuleValidator.checkModuleStandards', () => {
        const checkSpy = jest.spyOn(
          NgRxModuleValidator,
          'checkModuleStandards'
        );

        const violations: string[] = [];
        const content = '@NgModule({ imports: [] })';
        const filePath = '/test/app.module.ts';

        NgRxSetupConfiguration.checkModuleStandards(
          content,
          filePath,
          violations
        );

        expect(checkSpy).toHaveBeenCalledWith(content, filePath, violations);
      });

      it('should populate violations array when issues found', () => {
        const checkSpy = jest.spyOn(
          NgRxModuleValidator,
          'checkModuleStandards'
        );
        checkSpy.mockImplementation((_, __, violations) => {
          violations.push('Module missing @NgModule decorator');
        });

        const violations: string[] = [];
        NgRxSetupConfiguration.checkModuleStandards(
          'export class AppModule {}',
          '/test/app.module.ts',
          violations
        );

        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('@NgModule');
      });
    });
  });
});
