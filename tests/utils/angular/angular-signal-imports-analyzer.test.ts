/**
 * @fileoverview Tests for angular-signal-imports-analyzer.ts
 * @description Tests for Angular Signal Imports Analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalImportsAnalyzer } from '../../../src/utils/angular/angular-signal-imports/angular-signal-imports-analyzer';
import { AngularSignalImportsConfiguration } from '../../../src/utils/angular/angular-signal-imports/angular-signal-imports-configuration';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { ProjectTypeDetector } from '../../../src/utils/config';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-signal-imports/angular-signal-imports-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularSignalImportsAnalyzer', () => {
    describe('checkSignalImports', () => {
      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
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

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should detect missing signal import when signal() is used', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const count = signal(0);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('signal()'))).toBe(true);
        expect(result.suggestions.some(s => s.includes('Import'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should not flag signal when properly imported', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal } from '@angular/core';
          const count = signal(0);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(
          result.violations.filter(v => v.includes('signal()'))
        ).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should detect missing computed import', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const doubled = computed(() => count() * 2);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('computed()'))).toBe(
          true
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should detect missing effect import', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          effect(() => console.log('count changed'));
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('effect()'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should detect missing RxJS interop import for toSignal', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const data = toSignal(this.data$);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('RxJS interop'))).toBe(
          true
        );
        expect(result.suggestions.some(s => s.includes('rxjs-interop'))).toBe(
          true
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should detect missing RxJS interop import for toObservable', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          const data$ = toObservable(this.data);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('RxJS interop'))).toBe(
          true
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should suggest combining multiple @angular/core imports', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { Component } from '@angular/core';
          import { signal } from '@angular/core';
          import { computed } from '@angular/core';
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('Combine'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should detect experimental signals usage', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal } from '@angular/core/experimental';
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations.some(v => v.includes('experimental'))).toBe(
          true
        );
        expect(
          result.suggestions.some(
            s => s.includes('stable') || s.includes('Upgrade')
          )
        ).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should suggest DestroyRef for effect cleanup', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { effect } from '@angular/core';
          effect(() => {
            onDestroy(() => cleanup());
          });
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('DestroyRef'))).toBe(
          true
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should validate Angular version compatibility with signals', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal } from '@angular/core';
          const count = signal(0);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue({ '@angular/core': '^15.0.0' });

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.suggestions.some(s => s.includes('15'))).toBe(true);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should not flag version incompatibility for Angular 17', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal } from '@angular/core';
          const count = signal(0);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        depsSpy.mockReturnValue({ '@angular/core': '^17.0.0' });

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(
          result.suggestions.filter(s => s.includes('require'))
        ).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should handle empty file content gracefully', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue('');
        depsSpy.mockReturnValue(null);

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        depsSpy.mockRestore();
      });

      it('should handle project without @angular/core dependency', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const joinSpy = jest.spyOn(PathOperations, 'join');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');
        const depsSpy = jest.spyOn(
          ProjectTypeDetector,
          'getPackageDependencies'
        );

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { signal } from '@angular/core';
          const count = signal(0);
        `);
        basenameSpy.mockReturnValue('app.component.ts');
        // Has dependencies but no @angular/core
        depsSpy.mockReturnValue({ 'some-other-package': '1.0.0' });

        const result = AngularSignalImportsAnalyzer.checkSignalImports(
          '/test/project',
          mockConfig
        );

        // Should not fail, just skip version check
        expect(result).toBeDefined();

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        joinSpy.mockRestore();
        basenameSpy.mockRestore();
        depsSpy.mockRestore();
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
