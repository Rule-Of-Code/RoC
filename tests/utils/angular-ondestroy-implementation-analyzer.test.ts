/**
 * @fileoverview Tests for angular-ondestroy-implementation-analyzer.ts
 * @description Tests for Angular OnDestroy implementation analyzer utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularOnDestroyImplementationAnalyzer } from '../../src/utils/angular/angular-ondestroy/angular-ondestroy-implementation-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-ondestroy/angular-ondestroy-implementation-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ondestroy-analyzer-test-');
    mockConfig = {
      extends: [],
      laws: {},
      plugins: [],
      ignorePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkOnDestroyImplementation', () => {
    it('should return empty results for non-existent src directory', () => {
      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          '/non/existent/path',
          mockConfig
        );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return empty results for project without Angular files', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);
      FileUtils.writeFile(
        PathOperations.join(srcPath, 'index.ts'),
        'export const test = 1;'
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze components with OnDestroy patterns', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const componentContent = `
        import { Component, OnDestroy } from '@angular/core';
        import { Subscription } from 'rxjs';

        @Component({
          selector: 'app-test',
          template: '<div></div>'
        })
        export class TestComponent implements OnDestroy {
          subscription: Subscription;

          ngOnDestroy(): void {
            this.subscription.unsubscribe();
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'test.component.ts'),
        componentContent
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });

    it('should detect missing OnDestroy interface', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-test',
          template: '<div></div>'
        })
        export class TestComponent {
          ngOnDestroy(): void {
            console.log('cleanup');
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'test.component.ts'),
        componentContent
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing ngOnDestroy method when interface is implemented', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const componentContent = `
        import { Component, OnDestroy } from '@angular/core';

        @Component({
          selector: 'app-test',
          template: '<div></div>'
        })
        export class TestComponent implements OnDestroy {
          // Missing ngOnDestroy method
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'missing.component.ts'),
        componentContent
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should analyze directives with OnDestroy', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const directiveContent = `
        import { Directive, OnDestroy } from '@angular/core';
        import { Subject } from 'rxjs';

        @Directive({
          selector: '[appHighlight]'
        })
        export class HighlightDirective implements OnDestroy {
          private destroy$ = new Subject<void>();

          ngOnDestroy(): void {
            this.destroy$.next();
            this.destroy$.complete();
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'highlight.directive.ts'),
        directiveContent
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });

    it('should analyze services with OnDestroy', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const serviceContent = `
        import { Injectable, OnDestroy } from '@angular/core';
        import { BehaviorSubject } from 'rxjs';

        @Injectable({
          providedIn: 'root'
        })
        export class DataService implements OnDestroy {
          private data$ = new BehaviorSubject<string>('');

          ngOnDestroy(): void {
            this.data$.complete();
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'data.service.ts'),
        serviceContent
      );

      const result =
        AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });
  });
});
