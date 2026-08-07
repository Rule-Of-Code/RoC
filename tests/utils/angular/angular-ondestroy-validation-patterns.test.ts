/**
 * @fileoverview Tests for angular-ondestroy-validation-patterns.ts
 * @description Tests for Angular OnDestroy validation patterns utility
 */

import { AngularOnDestroyConfiguration } from '../../../src/utils/angular/angular-ondestroy/angular-ondestroy-configuration';
import { AngularOnDestroyValidationPatterns } from '../../../src/utils/angular/angular-ondestroy/angular-ondestroy-validation-patterns';

describe('utils/angular/angular-ondestroy/angular-ondestroy-validation-patterns', () => {
  describe('AngularOnDestroyValidationPatterns', () => {
    const createPatterns = (
      overrides: Partial<
        ReturnType<
          typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
        >
      > = {}
    ) => ({
      fileName: 'test.component.ts',
      hasOnDestroyInterface: false,
      hasNgOnDestroyMethod: false,
      hasSubscriptions: false,
      hasTimers: false,
      hasEventListeners: false,
      hasSubjects: false,
      hasCleanupKeywords: false,
      hasTakeUntil: false,
      hasDestroySubject: false,
      hasDestroyNext: false,
      hasDestroyComplete: false,
      hasSubscriptionArray: false,
      hasAsync: false,
      ngOnDestroyMethodBody: undefined,
      ...overrides,
    });

    describe('validateOnDestroyInterface', () => {
      it('should add violation when interface exists without method', () => {
        const patterns = createPatterns({
          hasOnDestroyInterface: true,
          hasNgOnDestroyMethod: false,
        });
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
          patterns,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('ngOnDestroy');
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should add violation when method exists without interface', () => {
        const patterns = createPatterns({
          hasOnDestroyInterface: false,
          hasNgOnDestroyMethod: true,
        });
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
          patterns,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('OnDestroy');
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add violations when both interface and method exist', () => {
        const patterns = createPatterns({
          hasOnDestroyInterface: true,
          hasNgOnDestroyMethod: true,
        });
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
          patterns,
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should not add violations when neither interface nor method exist', () => {
        const patterns = createPatterns({
          hasOnDestroyInterface: false,
          hasNgOnDestroyMethod: false,
        });
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateOnDestroyInterface(
          patterns,
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });
    });

    describe('validateEmptyOnDestroy', () => {
      it('should add suggestion for empty ngOnDestroy method', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody: '// ',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should add suggestion for very short ngOnDestroy method', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody: '// ',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add suggestion when ngOnDestroy has content', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody: 'this.subscription.unsubscribe();',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should not add suggestion when no ngOnDestroy method', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: false,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateEmptyOnDestroy(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('validateCleanupPatterns', () => {
      it('should add suggestions when ngOnDestroy exists', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: true,
          hasSubscriptions: true,
          hasCleanupKeywords: false,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateCleanupPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not add suggestions when no ngOnDestroy method', () => {
        const patterns = createPatterns({
          hasNgOnDestroyMethod: false,
          hasSubscriptions: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateCleanupPatterns(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('validateDestroyPattern', () => {
      it('should suggest destroy$ subject when takeUntil without destroy$', () => {
        const patterns = createPatterns({
          hasTakeUntil: true,
          hasNgOnDestroyMethod: true,
          hasDestroySubject: false,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateDestroyPattern(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]).toContain('destroy$');
      });

      it('should suggest complete when next called without complete', () => {
        const patterns = createPatterns({
          hasTakeUntil: true,
          hasNgOnDestroyMethod: true,
          hasDestroySubject: true,
          hasDestroyNext: true,
          hasDestroyComplete: false,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateDestroyPattern(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]).toContain('Complete');
      });

      it('should not add suggestions when destroy pattern is complete', () => {
        const patterns = createPatterns({
          hasTakeUntil: true,
          hasNgOnDestroyMethod: true,
          hasDestroySubject: true,
          hasDestroyNext: true,
          hasDestroyComplete: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateDestroyPattern(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should not add suggestions when no takeUntil usage', () => {
        const patterns = createPatterns({
          hasTakeUntil: false,
          hasNgOnDestroyMethod: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateDestroyPattern(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('validateSubscriptionArray', () => {
      it('should suggest cleanup when subscription array without forEach/unsubscribe', () => {
        const patterns = createPatterns({
          hasSubscriptionArray: true,
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody: 'console.log("cleanup");',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateSubscriptionArray(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not suggest when forEach is used in ngOnDestroy', () => {
        const patterns = createPatterns({
          hasSubscriptionArray: true,
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody:
            'this.subscriptions.forEach(s => s.unsubscribe());',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateSubscriptionArray(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should not suggest when unsubscribe is used in ngOnDestroy', () => {
        const patterns = createPatterns({
          hasSubscriptionArray: true,
          hasNgOnDestroyMethod: true,
          ngOnDestroyMethodBody: 'this.sub.unsubscribe();',
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateSubscriptionArray(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should not suggest when no subscription array', () => {
        const patterns = createPatterns({
          hasSubscriptionArray: false,
          hasNgOnDestroyMethod: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateSubscriptionArray(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('validateAsyncCleanup', () => {
      it('should suggest cancellation tokens for async operations', () => {
        const patterns = createPatterns({
          hasAsync: true,
          hasNgOnDestroyMethod: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateAsyncCleanup(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]).toContain('async');
      });

      it('should not suggest when no async operations', () => {
        const patterns = createPatterns({
          hasAsync: false,
          hasNgOnDestroyMethod: true,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateAsyncCleanup(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should not suggest when no ngOnDestroy method', () => {
        const patterns = createPatterns({
          hasAsync: true,
          hasNgOnDestroyMethod: false,
        });
        const suggestions: string[] = [];

        AngularOnDestroyValidationPatterns.validateAsyncCleanup(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });
    });
  });

  describe('AngularOnDestroyConfiguration', () => {
    describe('analyzeOnDestroyPatterns', () => {
      it('should detect OnDestroy interface', () => {
        const content = 'export class TestComponent implements OnDestroy {}';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasOnDestroyInterface).toBe(true);
        expect(result.fileName).toBe('test.component.ts');
      });

      it('should detect ngOnDestroy method', () => {
        const content = 'ngOnDestroy() { this.sub.unsubscribe(); }';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasNgOnDestroyMethod).toBe(true);
      });

      it('should detect subscriptions', () => {
        const content = 'this.service.getData().subscribe(data => {});';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasSubscriptions).toBe(true);
      });

      it('should detect timers', () => {
        const content = 'setInterval(() => {}, 1000);';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasTimers).toBe(true);
      });

      it('should detect event listeners', () => {
        const content = "window.addEventListener('resize', this.onResize);";
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasEventListeners).toBe(true);
      });

      it('should detect subjects', () => {
        const content = 'private destroy$ = new Subject<void>();';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasSubjects).toBe(true);
      });

      it('should detect takeUntil pattern', () => {
        const content = '.pipe(takeUntil(this.destroy$))';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasTakeUntil).toBe(true);
      });

      it('should detect destroy$ subject', () => {
        const content = 'private destroy$ = new Subject();';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasDestroySubject).toBe(true);
      });

      it('should detect cleanup keywords', () => {
        const content = 'this.subscription.unsubscribe();';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasCleanupKeywords).toBe(true);
      });

      it('should detect subscription array pattern', () => {
        const content = 'private subscriptions: Subscription[] = [];';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasSubscriptionArray).toBe(true);
      });

      it('should detect async/await pattern', () => {
        const content = 'async ngOnInit() { await this.loadData(); }';
        const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          content,
          'test.component.ts'
        );

        expect(result.hasAsync).toBe(true);
      });
    });

    describe('buildCleanupSuggestions', () => {
      it('should build subscription cleanup suggestion', () => {
        const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          `
            ngOnDestroy(): void {}
            subscribe(
          `,
          'test.component.ts'
        );
        const suggestions =
          AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should return empty when no ngOnDestroy method', () => {
        const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          'subscribe(',
          'test.component.ts'
        );
        const suggestions =
          AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

        expect(suggestions).toHaveLength(0);
      });

      it('should not add suggestions when cleanup keywords exist', () => {
        const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
          `
            ngOnDestroy(): void { this.subscription.unsubscribe(); }
            subscribe(
          `,
          'test.component.ts'
        );
        const suggestions =
          AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

        expect(suggestions).toHaveLength(0);
      });
    });
  });
});
