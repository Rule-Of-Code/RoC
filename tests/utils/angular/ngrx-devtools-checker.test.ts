/**
 * @fileoverview Tests for ngrx-devtools-checker.ts
 * @description Tests for NgRx DevTools Checker utility
 */

import { NgRxDevToolsChecker } from '../../../src/utils/angular/ngrx-devtools-checker';
import { NgRxPathOperations } from '../../../src/utils/angular/ngrx-path-operations';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';

describe('utils/angular/ngrx-devtools-checker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
          '/test/project/src/app/app.module.ts',
          '/test/project/src/main.ts',
        ]);
        existsSpy.mockReturnValue(false);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(false);
      });

      it('should return true when StoreDevtoolsModule is found in app.config.ts', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          import { StoreDevtoolsModule } from '@ngrx/store-devtools';

          export const appConfig = {
            imports: [StoreDevtoolsModule.instrument({ maxAge: 25 })]
          };
        `);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(true);
      });

      it('should return true when provideStoreDevtools is found', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          import { provideStoreDevtools } from '@ngrx/store-devtools';

          export const appConfig = {
            providers: [provideStoreDevtools({ maxAge: 25 })]
          };
        `);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(true);
      });

      it('should return true when store-devtools import is found', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.module.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          import { StoreDevtoolsModule } from '@ngrx/store-devtools';
        `);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(true);
      });

      it('should return false when config files exist but no DevTools patterns found', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`
          import { StoreModule } from '@ngrx/store';

          export const appConfig = {
            imports: [StoreModule.forRoot({})]
          };
        `);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(false);
      });

      it('should check multiple config files until DevTools is found', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
          '/test/project/src/app/app.module.ts',
          '/test/project/src/main.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy
          .mockReturnValueOnce(`// Empty config file`)
          .mockReturnValueOnce(
            `import { StoreDevtoolsModule } from '@ngrx/store-devtools';`
          );

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(true);
        expect(readFileSpy).toHaveBeenCalledTimes(2);
      });

      it('should return false when files exist but content is empty', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue('');

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(false);
      });

      it('should handle mixed existing and non-existing files', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
          '/test/project/src/app/app.module.ts',
        ]);
        existsSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);
        readFileSpy.mockReturnValue(
          `import { provideStoreDevtools } from '@ngrx/store-devtools';`
        );

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(true);
      });

      it('should return false when all files checked and none have DevTools', () => {
        const getDevToolsConfigPathsSpy = jest.spyOn(
          NgRxPathOperations,
          'getDevToolsConfigPaths'
        );
        const existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        const readFileSpy = jest.spyOn(FileSystemOperations, 'readFile');

        getDevToolsConfigPathsSpy.mockReturnValue([
          '/test/project/src/app/app.config.ts',
          '/test/project/src/app/app.module.ts',
          '/test/project/src/main.ts',
        ]);
        existsSpy.mockReturnValue(true);
        readFileSpy.mockReturnValue(`// No NgRx DevTools here`);

        const result =
          NgRxDevToolsChecker.checkDevToolsConfigured('/test/project');

        expect(result).toBe(false);
        expect(readFileSpy).toHaveBeenCalledTimes(3);
      });
    });
  });
});
