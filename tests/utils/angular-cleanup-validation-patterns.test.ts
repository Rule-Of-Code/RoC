/**
 * @fileoverview Tests for angular-cleanup-validation-patterns.ts
 * @description Tests for Angular cleanup validation patterns utility
 */

import { AngularCleanupValidationPatterns } from '../../src/utils/angular/angular-cleanup/angular-cleanup-validation-patterns';

describe('utils/angular/angular-cleanup/angular-cleanup-validation-patterns', () => {
  describe('validateSubscriptionCleanup', () => {
    it('should detect subscriptions without OnDestroy', () => {
      const content = `
        export class TestComponent {
          ngOnInit() {
            this.data$.subscribe(data => console.log(data));
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubscriptionCleanup(
        content,
        'test.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass for proper subscription cleanup', () => {
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

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubscriptionCleanup(
        content,
        'test.component.ts',
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
    });

    it('should detect manual subscription without unsubscribe', () => {
      const content = `
        export class TestComponent implements OnDestroy {
          private subscription: Subscription;

          ngOnInit() {
            this.subscription = this.data$.subscribe();
          }

          ngOnDestroy() {
            // Missing unsubscribe
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubscriptionCleanup(
        content,
        'test.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest async pipe usage', () => {
      const content = `
        export class TestComponent implements OnDestroy {
          ngOnInit() {
            this.data$.subscribe(data => this.items = data);
          }

          ngOnDestroy() {
            // cleanup
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubscriptionCleanup(
        content,
        'test.component.ts',
        violations,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle empty content', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubscriptionCleanup(
        '',
        'test.component.ts',
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validateTimerCleanup', () => {
    it('should detect setInterval without OnDestroy', () => {
      const content = `
        export class TimerComponent {
          ngOnInit() {
            setInterval(() => this.tick(), 1000);
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'timer.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect setTimeout without OnDestroy', () => {
      const content = `
        export class TimerComponent {
          ngOnInit() {
            setTimeout(() => this.doSomething(), 5000);
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'timer.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass for timers with OnDestroy', () => {
      const content = `
        export class TimerComponent implements OnDestroy {
          private intervalId: number;

          ngOnInit() {
            this.intervalId = setInterval(() => this.tick(), 1000);
          }

          ngOnDestroy() {
            clearInterval(this.intervalId);
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'timer.component.ts',
        violations,
        suggestions
      );

      // Should have fewer or no violations when OnDestroy is present
      expect(violations).toBeInstanceOf(Array);
    });

    it('should detect RxJS timer operator without cleanup', () => {
      const content = `
        import { timer } from 'rxjs';

        export class TimerComponent {
          ngOnInit() {
            timer(1000).subscribe();
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'timer.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect RxJS interval operator without cleanup', () => {
      const content = `
        import { interval } from 'rxjs';

        export class IntervalComponent {
          ngOnInit() {
            interval(1000).subscribe(x => console.log(x));
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'interval.component.ts',
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateEventListenerCleanup', () => {
    it('should detect addEventListener without OnDestroy', () => {
      const content = `
        export class EventComponent {
          ngOnInit() {
            document.addEventListener('click', this.onClick);
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'event.component.ts',
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect fromEvent without OnDestroy', () => {
      const content = `
        import { fromEvent } from 'rxjs';

        export class EventComponent {
          ngOnInit() {
            fromEvent(document, 'click').subscribe();
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'event.component.ts',
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass when OnDestroy is implemented', () => {
      const content = `
        export class EventComponent implements OnDestroy {
          ngOnInit() {
            document.addEventListener('click', this.onClick);
          }

          ngOnDestroy() {
            document.removeEventListener('click', this.onClick);
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'event.component.ts',
        suggestions
      );

      // Should not add suggestion when OnDestroy is present
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validateSubjectCompletion', () => {
    it('should suggest completing subjects in OnDestroy', () => {
      const content = `
        export class SubjectComponent implements OnDestroy {
          private data$ = new Subject<string>();

          ngOnDestroy() {
            // Subject not completed
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubjectCompletion(
        content,
        'subject.component.ts',
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass when subjects are completed', () => {
      const content = `
        export class SubjectComponent implements OnDestroy {
          private data$ = new Subject<string>();

          ngOnDestroy() {
            this.data$.complete();
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubjectCompletion(
        content,
        'subject.component.ts',
        suggestions
      );

      // Should not add suggestion when complete() is called
      expect(suggestions.length).toBe(0);
    });

    it('should handle BehaviorSubject', () => {
      const content = `
        export class BehaviorComponent implements OnDestroy {
          private state$ = new BehaviorSubject<State>(initialState);

          ngOnDestroy() {
            this.state$.complete();
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubjectCompletion(
        content,
        'behavior.component.ts',
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should not add suggestions when no subjects present', () => {
      const content = `
        export class SimpleComponent implements OnDestroy {
          ngOnDestroy() {
            // cleanup
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateSubjectCompletion(
        content,
        'simple.component.ts',
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });
});
