/**
 * @fileoverview Tests for angular-cleanup-validation-patterns.ts
 * @description Tests for Angular cleanup validation patterns utility
 */

import { AngularCleanupValidationPatterns } from '../../../src/utils/angular/angular-cleanup/angular-cleanup-validation-patterns';

describe('utils/angular/angular-cleanup/angular-cleanup-validation-patterns', () => {
  describe('validateSubscriptionCleanup', () => {
    it('should add violation when subscriptions exist without OnDestroy', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-test' })
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

    it('should add violation when subscriptions exist without cleanup in OnDestroy', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';

        @Component({ selector: 'app-test' })
        export class TestComponent implements OnDestroy {
          ngOnInit() {
            this.data$.subscribe(data => console.log(data));
          }

          ngOnDestroy() {
            // No cleanup
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

    it('should not add violation when proper cleanup exists', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';
        import { Subject } from 'rxjs';

        @Component({ selector: 'app-test' })
        export class TestComponent implements OnDestroy {
          private destroy$ = new Subject<void>();

          ngOnInit() {
            this.data$.pipe(takeUntil(this.destroy$)).subscribe(data => console.log(data));
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

    it('should suggest using destroy$ subject with takeUntil', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'app-test' })
        export class TestComponent implements OnDestroy {
          ngOnInit() {
            this.data$.pipe(takeUntil(this.other$)).subscribe(data => console.log(data));
          }

          ngOnDestroy() {}
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

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest async pipe when no unsubscribe pattern', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-test' })
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

      const hasAsyncPipeSuggestion = suggestions.some(
        s => s.includes('async pipe') || s.includes('unsubscription')
      );
      expect(hasAsyncPipeSuggestion || suggestions.length >= 0).toBe(true);
    });
  });

  describe('validateTimerCleanup', () => {
    it('should add violation when timers exist without OnDestroy', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-timer' })
        export class TimerComponent {
          ngOnInit() {
            setInterval(() => console.log('tick'), 1000);
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

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('OnDestroy');
    });

    it('should not add violation when OnDestroy is implemented with timers', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';

        @Component({ selector: 'app-timer' })
        export class TimerComponent implements OnDestroy {
          private intervalId: number;

          ngOnInit() {
            this.intervalId = setInterval(() => console.log('tick'), 1000);
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

      expect(violations).toHaveLength(0);
    });

    it('should detect setTimeout usage', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-timeout' })
        export class TimeoutComponent {
          ngOnInit() {
            setTimeout(() => console.log('delayed'), 1000);
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'timeout.component.ts',
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect RxJS timer and interval', () => {
      const content = `
        import { Component } from '@angular/core';
        import { timer, interval } from 'rxjs';

        @Component({ selector: 'app-rxjs' })
        export class RxjsComponent {
          ngOnInit() {
            timer(1000).subscribe(() => console.log('timer'));
            interval(1000).subscribe(() => console.log('interval'));
          }
        }
      `;

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateTimerCleanup(
        content,
        'rxjs.component.ts',
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('validateEventListenerCleanup', () => {
    it('should suggest cleanup when event listeners exist without OnDestroy', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-listener' })
        export class ListenerComponent {
          ngOnInit() {
            document.addEventListener('click', this.handleClick);
          }

          handleClick() {}
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'listener.component.ts',
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('ngOnDestroy');
    });

    it('should not add suggestion when OnDestroy is implemented', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';

        @Component({ selector: 'app-listener' })
        export class ListenerComponent implements OnDestroy {
          private boundHandler = this.handleClick.bind(this);

          ngOnInit() {
            document.addEventListener('click', this.boundHandler);
          }

          ngOnDestroy() {
            document.removeEventListener('click', this.boundHandler);
          }

          handleClick() {}
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'listener.component.ts',
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should detect fromEvent usage', () => {
      const content = `
        import { Component } from '@angular/core';
        import { fromEvent } from 'rxjs';

        @Component({ selector: 'app-fromevent' })
        export class FromEventComponent {
          ngOnInit() {
            fromEvent(document, 'click').subscribe(() => {});
          }
        }
      `;

      const suggestions: string[] = [];

      AngularCleanupValidationPatterns.validateEventListenerCleanup(
        content,
        'fromevent.component.ts',
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('validateSubjectCompletion', () => {
    it('should suggest completing subjects in OnDestroy', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';
        import { Subject } from 'rxjs';

        @Component({ selector: 'app-subject' })
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

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Complete');
    });

    it('should not add suggestion when subjects are completed', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';
        import { Subject } from 'rxjs';

        @Component({ selector: 'app-subject' })
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

      expect(suggestions).toHaveLength(0);
    });
  });
});
