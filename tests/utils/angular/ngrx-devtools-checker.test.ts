/**
 * @fileoverview Tests for ngrx-devtools-checker.ts
 * @description Tests for NgRx DevTools Checker utility, on real project
 * fixtures: the checker reads src/app/app.config.ts, src/app/app.module.ts and
 * src/main.ts in that order, so the tests write those files. A spy that only
 * observes FileSystemOperations.readFile checks that the search stops at the
 * first file that wires the devtools.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NgRxDevToolsChecker } from '../../../src/utils/angular/ngrx-devtools-checker';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});
afterEach(() => {
  jest.restoreAllMocks();
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-devtools-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const APP_CONFIG = 'src/app/app.config.ts';
const APP_MODULE = 'src/app/app.module.ts';
const MAIN = 'src/main.ts';

describe('utils/angular/ngrx-devtools-checker', () => {
  describe('NgRxDevToolsChecker', () => {
    describe('DEVTOOLS_PATTERNS', () => {
      it('should have DevTools patterns defined', () => {
        expect(NgRxDevToolsChecker.DEVTOOLS_PATTERNS).toBeDefined();
        expect(NgRxDevToolsChecker.DEVTOOLS_PATTERNS.length).toBeGreaterThan(0);
      });

      it('should include StoreDevtoolsModule pattern', () => {
        expect(NgRxDevToolsChecker.DEVTOOLS_PATTERNS).toContain(
          'StoreDevtoolsModule'
        );
      });

      it('should include provideStoreDevtools pattern', () => {
        expect(NgRxDevToolsChecker.DEVTOOLS_PATTERNS).toContain(
          'provideStoreDevtools'
        );
      });

      it('should include store-devtools pattern', () => {
        expect(NgRxDevToolsChecker.DEVTOOLS_PATTERNS).toContain(
          'store-devtools'
        );
      });
    });

    describe('checkDevToolsConfigured', () => {
      it('should return false when no config files exist', () => {
        const root = project({ 'package.json': '{}' });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(false);
      });

      it('should return true when StoreDevtoolsModule is found in app.config.ts', () => {
        const root = project({
          [APP_CONFIG]: `
            import { StoreDevtoolsModule } from '@ngrx/store-devtools';
            export const appConfig = {
              imports: [StoreDevtoolsModule.instrument({ maxAge: 25 })]
            };
          `,
        });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(true);
      });

      it('should return true when provideStoreDevtools is found', () => {
        const root = project({
          [APP_CONFIG]: `
            import { provideStoreDevtools } from '@ngrx/store-devtools';
            export const appConfig = {
              providers: [provideStoreDevtools({ maxAge: 25 })]
            };
          `,
        });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(true);
      });

      it('should return true when store-devtools import is found', () => {
        const root = project({
          [APP_MODULE]: `import { StoreDevtoolsModule } from '@ngrx/store-devtools';\n`,
        });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(true);
      });

      it('should return false when config files exist but no DevTools patterns found', () => {
        const root = project({
          [APP_CONFIG]: `
            import { StoreModule } from '@ngrx/store';
            export const appConfig = {
              imports: [StoreModule.forRoot({})]
            };
          `,
        });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(false);
      });

      it('should check multiple config files until DevTools is found', () => {
        const root = project({
          [APP_CONFIG]: '// Empty config file\n',
          [APP_MODULE]: `import { StoreDevtoolsModule } from '@ngrx/store-devtools';\n`,
          [MAIN]: '// bootstrap\n',
        });
        const readFile = jest.spyOn(FileSystemOperations, 'readFile');

        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(true);
        // app.config.ts, then app.module.ts; main.ts is not read.
        expect(readFile).toHaveBeenCalledTimes(2);
      });

      it('should return false when files exist but content is empty', () => {
        const root = project({ [APP_CONFIG]: '' });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(false);
      });

      it('should handle mixed existing and non-existing files', () => {
        // No app.config.ts; the module wires the devtools.
        const root = project({
          [APP_MODULE]: `import { provideStoreDevtools } from '@ngrx/store-devtools';\n`,
        });
        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(true);
      });

      it('should return false when all files checked and none have DevTools', () => {
        const root = project({
          [APP_CONFIG]: '// No NgRx DevTools here\n',
          [APP_MODULE]: '// No NgRx DevTools here\n',
          [MAIN]: '// No NgRx DevTools here\n',
        });
        const readFile = jest.spyOn(FileSystemOperations, 'readFile');

        expect(NgRxDevToolsChecker.checkDevToolsConfigured(root)).toBe(false);
        expect(readFile).toHaveBeenCalledTimes(3);
      });
    });
  });
});
