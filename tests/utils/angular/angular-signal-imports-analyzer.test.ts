/**
 * @fileoverview Tests for angular-signal-imports-analyzer.ts
 * @description Tests for Angular Signal Imports Analyzer utility, on real
 * project fixtures: the analyzer finds *.component.ts, *.service.ts and
 * *.directive.ts files under src/ (and Angular 20's unsuffixed files by their
 * decorator), reads them and reads package.json for the Angular version, so
 * the tests write those files.
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalImportsAnalyzer } from '../../../src/utils/angular/angular-signal-imports/angular-signal-imports-analyzer';
import { AngularSignalImportsConfiguration } from '../../../src/utils/angular/angular-signal-imports/angular-signal-imports-configuration';
import { FileUtils } from '../../../src/utils/file-utils';
import { manifest, project } from '../../checkers/toolkit-fixture';

const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
const check = (files: Record<string, string>) =>
  AngularSignalImportsAnalyzer.checkSignalImports(project(files), config);

const C = AngularSignalImportsConfiguration;
const M = C.VALIDATION_MESSAGES;
const COMPONENT = 'src/app/app.component.ts';
// Messages name a file by its base name without the extension (PathOperations.getBasename).
const FILE = 'app.component';
const notImported = (fn: string, file = FILE) =>
  C.buildSignalMessage(M.SIGNAL_NOT_IMPORTED, fn, file);
const importIt = (symbol: string, file = FILE) =>
  C.buildSignalMessage(M.SUGGEST_IMPORT, symbol, file);
const about = (template: string, file = FILE) =>
  C.buildFileNameMessage(template, file);

describe('utils/angular/angular-signal-imports/angular-signal-imports-analyzer', () => {
  describe('AngularSignalImportsAnalyzer', () => {
    describe('checkSignalImports', () => {
      it('should return empty results when src directory does not exist', () => {
        const result = check({ 'lib/app.component.ts': 'signal(0);\n' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should return empty results when no Angular files found', () => {
        const result = check({
          'src/app/util.ts': 'export const count = signal(0);\n',
          'src/app/name.pipe.ts': 'export const count = signal(0);\n',
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should detect missing signal import when signal() is used', () => {
        const result = check({ [COMPONENT]: 'const count = signal(0);\n' });

        expect(result.violations).toEqual([notImported('signal()')]);
        expect(result.suggestions).toEqual([importIt('signal')]);
      });

      it('should not flag signal when properly imported', () => {
        const result = check({
          [COMPONENT]: `
            import { signal } from '@angular/core';
            const count = signal(0);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should accept a grouped, multiline or aliased import of the symbol', () => {
        const result = check({
          [COMPONENT]: `
            import {
              computed,
              signal as sig,
              WritableSignal,
            } from '@angular/core';
            let state: WritableSignal;
            const count = signal(0);
            const doubled = computed(() => count() * 2);
          `,
        });

        expect(result.violations).toEqual([]);
      });

      it('should detect missing computed import', () => {
        const result = check({
          [COMPONENT]: `
            import { signal } from '@angular/core';
            const count = signal(0);
            const doubled = computed(() => count() * 2);
          `,
        });

        expect(result.violations).toEqual([notImported('computed()')]);
        expect(result.suggestions).toEqual([importIt('computed')]);
      });

      it('should detect missing effect import', () => {
        const result = check({
          [COMPONENT]: 'effect(() => console.log("changed"));\n',
        });

        expect(result.violations).toEqual([notImported('effect()')]);
        expect(result.suggestions).toEqual([importIt('effect')]);
      });

      it('should detect missing inject, WritableSignal and Signal type imports', () => {
        const result = check({
          'src/app/data.service.ts': `
            const http = inject(HttpClient);
            let state: WritableSignal<number>;
            let view: Signal<number>;
          `,
        });

        expect(result.violations).toEqual([
          notImported('WritableSignal', 'data.service'),
          notImported('Signal type', 'data.service'),
          notImported('inject()', 'data.service'),
        ]);
      });

      it('should detect missing RxJS interop import for toSignal', () => {
        const result = check({
          [COMPONENT]: 'const items = toSignal(this.items$);\n',
        });

        expect(result.violations).toEqual([about(M.RXJS_INTEROP_NOT_IMPORTED)]);
        expect(result.suggestions).toEqual([
          about(M.SUGGEST_RXJS_INTEROP_IMPORT),
        ]);
      });

      it('should detect missing RxJS interop import for toObservable', () => {
        const result = check({
          'src/app/highlight.directive.ts':
            'const count$ = toObservable(this.count);\n',
        });

        expect(result.violations).toEqual([
          about(M.RXJS_INTEROP_NOT_IMPORTED, 'highlight.directive'),
        ]);
      });

      it('should not flag RxJS interop functions imported from rxjs-interop', () => {
        const result = check({
          [COMPONENT]: `
            import { toObservable, toSignal } from '@angular/core/rxjs-interop';
            const items = toSignal(this.items$);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should suggest combining multiple @angular/core imports', () => {
        const result = check({
          [COMPONENT]: `
            import { signal } from '@angular/core';
            import { computed } from '@angular/core';
            const count = signal(0);
            const doubled = computed(() => count() * 2);
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([about(M.COMBINE_IMPORTS)]);
      });

      it('should detect experimental signals usage', () => {
        const result = check({
          [COMPONENT]: `import { model } from '@angular/core/experimental';\n`,
        });

        expect(result.violations).toEqual([
          about(M.EXPERIMENTAL_SIGNALS_WARNING),
        ]);
        expect(result.suggestions).toEqual([about(M.UPGRADE_TO_STABLE)]);
      });

      it('should suggest DestroyRef for effect cleanup', () => {
        const result = check({
          [COMPONENT]: `
            import { effect } from '@angular/core';
            effect(onCleanup => onDestroy(() => onCleanup()));
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([about(M.DESTROY_REF_SUGGESTION)]);
      });

      it('should not suggest DestroyRef when it is imported', () => {
        const result = check({
          [COMPONENT]: `
            import { DestroyRef, effect } from '@angular/core';
            effect(onCleanup => onDestroy(() => onCleanup()));
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should validate Angular version compatibility with signals', () => {
        const result = check({
          'package.json': manifest({ '@angular/core': '^15.2.0' }),
          [COMPONENT]: `
            import { signal } from '@angular/core';
            const count = signal(0);
          `,
        });

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([
          C.buildVersionMessage(
            M.SIGNALS_VERSION_INCOMPATIBLE,
            '^15.2.0',
            FILE
          ),
        ]);
      });

      it('should not flag version incompatibility for Angular 17', () => {
        const result = check({
          'package.json': manifest({ '@angular/core': '^17.0.0' }),
          [COMPONENT]: `
            import { signal } from '@angular/core';
            const count = signal(0);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should not judge the version of a file that uses no signals', () => {
        const result = check({
          'package.json': manifest({ '@angular/core': '^15.2.0' }),
          [COMPONENT]: `export class AppComponent {}\n`,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should handle project without @angular/core dependency', () => {
        const result = check({
          'package.json': manifest({ rxjs: '^7.8.0' }),
          [COMPONENT]: `
            import { signal } from '@angular/core';
            const count = signal(0);
          `,
        });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should handle empty file content gracefully', () => {
        const result = check({ [COMPONENT]: '' });

        expect(result).toEqual({ violations: [], suggestions: [] });
      });

      it('should read an unsuffixed Angular 20 component by its decorator', () => {
        const result = check({
          'src/app/hero.ts': `
            @Component({ selector: 'app-hero', template: '' })
            export class Hero {
              count = signal(0);
            }
          `,
        });

        expect(result.violations).toEqual([notImported('signal()', 'hero')]);
      });

      it('should report each file under its own name', () => {
        const result = check({
          [COMPONENT]: 'const count = signal(0);\n',
          'src/app/data.service.ts': 'const count = signal(0);\n',
        });

        expect(result.violations).toEqual(
          expect.arrayContaining([
            notImported('signal()'),
            notImported('signal()', 'data.service'),
          ])
        );
        expect(result.violations).toHaveLength(2);
      });
    });
  });

  describe('AngularSignalImportsConfiguration', () => {
    describe('FILE_EXTENSIONS', () => {
      it('should include component.ts extension', () => {
        expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
          '.component.ts'
        );
      });

      it('should include service.ts extension', () => {
        expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
          '.service.ts'
        );
      });

      it('should include directive.ts extension', () => {
        expect(AngularSignalImportsConfiguration.FILE_EXTENSIONS).toContain(
          '.directive.ts'
        );
      });
    });

    describe('SIGNAL_CHECKS', () => {
      it('should have check for signal() usage', () => {
        const signalCheck =
          AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
            c => c.usage === 'signal('
          );
        expect(signalCheck).toBeDefined();
        expect(signalCheck?.import).toBe('signal');
      });

      it('should have check for computed() usage', () => {
        const computedCheck =
          AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
            c => c.usage === 'computed('
          );
        expect(computedCheck).toBeDefined();
        expect(computedCheck?.import).toBe('computed');
      });

      it('should have check for effect() usage', () => {
        const effectCheck =
          AngularSignalImportsConfiguration.SIGNAL_CHECKS.find(
            c => c.usage === 'effect('
          );
        expect(effectCheck).toBeDefined();
        expect(effectCheck?.import).toBe('effect');
      });
    });

    describe('RXJS_INTEROP_FUNCTIONS', () => {
      it('should include toSignal', () => {
        expect(
          AngularSignalImportsConfiguration.RXJS_INTEROP_FUNCTIONS
        ).toContain('toSignal');
      });

      it('should include toObservable', () => {
        expect(
          AngularSignalImportsConfiguration.RXJS_INTEROP_FUNCTIONS
        ).toContain('toObservable');
      });
    });

    describe('COMPATIBLE_VERSIONS', () => {
      it('should include Angular 16', () => {
        expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
          '16'
        );
      });

      it('should include Angular 17', () => {
        expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
          '17'
        );
      });

      it('should include Angular 18', () => {
        expect(AngularSignalImportsConfiguration.COMPATIBLE_VERSIONS).toContain(
          '18'
        );
      });
    });

    describe('buildFileNameMessage', () => {
      it('should replace fileName placeholder', () => {
        const message = AngularSignalImportsConfiguration.buildFileNameMessage(
          'Test {fileName} message',
          'test.component.ts'
        );
        expect(message).toBe('Test test.component.ts message');
      });
    });

    describe('buildSignalMessage', () => {
      it('should replace signal and fileName placeholders', () => {
        const message = AngularSignalImportsConfiguration.buildSignalMessage(
          '{signal} in {fileName}',
          'computed',
          'test.component.ts'
        );
        expect(message).toBe('computed in test.component.ts');
      });
    });

    describe('buildVersionMessage', () => {
      it('should replace version and fileName placeholders', () => {
        const message = AngularSignalImportsConfiguration.buildVersionMessage(
          'Version {version} in {fileName}',
          '15.0.0',
          'test.component.ts'
        );
        expect(message).toBe('Version 15.0.0 in test.component.ts');
      });
    });
  });
});
