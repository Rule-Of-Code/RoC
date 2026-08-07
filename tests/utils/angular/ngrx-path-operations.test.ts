/**
 * @fileoverview Tests for ngrx-path-operations.ts
 * @description Tests for NgRx Path Operations utility
 */

import { NgRxPathOperations } from '../../../src/utils/angular/ngrx-path-operations';
import { DIRECTORY_NAMES, NGRX_KEYWORDS } from '../../../src/utils/constants';
import { FileSystemOperations } from '../../../src/utils/file-system-operations';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/ngrx-path-operations', () => {
  describe('NgRxPathOperations', () => {
    const testProjectRoot = '/test/project';

    describe('DEVTOOLS_CONFIG_FILES', () => {
      it('should have appConfig constant defined', () => {
        expect(NgRxPathOperations.DEVTOOLS_CONFIG_FILES.appConfig).toBe(
          'app.config.ts'
        );
      });

      it('should have mainFile constant defined', () => {
        expect(NgRxPathOperations.DEVTOOLS_CONFIG_FILES.mainFile).toBe(
          'main.ts'
        );
      });

      it('should be readonly', () => {
        const configFiles = NgRxPathOperations.DEVTOOLS_CONFIG_FILES;
        expect(configFiles.appConfig).toBe('app.config.ts');
        expect(configFiles.mainFile).toBe('main.ts');
      });
    });

    describe('getModulePaths', () => {
      let joinSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
      });

      it('should return correct srcPath', () => {
        const result = NgRxPathOperations.getModulePaths(testProjectRoot);

        expect(result.srcPath).toBe(
          `${testProjectRoot}/${DIRECTORY_NAMES.SRC}`
        );
      });

      it('should return correct appPath', () => {
        const result = NgRxPathOperations.getModulePaths(testProjectRoot);

        expect(result.appPath).toBe(
          `${testProjectRoot}/${DIRECTORY_NAMES.SRC}/${DIRECTORY_NAMES.APP}`
        );
      });

      it('should return correct appModulePath', () => {
        const result = NgRxPathOperations.getModulePaths(testProjectRoot);

        expect(result.appModulePath).toBe(
          `${testProjectRoot}/${DIRECTORY_NAMES.SRC}/${DIRECTORY_NAMES.APP}/${NGRX_KEYWORDS.APP_MODULE_TS}`
        );
      });

      it('should call PathOperations.join for path construction', () => {
        NgRxPathOperations.getModulePaths(testProjectRoot);

        expect(joinSpy).toHaveBeenCalled();
      });
    });

    describe('getSourcePath', () => {
      let joinSpy: jest.SpyInstance;
      let existsSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        existsSpy = jest.spyOn(FileSystemOperations, 'exists');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
        existsSpy.mockRestore();
      });

      it('should return srcPath when directory exists', () => {
        existsSpy.mockReturnValue(true);

        const result = NgRxPathOperations.getSourcePath(testProjectRoot);

        expect(result).toBe(`${testProjectRoot}/${DIRECTORY_NAMES.SRC}`);
      });

      it('should return null when src directory does not exist', () => {
        existsSpy.mockReturnValue(false);

        const result = NgRxPathOperations.getSourcePath(testProjectRoot);

        expect(result).toBeNull();
      });

      it('should check existence of src directory', () => {
        existsSpy.mockReturnValue(true);

        NgRxPathOperations.getSourcePath(testProjectRoot);

        expect(existsSpy).toHaveBeenCalledWith(
          `${testProjectRoot}/${DIRECTORY_NAMES.SRC}`
        );
      });
    });

    describe('getAppModulePath', () => {
      let joinSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
      });

      it('should return correct app module path', () => {
        const result = NgRxPathOperations.getAppModulePath(testProjectRoot);

        expect(result).toBe(
          `${testProjectRoot}/${DIRECTORY_NAMES.SRC}/${DIRECTORY_NAMES.APP}/${NGRX_KEYWORDS.APP_MODULE_TS}`
        );
      });

      it('should use PathOperations.join for path construction', () => {
        NgRxPathOperations.getAppModulePath(testProjectRoot);

        expect(joinSpy).toHaveBeenCalledWith(
          testProjectRoot,
          DIRECTORY_NAMES.SRC,
          DIRECTORY_NAMES.APP,
          NGRX_KEYWORDS.APP_MODULE_TS
        );
      });
    });

    describe('getDevToolsConfigPaths', () => {
      let joinSpy: jest.SpyInstance;

      beforeEach(() => {
        joinSpy = jest.spyOn(PathOperations, 'join');
        joinSpy.mockImplementation((...parts: string[]) =>
          parts.filter(Boolean).join('/')
        );
      });

      afterEach(() => {
        joinSpy.mockRestore();
      });

      it('should return array with 3 config paths', () => {
        const result =
          NgRxPathOperations.getDevToolsConfigPaths(testProjectRoot);

        expect(result).toHaveLength(3);
      });

      it('should include app.config.ts path', () => {
        const result =
          NgRxPathOperations.getDevToolsConfigPaths(testProjectRoot);

        expect(result[0]).toContain('app.config.ts');
      });

      it('should include app.module.ts path', () => {
        const result =
          NgRxPathOperations.getDevToolsConfigPaths(testProjectRoot);

        expect(result[1]).toContain(NGRX_KEYWORDS.APP_MODULE_TS);
      });

      it('should include main.ts path', () => {
        const result =
          NgRxPathOperations.getDevToolsConfigPaths(testProjectRoot);

        expect(result[2]).toContain('main.ts');
      });

      it('should construct paths in correct order', () => {
        const result =
          NgRxPathOperations.getDevToolsConfigPaths(testProjectRoot);
        const appPath = `${testProjectRoot}/${DIRECTORY_NAMES.SRC}/${DIRECTORY_NAMES.APP}`;
        const srcPath = `${testProjectRoot}/${DIRECTORY_NAMES.SRC}`;

        expect(result[0]).toBe(`${appPath}/app.config.ts`);
        expect(result[1]).toBe(`${appPath}/${NGRX_KEYWORDS.APP_MODULE_TS}`);
        expect(result[2]).toBe(`${srcPath}/main.ts`);
      });
    });
  });
});
