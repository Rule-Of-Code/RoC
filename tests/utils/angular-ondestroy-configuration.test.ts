/**
 * @fileoverview Tests for angular-ondestroy-configuration.ts
 * @description Tests for Angular OnDestroy configuration utilities
 */

import { AngularOnDestroyConfiguration } from '../../src/utils/angular/angular-ondestroy/angular-ondestroy-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-ondestroy/angular-ondestroy-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-ondestroy-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should contain component.ts extension', () => {
      expect(AngularOnDestroyConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.component.ts'
      );
    });

    it('should contain directive.ts extension', () => {
      expect(AngularOnDestroyConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.directive.ts'
      );
    });

    it('should contain service.ts extension', () => {
      expect(AngularOnDestroyConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.service.ts'
      );
    });
  });

  describe('DIRECTORIES', () => {
    it('should have SRC directory defined', () => {
      expect(AngularOnDestroyConfiguration.DIRECTORIES.SRC).toBe('src');
    });
  });

  describe('ONDESTROY_PATTERNS', () => {
    it('should have IMPLEMENTS_ONDESTROY as regex', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.IMPLEMENTS_ONDESTROY
      ).toBeInstanceOf(RegExp);
      expect('implements OnDestroy').toMatch(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.IMPLEMENTS_ONDESTROY
      );
    });

    it('should have NG_ON_DESTROY_METHOD', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.NG_ON_DESTROY_METHOD
      ).toBe('ngOnDestroy()');
    });

    it('should have NG_ON_DESTROY_REGEX', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.NG_ON_DESTROY_REGEX
      ).toBeInstanceOf(RegExp);
    });

    it('should have SUBSCRIBE pattern as regex', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SUBSCRIBE
      ).toBeInstanceOf(RegExp);
      expect('subscribe(').toMatch(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SUBSCRIBE
      );
    });

    it('should have SET_INTERVAL_TIMEOUT pattern as regex', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SET_INTERVAL_TIMEOUT
      ).toBeInstanceOf(RegExp);
      expect('setInterval').toMatch(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SET_INTERVAL_TIMEOUT
      );
      expect('setTimeout').toMatch(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SET_INTERVAL_TIMEOUT
      );
    });

    it('should have cleanup keywords', () => {
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.UNSUBSCRIBE).toBe(
        'unsubscribe'
      );
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.COMPLETE).toBe(
        'complete'
      );
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.REMOVE_EVENT_LISTENER
      ).toBe('removeEventListener');
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.CLEAR).toBe(
        'clear'
      );
    });

    it('should have destroy pattern constants', () => {
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.TAKE_UNTIL).toBe(
        'takeUntil'
      );
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.DESTROY_SUBJECT
      ).toBe('destroy$');
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.DESTROY_NEXT
      ).toBe('destroy$.next()');
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.DESTROY_COMPLETE
      ).toBe('destroy$.complete()');
    });

    it('should have SUBSCRIPTION_ARRAY pattern as regex', () => {
      expect(
        AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.SUBSCRIPTION_ARRAY
      ).toBeInstanceOf(RegExp);
    });

    it('should have async patterns', () => {
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.ASYNC).toBe(
        'async'
      );
      expect(AngularOnDestroyConfiguration.ONDESTROY_PATTERNS.AWAIT).toBe(
        'await'
      );
    });
  });

  describe('FILE_CONFIG', () => {
    it('should have ENCODING set to utf8', () => {
      expect(AngularOnDestroyConfiguration.FILE_CONFIG.ENCODING).toBe('utf8');
    });

    it('should have FALLBACK_TO_EMPTY set to true', () => {
      expect(AngularOnDestroyConfiguration.FILE_CONFIG.FALLBACK_TO_EMPTY).toBe(
        true
      );
    });

    it('should have EMPTY_METHOD_THRESHOLD', () => {
      expect(
        AngularOnDestroyConfiguration.FILE_CONFIG.EMPTY_METHOD_THRESHOLD
      ).toBe(10);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    describe('INTERFACE messages', () => {
      it('should have MISSING_METHOD message with placeholder', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.INTERFACE.MISSING_METHOD(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('ngOnDestroy');
      });

      it('should have MISSING_INTERFACE message with placeholder', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.INTERFACE.MISSING_INTERFACE(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('OnDestroy');
      });
    });

    describe('SUGGESTIONS messages', () => {
      it('should have IMPLEMENT_METHOD suggestion', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.SUGGESTIONS.IMPLEMENT_METHOD(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('ngOnDestroy');
      });

      it('should have IMPLEMENT_INTERFACE suggestion', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.SUGGESTIONS.IMPLEMENT_INTERFACE(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('OnDestroy');
      });

      it('should have EMPTY_METHOD suggestion', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.SUGGESTIONS.EMPTY_METHOD(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('empty');
      });
    });

    describe('CLEANUP messages', () => {
      it('should have SUBSCRIPTION cleanup message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.CLEANUP.SUBSCRIPTION(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('subscription');
      });

      it('should have TIMER cleanup message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.CLEANUP.TIMER(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('timer');
      });

      it('should have EVENT_LISTENER cleanup message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.CLEANUP.EVENT_LISTENER(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('event listener');
      });

      it('should have SUBJECTS cleanup message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.CLEANUP.SUBJECTS(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('subjects');
      });
    });

    describe('PATTERNS messages', () => {
      it('should have DESTROY_SUBJECT pattern message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.PATTERNS.DESTROY_SUBJECT(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('destroy$');
      });

      it('should have DESTROY_COMPLETE pattern message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.PATTERNS.DESTROY_COMPLETE(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('destroy$');
      });

      it('should have SUBSCRIPTION_ARRAY pattern message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.PATTERNS.SUBSCRIPTION_ARRAY(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('subscriptions');
      });

      it('should have ASYNC_CLEANUP pattern message', () => {
        const result =
          AngularOnDestroyConfiguration.VALIDATION_MESSAGES.PATTERNS.ASYNC_CLEANUP(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
        expect(result).toContain('async');
      });
    });
  });

  describe('analyzeOnDestroyPatterns', () => {
    it('should detect OnDestroy interface', () => {
      const content = `export class TestComponent implements OnDestroy {}`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.fileName).toBe('test.component.ts');
      expect(result.hasOnDestroyInterface).toBe(true);
    });

    it('should detect ngOnDestroy method', () => {
      const content = `
        ngOnDestroy(): void {
          this.subscription.unsubscribe();
        }
      `;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasNgOnDestroyMethod).toBe(true);
    });

    it('should detect subscriptions', () => {
      const content = `this.data$.subscribe(data => console.log(data));`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasSubscriptions).toBe(true);
    });

    it('should detect timers', () => {
      const content = `setInterval(() => this.tick(), 1000);`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasTimers).toBe(true);
    });

    it('should detect event listeners', () => {
      const content = `document.addEventListener('click', this.handleClick);`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasEventListeners).toBe(true);
    });

    it('should detect subjects', () => {
      const content = `private subject = new Subject<string>();`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasSubjects).toBe(true);
    });

    it('should detect cleanup keywords', () => {
      const content = `
        ngOnDestroy() {
          this.subscription.unsubscribe();
          this.subject.complete();
        }
      `;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasCleanupKeywords).toBe(true);
    });

    it('should detect takeUntil pattern', () => {
      const content = `this.data$.pipe(takeUntil(this.destroy$)).subscribe();`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasTakeUntil).toBe(true);
    });

    it('should detect destroy subject', () => {
      const content = `private destroy$ = new Subject<void>();`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasDestroySubject).toBe(true);
    });

    it('should detect destroy$.next() call', () => {
      const content = `this.destroy$.next();`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasDestroyNext).toBe(true);
    });

    it('should detect destroy$.complete() call', () => {
      const content = `this.destroy$.complete();`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasDestroyComplete).toBe(true);
    });

    it('should detect subscription array pattern', () => {
      const content = `private subscriptions: Subscription[] = [];`;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasSubscriptionArray).toBe(true);
    });

    it('should detect async/await pattern', () => {
      const content = `
        async ngOnInit() {
          const data = await this.service.getData();
        }
      `;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.hasAsync).toBe(true);
    });

    it('should extract ngOnDestroy method body', () => {
      const content = `
        ngOnDestroy(): void {
          this.cleanup();
        }
      `;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'test.component.ts'
      );

      expect(result.ngOnDestroyMethodBody).toBeDefined();
      expect(result.ngOnDestroyMethodBody).toContain('cleanup');
    });

    it('should handle empty content', () => {
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        '',
        'empty.component.ts'
      );

      expect(result.fileName).toBe('empty.component.ts');
      expect(result.hasOnDestroyInterface).toBe(false);
      expect(result.hasNgOnDestroyMethod).toBe(false);
    });

    it('should analyze complete component with proper cleanup', () => {
      const content = `
        import { Component, OnDestroy } from '@angular/core';
        import { Subject, Subscription } from 'rxjs';
        import { takeUntil } from 'rxjs/operators';

        @Component({...})
        export class UserComponent implements OnDestroy {
          private destroy$ = new Subject<void>();
          private subscription: Subscription;

          ngOnInit() {
            this.data$.pipe(takeUntil(this.destroy$)).subscribe();
            setInterval(() => this.tick(), 1000);
          }

          ngOnDestroy(): void {
            this.destroy$.next();
            this.destroy$.complete();
            this.subscription.unsubscribe();
          }
        }
      `;
      const result = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        content,
        'user.component.ts'
      );

      expect(result.hasOnDestroyInterface).toBe(true);
      expect(result.hasNgOnDestroyMethod).toBe(true);
      expect(result.hasSubscriptions).toBe(true);
      expect(result.hasTimers).toBe(true);
      expect(result.hasTakeUntil).toBe(true);
      expect(result.hasDestroySubject).toBe(true);
      expect(result.hasDestroyNext).toBe(true);
      expect(result.hasDestroyComplete).toBe(true);
      expect(result.hasCleanupKeywords).toBe(true);
    });
  });

  describe('buildCleanupSuggestions', () => {
    it('should return empty array when no ngOnDestroy method', () => {
      const patterns = AngularOnDestroyConfiguration.analyzeOnDestroyPatterns(
        'export class TestComponent {}',
        'test.component.ts'
      );

      const suggestions =
        AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

      expect(suggestions).toHaveLength(0);
    });

    it('should suggest subscription cleanup when subscriptions present without cleanup', () => {
      const patterns = {
        fileName: 'test.component.ts',
        hasOnDestroyInterface: true,
        hasNgOnDestroyMethod: true,
        hasSubscriptions: true,
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
      };

      const suggestions =
        AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('subscription');
    });

    it('should suggest timer cleanup when timers present without cleanup', () => {
      const patterns = {
        fileName: 'test.component.ts',
        hasOnDestroyInterface: true,
        hasNgOnDestroyMethod: true,
        hasSubscriptions: false,
        hasTimers: true,
        hasEventListeners: false,
        hasSubjects: false,
        hasCleanupKeywords: false,
        hasTakeUntil: false,
        hasDestroySubject: false,
        hasDestroyNext: false,
        hasDestroyComplete: false,
        hasSubscriptionArray: false,
        hasAsync: false,
      };

      const suggestions =
        AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('timer');
    });

    it('should not suggest cleanup when cleanup keywords present', () => {
      const patterns = {
        fileName: 'test.component.ts',
        hasOnDestroyInterface: true,
        hasNgOnDestroyMethod: true,
        hasSubscriptions: true,
        hasTimers: true,
        hasEventListeners: true,
        hasSubjects: true,
        hasCleanupKeywords: true, // Has cleanup
        hasTakeUntil: true,
        hasDestroySubject: true,
        hasDestroyNext: true,
        hasDestroyComplete: true,
        hasSubscriptionArray: false,
        hasAsync: false,
      };

      const suggestions =
        AngularOnDestroyConfiguration.buildCleanupSuggestions(patterns);

      expect(suggestions).toHaveLength(0);
    });
  });
});
