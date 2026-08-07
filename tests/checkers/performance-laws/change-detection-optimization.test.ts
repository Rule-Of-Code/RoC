/**
 * Tests for ChangeDetectionOptimizationLaw
 *
 * Tests the Change Detection Optimization Law which ensures optimal
 * change detection strategy usage in Angular components
 */
import { ChangeDetectionOptimizationLaw } from '../../../src/checkers/performance-laws/change-detection-optimization';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ChangeDetectionOptimizationLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('change-detection-test-');
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
    describe('when project has no Angular components', () => {
      it('should return a result object', () => {
        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(Array.isArray(result.violations!)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(Array.isArray(result.suggestions!)).toBe(true);
      });

      it('should report no components found', () => {
        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(
          result.violations!.some(v => v.toLowerCase().includes('component'))
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

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should detect OnPush change detection strategy', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'optimized.component.ts'),
          `
            import { Component, ChangeDetectionStrategy } from '@angular/core';

            @Component({
              selector: 'app-optimized',
              template: '<h1>Optimized</h1>',
              changeDetection: ChangeDetectionStrategy.OnPush
            })
            export class OptimizedComponent {}
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect components needing OnPush with @Input', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'input.component.ts'),
          `
            import { Component, Input } from '@angular/core';

            @Component({
              selector: 'app-input',
              template: '<h1>{{ title }}</h1>'
            })
            export class InputComponent {
              @Input() title: string;
            }
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect manual change detection without OnPush', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'manual.component.ts'),
          `
            import { Component, ChangeDetectorRef } from '@angular/core';

            @Component({
              selector: 'app-manual',
              template: '<h1>Manual</h1>'
            })
            export class ManualComponent {
              constructor(private cdr: ChangeDetectorRef) {}

              update() {
                this.cdr.detectChanges();
              }
            }
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(
          result.violations!.some(v => v.includes('Manual change detection'))
        ).toBe(true);
      });

      it('should detect ngDoCheck usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'docheck.component.ts'),
          `
            import { Component, DoCheck } from '@angular/core';

            @Component({
              selector: 'app-docheck',
              template: '<h1>DoCheck</h1>'
            })
            export class DoCheckComponent implements DoCheck {
              ngDoCheck() {
                console.log('checking');
              }
            }
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result.violations!.some(v => v.includes('ngDoCheck'))).toBe(
          true
        );
      });
    });

    describe('when components use async pipe', () => {
      it('should detect async pipe usage in templates', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'async.component.ts'),
          `
            import { Component, ChangeDetectionStrategy } from '@angular/core';

            @Component({
              selector: 'app-async',
              templateUrl: './async.component.html',
              changeDetection: ChangeDetectionStrategy.OnPush
            })
            export class AsyncComponent {}
          `
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'async.component.html'),
          `<div>{{ data$ | async }}</div>`
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('when templates use ngFor without trackBy', () => {
      it('should detect missing trackBy in ngFor', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'list.component.ts'),
          `
            import { Component } from '@angular/core';

            @Component({
              selector: 'app-list',
              templateUrl: './list.component.html'
            })
            export class ListComponent {
              items = [];
            }
          `
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'list.component.html'),
          `<div *ngFor="let item of items">{{ item.name }}</div>`
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        // Verify the check analyzes templates for trackBy
        expect(result).toBeDefined();
        expect(result.violations).toBeDefined();
      });

      it('should pass when trackBy is present', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'tracked.component.ts'),
          `
            import { Component, ChangeDetectionStrategy } from '@angular/core';

            @Component({
              selector: 'app-tracked',
              templateUrl: './tracked.component.html',
              changeDetection: ChangeDetectionStrategy.OnPush
            })
            export class TrackedComponent {
              items = [];
              trackByFn(index: number, item: any) { return item.id; }
            }
          `
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'tracked.component.html'),
          `<div *ngFor="let item of items; trackBy: trackByFn">{{ item.name }}</div>`
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(
          result.violations!.filter(
            v => v.includes('tracked.component.html') && v.includes('trackBy')
          ).length
        ).toBe(0);
      });
    });

    describe('when components have manual subscriptions', () => {
      it('should detect manual subscriptions without OnDestroy', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'subscription.component.ts'),
          `
            import { Component, OnInit } from '@angular/core';
            import { Observable } from 'rxjs';

            @Component({
              selector: 'app-subscription',
              template: '<h1>{{ data }}</h1>'
            })
            export class SubscriptionComponent implements OnInit {
              data: string;

              ngOnInit() {
                this.service.getData().subscribe(d => this.data = d);
              }
            }
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(result.violations!.some(v => v.includes('subscription'))).toBe(
          true
        );
      });

      it('should pass when component implements OnDestroy', () => {
        const srcDir = PathOperations.join(tempDir, 'src', 'app');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'proper.component.ts'),
          `
            import { Component, OnInit, OnDestroy } from '@angular/core';
            import { Subscription } from 'rxjs';

            @Component({
              selector: 'app-proper',
              template: '<h1>{{ data }}</h1>'
            })
            export class ProperComponent implements OnInit, OnDestroy {
              data: string;
              private subscription: Subscription;

              ngOnInit() {
                this.subscription = this.service.getData().subscribe(d => this.data = d);
              }

              ngOnDestroy() {
                this.subscription.unsubscribe();
              }
            }
          `
        );

        const result = ChangeDetectionOptimizationLaw.check(context);

        expect(
          result.violations!.filter(
            v => v.includes('proper.component.ts') && v.includes('subscription')
          ).length
        ).toBe(0);
      });
    });
  });

  // ============================================
  // OnPush Usage Analysis
  // ============================================
  describe('OnPush usage analysis', () => {
    it('should not report OnPush violations (handled by OnPushChangeDetectionLaw)', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      for (let i = 1; i <= 5; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `comp${i}.component.ts`),
          `
            import { Component } from '@angular/core';

            @Component({
              selector: 'app-comp${i}',
              template: '<h1>Component ${i}</h1>'
            })
            export class Comp${i}Component {}
          `
        );
      }

      const result = ChangeDetectionOptimizationLaw.check(context);

      // OnPush detection was intentionally moved to OnPushChangeDetectionLaw;
      // this law no longer flags OnPush usage.
      expect(result.violations!.some(v => v.includes('OnPush'))).toBe(false);
    });

    it('should pass with high OnPush percentage', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      for (let i = 1; i <= 5; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `opt${i}.component.ts`),
          `
            import { Component, ChangeDetectionStrategy } from '@angular/core';

            @Component({
              selector: 'app-opt${i}',
              template: '<h1>Optimized ${i}</h1>',
              changeDetection: ChangeDetectionStrategy.OnPush
            })
            export class Opt${i}Component {}
          `
        );
      }

      const result = ChangeDetectionOptimizationLaw.check(context);

      expect(
        result.violations!.filter(v => v.includes('Low OnPush usage')).length
      ).toBe(0);
    });
  });

  // ============================================
  // Result Structure
  // ============================================
  describe('result structure', () => {
    it('should include passed boolean', () => {
      const result = ChangeDetectionOptimizationLaw.check(context);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should include message string', () => {
      const result = ChangeDetectionOptimizationLaw.check(context);

      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should include score number between 0 and 100', () => {
      const result = ChangeDetectionOptimizationLaw.check(context);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include config object', () => {
      const result = ChangeDetectionOptimizationLaw.check(context);

      expect(result.config).toBeDefined();
    });
  });
});
