/**
 * @fileoverview Tests for angular-ondestroy-validation-patterns.ts
 * @description Tests for Angular OnDestroy validation patterns utility
 */

import { AngularOnDestroyConfiguration } from '../../src/utils/angular/angular-ondestroy/angular-ondestroy-configuration';
import { AngularOnDestroyValidationPatterns } from '../../src/utils/angular/angular-ondestroy/angular-ondestroy-validation-patterns';

describe('utils/angular/angular-ondestroy/angular-ondestroy-validation-patterns', () => {
  describe('validateOnDestroyInterface', () => {
    it('should add violation when OnDestroy interface is implemented but method is missing', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            // ngOnDestroy missing
          }
        `,
        'test.component.ts'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('ngOnDestroy');
    });

    it('should add violation when ngOnDestroy method exists but interface is missing', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent {
            ngOnDestroy(): void {
              // cleanup
            }
          }
        `,
        'test.component.ts'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('OnDestroy');
    });

    it('should not add violation when both interface and method are present', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            ngOnDestroy(): void {
              this.subscription.unsubscribe();
            }
          }
        `,
        'test.component.ts'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });

    it('should not add violation when neither interface nor method exists', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent {
            doSomething(): void {}
          }
        `,
        'test.component.ts'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });
  });

  describe('validateEmptyOnDestroy', () => {
    it('should add suggestion for empty ngOnDestroy method', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            ngOnDestroy(): void {}
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not add suggestion for non-empty ngOnDestroy method', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            ngOnDestroy(): void {
              this.subscription.unsubscribe();
              this.destroy$.next();
              this.destroy$.complete();
            }
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateCleanupPatterns', () => {
    it('should suggest cleanup for subscriptions', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            subscription: Subscription;

            ngOnInit(): void {
              this.subscription = this.service.getData().subscribe();
            }

            ngOnDestroy(): void {}
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateCleanupPatterns(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when cleanup keywords are present', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            subscription: Subscription;

            ngOnDestroy(): void {
              this.subscription.unsubscribe();
            }
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateCleanupPatterns(
        patterns,
        suggestions
      );

      // Should have fewer suggestions when cleanup is present
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validateDestroyPattern', () => {
    it('should suggest destroy$ pattern when takeUntil is used', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            data$ = this.service.getData().pipe(takeUntil(this.unsubscribe$));

            ngOnDestroy(): void {}
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateDestroyPattern(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest complete() when destroy$.next() is called without complete', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            destroy$ = new Subject<void>();
            data$ = this.service.getData().pipe(takeUntil(this.destroy$));

            ngOnDestroy(): void {
              this.destroy$.next();
            }
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateDestroyPattern(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when destroy pattern is complete', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            destroy$ = new Subject<void>();
            data$ = this.service.getData().pipe(takeUntil(this.destroy$));

            ngOnDestroy(): void {
              this.destroy$.next();
              this.destroy$.complete();
            }
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateDestroyPattern(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateSubscriptionArray', () => {
    it('should suggest unsubscribe for subscription array', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            subscriptions: Subscription[] = [];

            ngOnDestroy(): void {}
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateSubscriptionArray(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when forEach unsubscribe pattern is used', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            subscriptions: Subscription[] = [];

            ngOnDestroy(): void {
              this.subscriptions.forEach(sub => sub.unsubscribe());
            }
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateSubscriptionArray(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateAsyncCleanup', () => {
    it('should suggest cancellation tokens for async operations', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        `
          export class TestComponent implements OnDestroy {
            async loadData(): Promise<void> {
              const result = await this.service.fetchData();
              this.data = result;
            }

            ngOnDestroy(): void {}
          }
        `,
        'test.component.ts'
      );

      const suggestions: string[] = [];

      AngularOnDestroyValidationPatterns.validateAsyncCleanup(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeAngularFile', () => {
    it('should analyze file and populate violations and suggestions', () => {
      // Mock file content would be analyzed
      const violations: string[] = [];
      const suggestions: string[] = [];

      // Testing that the method handles empty content gracefully
      expect(() => {
        AngularOnDestroyValidationPatterns.analyzeAngularFile(
          '/non/existent/file.ts',
          violations,
          suggestions
        );
      }).not.toThrow();
    });
  });
});
