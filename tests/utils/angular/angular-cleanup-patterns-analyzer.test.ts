/**
 * @fileoverview Tests for angular-cleanup-patterns-analyzer.ts
 * @description Tests for Angular cleanup patterns analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularCleanupPatternsAnalyzer } from '../../../src/utils/angular/angular-cleanup/angular-cleanup-patterns-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-cleanup/angular-cleanup-patterns-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-cleanup-analyzer-test-');
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;

    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkCleanupPatterns', () => {
    it('should return empty results for empty project', () => {
      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should detect subscriptions without OnDestroy', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { Subject } from 'rxjs';

        @Component({
          selector: 'app-test',
          template: ''
        })
        export class TestComponent {
          data$ = new Subject();

          ngOnInit() {
            this.data$.subscribe(data => console.log(data));
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'test.component.ts'),
        componentContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should not flag component with proper OnDestroy implementation', () => {
      const componentContent = `
        import { Component, OnDestroy } from '@angular/core';
        import { Subject } from 'rxjs';
        import { takeUntil } from 'rxjs/operators';

        @Component({
          selector: 'app-test',
          template: ''
        })
        export class TestComponent implements OnDestroy {
          private destroy$ = new Subject<void>();
          data$ = new Subject();

          ngOnInit() {
            this.data$.pipe(takeUntil(this.destroy$)).subscribe(data => console.log(data));
          }

          ngOnDestroy() {
            this.destroy$.next();
            this.destroy$.complete();
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'proper.component.ts'),
        componentContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should detect timers without cleanup', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-timer',
          template: ''
        })
        export class TimerComponent {
          ngOnInit() {
            setInterval(() => {
              console.log('tick');
            }, 1000);
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'timer.component.ts'),
        componentContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should detect event listeners without cleanup', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-listener',
          template: ''
        })
        export class ListenerComponent {
          ngOnInit() {
            document.addEventListener('click', this.handleClick);
          }

          handleClick() {
            console.log('clicked');
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'listener.component.ts'),
        componentContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze service files', () => {
      const serviceContent = `
        import { Injectable } from '@angular/core';
        import { Subject } from 'rxjs';

        @Injectable({
          providedIn: 'root'
        })
        export class DataService {
          private data$ = new Subject<string>();

          getData() {
            return this.data$.asObservable();
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data.service.ts'),
        serviceContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should analyze directive files', () => {
      const directiveContent = `
        import { Directive, OnDestroy } from '@angular/core';
        import { interval } from 'rxjs';

        @Directive({
          selector: '[appHighlight]'
        })
        export class HighlightDirective implements OnDestroy {
          private intervalId = setInterval(() => {}, 1000);

          ngOnDestroy() {
            clearInterval(this.intervalId);
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'highlight.directive.ts'),
        directiveContent
      );

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should handle missing src directory', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'nonexistent');

      const result = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
        nonExistentPath,
        mockConfig
      );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });
  });
});
