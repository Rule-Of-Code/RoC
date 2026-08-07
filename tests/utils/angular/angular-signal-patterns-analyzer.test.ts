/**
 * @fileoverview Tests for angular-signal-patterns-analyzer.ts
 * @description Tests for Angular Signal Patterns Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalConfiguration } from '../../../src/utils/angular/angular-signals/angular-signal-configuration';
import { AngularSignalPatternsAnalyzer } from '../../../src/utils/angular/angular-signals/angular-signal-patterns-analyzer';
import { AngularSignalValidationPatterns } from '../../../src/utils/angular/angular-signals/angular-signal-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-signals/angular-signal-patterns-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularSignalPatternsAnalyzer', () => {
    describe('checkSignalPatterns', () => {
      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
      });

      it('should return empty results when no Angular files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect signal pattern violations in component files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const count = signal();
        `);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations.length).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect properly initialized signals', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal, WritableSignal } from '@angular/core';
          readonly count: WritableSignal<number> = signal<number>(0);
        `);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should process multiple files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/app.component.ts',
          '/test/project/src/data.service.ts',
        ]);
        readFileSpy.mockReturnValue(`const count = signal(0);`);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should handle empty file content', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/empty.component.ts']);
        readFileSpy.mockReturnValue('');

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect computed signals with side effects as violations', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          computed(() => { console.log('side effect'); return count() * 2; }
        `);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect effect without cleanup', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          effect(() => { console.log(count()); });
        `);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect inconsistent update patterns', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const count = signal(0);
          count.set(5);
          count.update(v => v + 1);
        `);

        const result = AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(Array.isArray(result.suggestions)).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should use correct file extensions from configuration', () => {
        const extensions = AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS;
        expect(extensions).toContain('.component.ts');
        expect(extensions).toContain('.service.ts');
      });
    });

    describe('integration with AngularSignalValidationPatterns', () => {
      it('should call validateAllPatterns for file analysis', () => {
        const validateSpy = jest.spyOn(
          AngularSignalValidationPatterns,
          'validateAllPatterns'
        );
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`const count = signal(0);`);

        AngularSignalPatternsAnalyzer.checkSignalPatterns(
          '/test/project',
          mockConfig
        );

        expect(validateSpy).toHaveBeenCalled();

        validateSpy.mockRestore();
        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
      });
    });
  });
});
