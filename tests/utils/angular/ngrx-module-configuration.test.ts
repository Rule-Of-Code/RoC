/**
 * @fileoverview Tests for ngrx-module-configuration.ts
 * @description Tests for NgRx Module Configuration utility, on real project
 * fixtures: the module, package.json and the devtools wiring are files the
 * utility reads, so the tests write them instead of mocking the readers.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { DependenciesState } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxModuleConfiguration } from '../../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxModuleValidationPatterns } from '../../../src/utils/angular/ngrx-module/ngrx-module-validation-patterns';
import { NgRxSetupConfiguration } from '../../../src/utils/angular/ngrx-setup';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

/** A project with these files; `package.json` defaults to an empty manifest. */
function project(files: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-module-'));
  roots.push(root);
  const all = { 'package.json': JSON.stringify({ name: 'app' }), ...files };
  for (const [rel, content] of Object.entries(all)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const APP_MODULE = 'src/app/app.module.ts';
const NGRX_MODULE = `
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
`;
const withDevtoolsDependency = JSON.stringify({
  name: 'app',
  dependencies: { '@ngrx/store-devtools': '18.0.0' },
});

const dependencies: DependenciesState = {
  hasStore: true,
  hasEffects: true,
  hasDevTools: true,
};

/** The suggestion the utility gives for devtools installed but not wired. */
const missingDevtoolsSuggestion = (): string =>
  NgRxSetupConfiguration.buildMessage(
    'MISSING_DEVTOOLS_CONFIG',
    NgRxSetupConfiguration.APP_MODULE_PATTERNS.storeDevtoolsModule,
    NgRxSetupConfiguration.APP_MODULE_PATTERNS.appModuleFile
  );

describe('utils/angular/ngrx-module/ngrx-module-configuration', () => {
  describe('NgRxModuleConfiguration', () => {
    describe('analyzeModuleSetup', () => {
      it('should not flag missing app.module.ts (standalone Angular)', () => {
        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          project(),
          dependencies
        );

        // In modern Angular standalone architecture, app.module.ts is optional,
        // so a missing module produces no violation and no suggestion.
        expect(result.violations).not.toContain(
          'app.module.ts not found in expected location'
        );
        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should analyze module content when app module exists', () => {
        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          project({ [APP_MODULE]: NGRX_MODULE }),
          dependencies
        );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
        // Store and effects are wired in the module: nothing to ask for them.
        expect(result.violations).toHaveLength(0);
      });

      it('should suggest devtools when installed but not configured', () => {
        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          project({
            'package.json': withDevtoolsDependency,
            [APP_MODULE]: NGRX_MODULE,
          }),
          dependencies
        );

        expect(result.suggestions).toContain(missingDevtoolsSuggestion());
      });

      it('should not suggest devtools when they are not installed', () => {
        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          project({ [APP_MODULE]: NGRX_MODULE }),
          dependencies
        );

        expect(result.suggestions).not.toContain(missingDevtoolsSuggestion());
      });

      it('should handle empty module content', () => {
        const result = NgRxModuleConfiguration.analyzeModuleSetup(
          project({ [APP_MODULE]: '' }),
          dependencies
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
        const root = project({ [APP_MODULE]: NGRX_MODULE });

        const result =
          NgRxModuleConfiguration.validateModulePrerequisites(root);

        expect(result.valid).toBe(true);
        expect(result.appModulePath).toBe(
          NgRxSetupConfiguration.getAppModulePath(root)
        );
        expect(result.errors).toBeUndefined();
      });

      it('should return valid false when app module does not exist', () => {
        const result =
          NgRxModuleConfiguration.validateModulePrerequisites(project());

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.length).toBeGreaterThan(0);
      });

      it('should include app module not found error when module is missing', () => {
        const result =
          NgRxModuleConfiguration.validateModulePrerequisites(project());

        expect(result.errors).toContain(
          'app.module.ts not found in expected location'
        );
      });
    });
  });
});
