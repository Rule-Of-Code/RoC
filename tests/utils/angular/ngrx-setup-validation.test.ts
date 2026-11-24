/**
 * @fileoverview Tests for ngrx-setup-validation.ts
 * @description Tests for NgRx Setup Validation utility, on real project
 * fixtures. The orchestrator collects what the dependency, module and
 * feature-store analyzers report for a project; each test writes a project
 * that makes those analyzers report something, and checks that the
 * orchestrator collects exactly that.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { NgRxFeatureStoreStructureAnalyzer } from '../../../src/utils/angular/ngrx-feature-store';
import { NgRxModuleAnalyzer } from '../../../src/utils/angular/ngrx-module';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-configuration';
import { NgRxSetupValidation } from '../../../src/utils/angular/ngrx-setup/ngrx-setup-validation';
import { NgRxAnalysisUtilities } from '../../../src/utils/angular/shared-ngrx-utilities';
import { FileUtils } from '../../../src/utils/file-utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-setup-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const STORE_ONLY = { name: 'app', dependencies: { '@ngrx/store': '18.0.0' } };

/**
 * A project with @ngrx/store only, an app module that does not configure the
 * store, and a feature with a reducer but no +state directory: each analyzer
 * has something to report.
 */
function ngrxProject(): string {
  return project({
    'package.json': JSON.stringify(STORE_ONLY),
    'src/app/app.module.ts':
      "import { NgModule } from '@angular/core';\n@NgModule({ imports: [] })\nexport class AppModule {}\n",
    'src/app/orders/orders.reducer.ts':
      'export const reducer = (state = {}) => state;\n',
  });
}

describe('utils/angular/ngrx-setup/ngrx-setup-validation', () => {
  describe('NgRxSetupValidation', () => {
    describe('executeAnalysisWorkflow', () => {
      it('should return violations when project root is empty', () => {
        const result = NgRxSetupValidation.executeAnalysisWorkflow('', config);

        expect(result.violations).toContain('Project root path is required');
      });

      it('should return violations when package.json not found', () => {
        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          project({ 'README.md': '# app\n' }),
          config
        );

        expect(result.violations).toEqual([
          NgRxSetupConfiguration.VALIDATION_MESSAGES.PACKAGE_JSON_NOT_FOUND,
        ]);
      });

      it('should collect the dependency suggestions when prerequisites pass', () => {
        const root = ngrxProject();
        const dependencySuggestions =
          NgRxSetupConfiguration.analyzeDependencies(STORE_ONLY).suggestions;

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          root,
          config
        );

        expect(dependencySuggestions.length).toBeGreaterThan(0);
        expect(result.suggestions).toEqual(
          expect.arrayContaining(dependencySuggestions)
        );
      });

      it('should collect violations from module analyzer', () => {
        const root = ngrxProject();
        const { dependencies } =
          NgRxSetupConfiguration.analyzeDependencies(STORE_ONLY);
        const moduleResults = NgRxModuleAnalyzer.analyze(root, dependencies);

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          root,
          config
        );

        expect(moduleResults.violations.length).toBeGreaterThan(0);
        expect(result.violations).toEqual(
          expect.arrayContaining(moduleResults.violations)
        );
        expect(result.suggestions).toEqual(
          expect.arrayContaining(moduleResults.suggestions)
        );
      });

      it('should collect suggestions from feature store analyzer', () => {
        const root = ngrxProject();
        const featureResults =
          NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
            root,
            config
          );

        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          root,
          config
        );

        expect(featureResults.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions).toEqual(
          expect.arrayContaining(featureResults.suggestions)
        );
      });

      it('should deduplicate results', () => {
        const result = NgRxSetupValidation.executeAnalysisWorkflow(
          ngrxProject(),
          config
        );

        expect(new Set(result.violations).size).toBe(result.violations.length);
        expect(new Set(result.suggestions).size).toBe(
          result.suggestions.length
        );
        expect(result).toEqual(
          NgRxAnalysisUtilities.deduplicateResults(result)
        );
      });
    });

    describe('getSetupAnalysisSummary', () => {
      // Same summary as the owner, called on the owner (#511).
      it('should delegate to NgRxAnalysisUtilities.getSetupAnalysisSummary', () => {
        const results = { violations: ['v'], suggestions: ['s'] };
        expect(NgRxSetupValidation.getSetupAnalysisSummary(results)).toEqual(
          NgRxAnalysisUtilities.getSetupAnalysisSummary(results)
        );
      });
    });

    describe('validateAnalysisPrerequisites', () => {
      it('should return canProceed false when project root is empty', () => {
        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          '',
          config
        );

        expect(result.canProceed).toBe(false);
        expect(result.issues).toContain('Project root path is required');
      });

      it('should return canProceed false when package.json not found', () => {
        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          project({ 'README.md': '# app\n' }),
          config
        );

        expect(result.canProceed).toBe(false);
        expect(result.issues).toContain(
          NgRxSetupConfiguration.VALIDATION_MESSAGES.PACKAGE_JSON_NOT_FOUND
        );
      });

      it('should return canProceed true when prerequisites pass', () => {
        const result = NgRxSetupValidation.validateAnalysisPrerequisites(
          project({ 'package.json': JSON.stringify(STORE_ONLY) }),
          config
        );

        expect(result.canProceed).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
    });

    describe('legacy API', () => {
      describe('analyzeDependencies', () => {
        it('should answer as NgRxSetupConfiguration.analyzeDependencies', () => {
          const result = NgRxSetupValidation.analyzeDependencies(STORE_ONLY);

          expect(result).toEqual(
            NgRxSetupConfiguration.analyzeDependencies(STORE_ONLY)
          );
          expect(result.dependencies.hasStore).toBe(true);
        });
      });

      describe('analyzeAppModuleConfiguration', () => {
        it('should push what NgRxModuleAnalyzer.analyze reports', () => {
          const root = ngrxProject();
          const dependencies = {
            hasStore: true,
            hasEffects: true,
            hasDevTools: true,
          };
          const expected = NgRxModuleAnalyzer.analyze(root, dependencies);
          const violations: string[] = [];
          const suggestions: string[] = [];

          NgRxSetupValidation.analyzeAppModuleConfiguration(
            root,
            dependencies,
            violations,
            suggestions
          );

          expect(expected.violations.length).toBeGreaterThan(0);
          expect(violations).toEqual(expected.violations);
          expect(suggestions).toEqual(expected.suggestions);
        });
      });
    });
  });
});
