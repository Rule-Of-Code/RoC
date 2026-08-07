/**
 * @fileoverview Tests for angular-cleanup-configuration.ts
 * @description Tests for Angular cleanup patterns configuration
 */

import { AngularCleanupConfiguration } from '../../src/utils/angular/angular-cleanup/angular-cleanup-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-cleanup/angular-cleanup-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-cleanup-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should contain component.ts extension', () => {
      expect(AngularCleanupConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.component.ts'
      );
    });

    it('should contain directive.ts extension', () => {
      expect(AngularCleanupConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.directive.ts'
      );
    });

    it('should contain service.ts extension', () => {
      expect(AngularCleanupConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.service.ts'
      );
    });

    it('should have exactly 3 extensions', () => {
      expect(AngularCleanupConfiguration.ANGULAR_FILE_EXTENSIONS).toHaveLength(
        3
      );
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    describe('SUBSCRIPTIONS_WITHOUT_ONDESTROY', () => {
      it('should return violation and suggestion with file name', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.SUBSCRIPTIONS_WITHOUT_ONDESTROY(
            'user.component.ts'
          );

        expect(result.violationMessage).toContain('user.component.ts');
        expect(result.violationMessage).toContain('OnDestroy');
        expect(result.suggestionMessage).toContain('user.component.ts');
        expect(result.suggestionMessage).toContain('OnDestroy');
      });
    });

    describe('SUBSCRIPTIONS_WITHOUT_CLEANUP', () => {
      it('should mention unsubscribe or takeUntil', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.SUBSCRIPTIONS_WITHOUT_CLEANUP(
            'test.component.ts'
          );

        expect(result.violationMessage).toContain('test.component.ts');
        expect(result.suggestionMessage).toMatch(/unsubscribe|takeUntil/i);
      });
    });

    describe('TIMERS_WITHOUT_ONDESTROY', () => {
      it('should reference timer cleanup', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.TIMERS_WITHOUT_ONDESTROY(
            'timer.component.ts'
          );

        expect(result.violationMessage).toContain('timer.component.ts');
        expect(result.suggestionMessage).toContain('timer');
      });
    });

    describe('EVENT_LISTENERS_WITHOUT_CLEANUP', () => {
      it('should suggest cleanup in ngOnDestroy', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.EVENT_LISTENERS_WITHOUT_CLEANUP(
            'event.component.ts'
          );

        expect(result.suggestionMessage).toContain('event.component.ts');
        expect(result.suggestionMessage).toContain('ngOnDestroy');
      });
    });

    describe('SUBJECTS_WITHOUT_COMPLETION', () => {
      it('should suggest completing subjects', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.SUBJECTS_WITHOUT_COMPLETION(
            'subject.component.ts'
          );

        expect(result.suggestionMessage).toContain('subject.component.ts');
        expect(result.suggestionMessage).toContain('Complete');
      });
    });

    describe('TAKEUNTIL_WITHOUT_DESTROY_SUBJECT', () => {
      it('should suggest destroy subject pattern', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.TAKEUNTIL_WITHOUT_DESTROY_SUBJECT(
            'takeuntil.component.ts'
          );

        expect(result.suggestionMessage).toContain('takeuntil.component.ts');
        expect(result.suggestionMessage).toContain('destroy$');
      });
    });

    describe('MANUAL_SUBSCRIPTION_WITHOUT_UNSUBSCRIBE', () => {
      it('should reference subscription cleanup', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.MANUAL_SUBSCRIPTION_WITHOUT_UNSUBSCRIBE(
            'manual.component.ts'
          );

        expect(result.violationMessage).toContain('manual.component.ts');
        expect(result.suggestionMessage).toContain('unsubscribe');
      });
    });

    describe('CONSIDER_ASYNC_PIPE', () => {
      it('should suggest async pipe', () => {
        const result =
          AngularCleanupConfiguration.VALIDATION_MESSAGES.CONSIDER_ASYNC_PIPE(
            'async.component.ts'
          );

        expect(result.suggestionMessage).toContain('async pipe');
      });
    });
  });

  describe('PATTERN_DETECTORS', () => {
    describe('hasSubscriptions', () => {
      it('should detect subscribe() calls', () => {
        const content = `this.observable$.subscribe(data => console.log(data));`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubscriptions(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect pipe syntax', () => {
        const content = `this.data$ = this.service.getData().pipe(map(x => x));`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubscriptions(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no subscriptions', () => {
        const content = `const x = 5;`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubscriptions(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasOnDestroy', () => {
      it('should detect implements OnDestroy', () => {
        const content = `export class TestComponent implements OnDestroy {}`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasOnDestroy(content);

        expect(result).toBe(true);
      });

      it('should detect ngOnDestroy method', () => {
        const content = `ngOnDestroy() { this.subscription.unsubscribe(); }`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasOnDestroy(content);

        expect(result).toBe(true);
      });

      it('should return false when not implemented', () => {
        const content = `export class TestComponent implements OnInit {}`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasOnDestroy(content);

        expect(result).toBe(false);
      });
    });

    describe('hasTimers', () => {
      it('should detect setInterval', () => {
        const content = `setInterval(() => console.log('tick'), 1000);`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTimers(content);

        expect(result).toBe(true);
      });

      it('should detect setTimeout', () => {
        const content = `setTimeout(() => this.doSomething(), 500);`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTimers(content);

        expect(result).toBe(true);
      });

      it('should detect rxjs timer', () => {
        const content = `timer(1000).subscribe();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTimers(content);

        expect(result).toBe(true);
      });

      it('should detect rxjs interval', () => {
        const content = `interval(1000).subscribe();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTimers(content);

        expect(result).toBe(true);
      });

      it('should return false for no timers', () => {
        const content = `const x = 5;`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTimers(content);

        expect(result).toBe(false);
      });
    });

    describe('hasEventListeners', () => {
      it('should detect addEventListener', () => {
        const content = `document.addEventListener('click', this.handleClick);`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasEventListeners(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect fromEvent', () => {
        const content = `fromEvent(window, 'resize').subscribe();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasEventListeners(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no event listeners', () => {
        const content = `const x = 5;`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasEventListeners(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasSubjects', () => {
      it('should detect Subject usage', () => {
        const content = `private mySubject = new Subject<string>();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubjects(content);

        expect(result).toBe(true);
      });

      it('should return false for no subjects', () => {
        const content = `private data: string;`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubjects(content);

        expect(result).toBe(false);
      });
    });

    describe('hasSubjectCompletion', () => {
      it('should detect complete() call', () => {
        const content = `this.destroy$.complete();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubjectCompletion(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no completion', () => {
        const content = `this.destroy$.next();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasSubjectCompletion(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasTakeUntil', () => {
      it('should detect takeUntil', () => {
        const content = `this.data$.pipe(takeUntil(this.destroy$)).subscribe();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTakeUntil(content);

        expect(result).toBe(true);
      });

      it('should return false for no takeUntil', () => {
        const content = `this.data$.subscribe();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasTakeUntil(content);

        expect(result).toBe(false);
      });
    });

    describe('hasDestroySubject', () => {
      it('should detect destroy$ subject', () => {
        const content = `private destroy$ = new Subject<void>();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasDestroySubject(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no destroy subject', () => {
        const content = `private data$ = new Subject<string>();`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasDestroySubject(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasManualSubscriptions', () => {
      it('should detect Subscription with subscribe', () => {
        const content = `
          private subscription: Subscription;
          ngOnInit() { this.subscription = this.data$.subscribe(); }
        `;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasManualSubscriptions(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for async pipe only', () => {
        const content = `<div>{{ data$ | async }}</div>`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasManualSubscriptions(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasAsyncPipe', () => {
      it('should detect async pipe', () => {
        const content = `<div>{{ data$ | async }}</div>`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasAsyncPipe(content);

        expect(result).toBe(true);
      });

      it('should return false for no async pipe', () => {
        const content = `<div>{{ data }}</div>`;

        const result =
          AngularCleanupConfiguration.PATTERN_DETECTORS.hasAsyncPipe(content);

        expect(result).toBe(false);
      });
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze all patterns in content with subscriptions', () => {
      const content = `
        export class TestComponent implements OnDestroy {
          private destroy$ = new Subject<void>();

          ngOnInit() {
            this.data$.pipe(takeUntil(this.destroy$)).subscribe();
          }

          ngOnDestroy() {
            this.destroy$.next();
            this.destroy$.complete();
          }
        }
      `;

      const result = AngularCleanupConfiguration.analyzePatterns(content);

      expect(result.hasSubscriptions).toBe(true);
      expect(result.hasOnDestroy).toBe(true);
      expect(result.hasTakeUntil).toBe(true);
      expect(result.hasDestroySubject).toBe(true);
      expect(result.hasSubjectCompletion).toBe(true);
    });

    it('should detect patterns for component with timers', () => {
      const content = `
        export class TimerComponent {
          ngOnInit() {
            setInterval(() => console.log('tick'), 1000);
          }
        }
      `;

      const result = AngularCleanupConfiguration.analyzePatterns(content);

      expect(result.hasTimers).toBe(true);
      expect(result.hasOnDestroy).toBe(false);
    });

    it('should detect patterns for component with event listeners', () => {
      const content = `
        export class EventComponent {
          ngOnInit() {
            document.addEventListener('click', this.handleClick);
          }
        }
      `;

      const result = AngularCleanupConfiguration.analyzePatterns(content);

      expect(result.hasEventListeners).toBe(true);
      expect(result.hasOnDestroy).toBe(false);
    });

    it('should return all false for clean content', () => {
      const content = `
        export class SimpleComponent {
          data = 'hello';
        }
      `;

      const result = AngularCleanupConfiguration.analyzePatterns(content);

      expect(result.hasSubscriptions).toBe(false);
      expect(result.hasOnDestroy).toBe(false);
      expect(result.hasTimers).toBe(false);
      expect(result.hasEventListeners).toBe(false);
      expect(result.hasSubjects).toBe(false);
    });

    it('should handle empty content', () => {
      const result = AngularCleanupConfiguration.analyzePatterns('');

      expect(result.hasSubscriptions).toBe(false);
      expect(result.hasOnDestroy).toBe(false);
    });
  });
});
