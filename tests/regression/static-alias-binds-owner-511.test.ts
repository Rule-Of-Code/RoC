/**
 * @fileoverview #511 — a static alias of another class's method kept `this`
 * of the aliasing class. `NgRxSetupConfiguration.checkDevToolsDependencyInstalled`
 * ran `this.getDependencyKeys()` on NgRxSetupConfiguration, which has none, and
 * NgRx Selectors Memoization Mandate reported "Check failed" on any NgRx
 * project with an app.module.ts. Real temp projects, no helper replaced.
 */

import { NgRxSelectorsMemoizationMandateLaw } from '../../src/checkers/angular-laws/ngrx-selectors-memoization-mandate';
import { NgRxModuleConfiguration } from '../../src/utils/angular/ngrx-module/ngrx-module-configuration';
import { NgRxSetupConfiguration } from '../../src/utils/angular/ngrx-setup/ngrx-setup-configuration';
import { NgRxSetupValidation } from '../../src/utils/angular/ngrx-setup/ngrx-setup-validation';
import { FileUtils } from '../../src/utils/file-utils';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const APP_MODULE = [
  "import { NgModule } from '@angular/core';",
  "import { StoreModule } from '@ngrx/store';",
  "import { StoreDevtoolsModule } from '@ngrx/store-devtools';",
  '@NgModule({',
  '  imports: [StoreModule.forRoot({}), StoreDevtoolsModule.instrument()],',
  '})',
  'export class AppModule {}',
  '',
].join('\n');

const ngrxProject = (dependencies: Record<string, string>): string =>
  project({
    'package.json': manifest(dependencies),
    'src/app/app.module.ts': APP_MODULE,
  });

describe('#511 static aliases run on the class that owns the method', () => {
  it('reads the devtools dependency through NgRxSetupConfiguration', () => {
    const withDevtools = ngrxProject({
      '@ngrx/store': '^17.0.0',
      '@ngrx/store-devtools': '^17.0.0',
    });
    const without = ngrxProject({ '@ngrx/store': '^17.0.0' });

    expect(
      NgRxSetupConfiguration.checkDevToolsDependencyInstalled(withDevtools)
    ).toBe(true);
    expect(
      NgRxSetupConfiguration.checkDevToolsDependencyInstalled(without)
    ).toBe(false);
  });

  it('reads the devtools config through NgRxSetupConfiguration', () => {
    const root = ngrxProject({
      '@ngrx/store': '^17.0.0',
      '@ngrx/store-devtools': '^17.0.0',
    });

    expect(NgRxSetupConfiguration.checkDevToolsConfigured(root)).toBe(true);
  });

  it('analyzes module setup of a real app.module.ts without throwing', () => {
    const root = ngrxProject({
      '@ngrx/store': '^17.0.0',
      '@ngrx/store-devtools': '^17.0.0',
    });

    expect(() =>
      NgRxModuleConfiguration.analyzeModuleSetup(root, {
        hasStore: true,
        hasEffects: false,
        hasDevTools: true,
      })
    ).not.toThrow();
  });

  it('NgRx Selectors Memoization Mandate judges the project, no "Check failed"', () => {
    const root = ngrxProject({
      '@angular/core': '^17.0.0',
      '@ngrx/store': '^17.0.0',
      '@ngrx/store-devtools': '^17.0.0',
    });

    const result = NgRxSelectorsMemoizationMandateLaw.check(ctx(root));

    expect((result.violations ?? []).join('\n')).not.toMatch(
      /Check failed|is not a function/
    );
  });

  it('lists workspace files through FileUtils, not an empty list from a swallowed TypeError', async () => {
    const root = ngrxProject({ '@ngrx/store': '^17.0.0' });

    const files = await FileUtils.getFilesInWorkspace(root, ctx(root).config);

    expect(files.map(f => f.replace(/\\/g, '/'))).toEqual(
      expect.arrayContaining(['package.json', 'src/app/app.module.ts'])
    );
  });

  it('binds the aliases that have no caller yet to their owner too', () => {
    const root = ngrxProject({ '@ngrx/store': '^17.0.0' });

    expect(() => NgRxSetupConfiguration.getAppConfigPath(root)).not.toThrow();
    expect(() => NgRxSetupConfiguration.getSourcePath(root)).not.toThrow();
    expect(() =>
      NgRxSetupValidation.getSetupAnalysisSummary({
        hasStore: true,
        hasEffects: false,
        hasDevTools: false,
        isConfigured: false,
        violations: [],
        suggestions: [],
      } as never)
    ).not.toThrow();
    expect(FileUtils.resolve(root, 'src')).toMatch(/src$/);
  });
});
