/**
 * Tests for MemoryManagementLaw
 *
 * Tests the Memory Management Law which ensures proper memory management practices
 * to prevent memory leaks
 */
import { MemoryManagementLaw } from '../../../src/checkers/performance-laws/memory-management';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('MemoryManagementLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('memory-management-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
    context = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ============================================
  // check - Basic Behavior
  // ============================================
  describe('check()', () => {
    describe('when project has no TypeScript/JavaScript sources', () => {
      it('should return a result object', () => {
        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = MemoryManagementLaw.check(context);

        expect(Array.isArray(result.violations!)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = MemoryManagementLaw.check(context);

        expect(Array.isArray(result.suggestions!)).toBe(true);
      });

      // The absence of the substrate is never a violation: a project with no
      // TS/JS sources (e.g. a Python backend) cannot leak a JS timer or a DOM
      // listener — the law is NOT APPLICABLE, not permanently red.
      it('should report N/A and pass instead of "No TypeScript files found"', () => {
        const result = MemoryManagementLaw.check(context);

        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
        expect(result.violations).toEqual([]);
        expect(result.message).toContain('Not applicable');
        expect(result.message).toContain('no TypeScript/JavaScript sources');
      });

      it('should stay N/A for a pure Python backend', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'main.py'),
          'def run() -> None:\n    pass\n'
        );

        const result = MemoryManagementLaw.check(context);

        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it('should include metrics in result', () => {
        const result = MemoryManagementLaw.check(context);

        expect(result.metrics).toBeDefined();
      });
    });

    describe('when project has JS/TS sources but no Angular files', () => {
      it('should still report that no TypeScript files were found', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'tools'));
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'tools', 'build.js'),
          'module.exports = {};'
        );

        const result = MemoryManagementLaw.check(context);

        expect(result.passed).toBe(false);
        expect(
          result.violations!.some(v => v.toLowerCase().includes('typescript'))
        ).toBe(true);
      });
    });

    describe('when project has Angular components', () => {
      beforeEach(() => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
      });

      it('should analyze component files', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.component.ts'),
          `
            import { Component } from '@angular/core';

            @Component({
              selector: 'app-root',
              template: '<h1>Hello</h1>'
            })
            export class AppComponent {}
          `
        );

        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should exclude spec files from analysis', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.component.ts'),
          `export class AppComponent {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.component.spec.ts'),
          `describe('AppComponent', () => { it('should work', () => {}); });`
        );

        const result = MemoryManagementLaw.check(context);

        expect(result.metrics?.totalFiles).toBe(1);
      });

      it('should exclude test files from analysis', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.component.ts'),
          `export class AppComponent {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.component.test.ts'),
          `test('AppComponent', () => {});`
        );

        const result = MemoryManagementLaw.check(context);

        expect(result.metrics?.totalFiles).toBe(1);
      });
    });

    describe('when analyzing memory patterns', () => {
      beforeEach(() => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
      });

      it('should check for observable subscriptions', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'data.service.ts'),
          `
            import { Injectable } from '@angular/core';
            import { Observable, of } from 'rxjs';

            @Injectable({ providedIn: 'root' })
            export class DataService {
              getData(): Observable<string[]> {
                return of(['data']);
              }
            }
          `
        );

        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check for event listeners', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'listener.component.ts'),
          `
            import { Component, OnInit, OnDestroy } from '@angular/core';

            @Component({ selector: 'app-listener', template: '' })
            export class ListenerComponent implements OnInit, OnDestroy {
              ngOnInit() {
                window.addEventListener('resize', this.onResize);
              }
              ngOnDestroy() {
                window.removeEventListener('resize', this.onResize);
              }
              onResize = () => {};
            }
          `
        );

        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check for timer functions', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'timer.component.ts'),
          `
            import { Component, OnInit, OnDestroy } from '@angular/core';

            @Component({ selector: 'app-timer', template: '' })
            export class TimerComponent implements OnInit, OnDestroy {
              private intervalId: number;

              ngOnInit() {
                this.intervalId = setInterval(() => {}, 1000);
              }

              ngOnDestroy() {
                clearInterval(this.intervalId);
              }
            }
          `
        );

        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check for DOM references', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'dom.component.ts'),
          `
            import { Component, ViewChild, ElementRef } from '@angular/core';

            @Component({ selector: 'app-dom', template: '<div #myDiv></div>' })
            export class DomComponent {
              @ViewChild('myDiv') myDiv: ElementRef;
            }
          `
        );

        const result = MemoryManagementLaw.check(context);

        expect(result).toBeDefined();
      });
    });
  });

  // ============================================
  // Native resource leak detection (real detection, v7.2.0)
  // ============================================
  describe('native resource leak detection', () => {
    beforeEach(() => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('flags setInterval() without a matching clearInterval()', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'poll.component.ts'),
        `import { Component, OnInit, OnDestroy } from '@angular/core';
@Component({ selector: 'app-poll', template: '' })
export class PollComponent implements OnInit, OnDestroy {
  ngOnInit() { setInterval(() => this.tick(), 1000); }
  ngOnDestroy() {}
  tick() {}
}`
      );
      const result = MemoryManagementLaw.check(context);
      expect(result.passed).toBe(false);
      expect(
        result.violations!.some(v => v.includes('clearInterval'))
      ).toBe(true);
    });

    it('passes setInterval() paired with clearInterval()', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'good-timer.component.ts'),
        `import { Component, OnInit, OnDestroy } from '@angular/core';
@Component({ selector: 'app-gt', template: '' })
export class GoodTimerComponent implements OnInit, OnDestroy {
  private id = 0;
  ngOnInit() { this.id = setInterval(() => {}, 1000) as unknown as number; }
  ngOnDestroy() { clearInterval(this.id); }
}`
      );
      expect(MemoryManagementLaw.check(context).passed).toBe(true);
    });

    it('flags addEventListener() without a matching removeEventListener()', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'leak.component.ts'),
        `import { Component, OnInit } from '@angular/core';
@Component({ selector: 'app-leak', template: '' })
export class LeakComponent implements OnInit {
  ngOnInit() { window.addEventListener('resize', this.onResize); }
  onResize = () => {};
}`
      );
      const result = MemoryManagementLaw.check(context);
      expect(result.passed).toBe(false);
      expect(
        result.violations!.some(v => v.includes('removeEventListener'))
      ).toBe(true);
    });

    it('passes addEventListener() paired with removeEventListener()', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'good-listener.component.ts'),
        `import { Component, OnInit, OnDestroy } from '@angular/core';
@Component({ selector: 'app-gl', template: '' })
export class GoodListenerComponent implements OnInit, OnDestroy {
  onResize = () => {};
  ngOnInit() { window.addEventListener('resize', this.onResize); }
  ngOnDestroy() { window.removeEventListener('resize', this.onResize); }
}`
      );
      expect(MemoryManagementLaw.check(context).passed).toBe(true);
    });

    it('ignores native resource calls mentioned only in comments', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'commented.component.ts'),
        `import { Component } from '@angular/core';
// historically used setInterval() here, removed in favor of signals
@Component({ selector: 'app-c', template: '' })
export class CommentedComponent {}`
      );
      expect(MemoryManagementLaw.check(context).passed).toBe(true);
    });
  });

  // ============================================
  // Result Structure
  // ============================================
  describe('result structure', () => {
    it('should include lawName', () => {
      const result = MemoryManagementLaw.check(context);

      expect(result.lawName).toBe('Memory Management Law');
    });

    it('should include passed boolean', () => {
      const result = MemoryManagementLaw.check(context);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should include message string', () => {
      const result = MemoryManagementLaw.check(context);

      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should include violations array', () => {
      const result = MemoryManagementLaw.check(context);

      expect(Array.isArray(result.violations!)).toBe(true);
    });

    it('should include suggestions array without duplicates', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component.ts'),
        `export class Component {}`
      );

      const result = MemoryManagementLaw.check(context);

      const uniqueSuggestions = [...new Set(result.suggestions!)];
      expect(result.suggestions!.length).toBe(uniqueSuggestions.length);
    });

    it('should include score between 0 and 100', () => {
      const result = MemoryManagementLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include config object', () => {
      const result = MemoryManagementLaw.check(context);

      expect(result.config).toBeDefined();
    });

    it('should include metrics object', () => {
      const result = MemoryManagementLaw.check(context);

      expect(result.metrics).toBeDefined();
    });
  });

  // ============================================
  // Metrics
  // ============================================
  describe('metrics', () => {
    it('should report total files analyzed', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'comp1.ts'),
        'export class Comp1 {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'comp2.ts'),
        'export class Comp2 {}'
      );

      const result = MemoryManagementLaw.check(context);

      expect(result.metrics?.totalFiles).toBe(2);
    });

    it('should report issues found', () => {
      const result = MemoryManagementLaw.check(context);

      expect(typeof result.metrics?.issuesFound).toBe('number');
    });
  });

  // ============================================
  // Score Calculation
  // ============================================
  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'clean.component.ts'),
        `
          import { Component, OnInit, OnDestroy } from '@angular/core';
          import { Subject } from 'rxjs';
          import { takeUntil } from 'rxjs/operators';

          @Component({ selector: 'app-clean', template: '' })
          export class CleanComponent implements OnInit, OnDestroy {
            private destroy$ = new Subject<void>();

            ngOnInit() {}

            ngOnDestroy() {
              this.destroy$.next();
              this.destroy$.complete();
            }
          }
        `
      );

      const result = MemoryManagementLaw.check(context);

      expect(result.score).toBe(100);
    });

    it('should reduce score per violation', () => {
      const result = MemoryManagementLaw.check(context);

      if (result.violations!.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not return negative score', () => {
      const result = MemoryManagementLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Message Formatting
  // ============================================
  describe('message formatting', () => {
    it('should include compliance verified message when passed', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'good.component.ts'),
        `export class GoodComponent {}`
      );

      const result = MemoryManagementLaw.check(context);

      if (result.passed) {
        expect(result.message).toContain('compliance verified');
      }
    });

    it('should include violation count in message when failed', () => {
      const result = MemoryManagementLaw.check(context);

      if (!result.passed) {
        expect(result.message).toContain('violation');
      }
    });
  });

  // ============================================
  // Recommendations
  // ============================================
  describe('recommendations', () => {
    it('should include observable recommendations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'service.ts'),
        `export class Service {}`
      );

      const result = MemoryManagementLaw.check(context);

      expect(
        result.suggestions!.some(
          s =>
            s.toLowerCase().includes('observable') ||
            s.toLowerCase().includes('unsubscribe')
        )
      ).toBe(true);
    });

    it('should include event listener recommendations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component.ts'),
        `export class Component {}`
      );

      const result = MemoryManagementLaw.check(context);

      expect(
        result.suggestions!.some(s => s.toLowerCase().includes('event listener'))
      ).toBe(true);
    });

    it('should include timer recommendations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component.ts'),
        `export class Component {}`
      );

      const result = MemoryManagementLaw.check(context);

      expect(
        result.suggestions!.some(
          s =>
            s.toLowerCase().includes('timer') ||
            s.toLowerCase().includes('interval')
        )
      ).toBe(true);
    });

    it('should include DOM reference recommendations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component.ts'),
        `export class Component {}`
      );

      const result = MemoryManagementLaw.check(context);

      expect(
        result.suggestions!.some(s => s.toLowerCase().includes('dom'))
      ).toBe(true);
    });

    it('should include lifecycle recommendations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component.ts'),
        `export class Component {}`
      );

      const result = MemoryManagementLaw.check(context);

      expect(
        result.suggestions!.some(
          s =>
            s.toLowerCase().includes('lifecycle') ||
            s.toLowerCase().includes('destroy')
        )
      ).toBe(true);
    });
  });
});
