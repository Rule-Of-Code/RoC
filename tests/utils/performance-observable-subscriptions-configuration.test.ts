/**
 * @fileoverview Tests for observable-subscriptions-configuration.ts
 * @description Tests for Observable Subscriptions configuration utilities
 */

import { FileUtils } from '../../src/utils/file-utils';
import { ObservableSubscriptionsConfiguration } from '../../src/utils/performance/observable-subscriptions/observable-subscriptions-configuration';

describe('utils/performance/observable-subscriptions/observable-subscriptions-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('observable-subs-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('SUBSCRIPTION_PATTERNS constants', () => {
    it('should have SUBSCRIBE pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS.SUBSCRIBE
      ).toBe('subscribe(');
    });

    it('should have PIPE_SUBSCRIBE pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
          .PIPE_SUBSCRIBE
      ).toEqual(/\.pipe\(.*?\)\.subscribe/g);
    });

    it('should have PROPERTY_SUBSCRIBE pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
          .PROPERTY_SUBSCRIBE
      ).toEqual(/this\.[\w]+\s*=.*?\.subscribe/g);
    });

    it('should have SIMPLE_SUBSCRIBE pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
          .SIMPLE_SUBSCRIBE
      ).toEqual(/\.subscribe\(.*?\)/g);
    });

    it('should have UNSUBSCRIBE pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS.UNSUBSCRIBE
      ).toBe('unsubscribe()');
    });

    it('should have TAKE_UNTIL pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS.TAKE_UNTIL
      ).toBe('takeUntil');
    });

    it('should have exactly 6 subscription patterns', () => {
      const patterns = Object.keys(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
      );
      expect(patterns).toHaveLength(6);
    });

    it('should match pipe subscribe in content', () => {
      const content = 'this.data$.pipe(map(x => x)).subscribe()';
      const regex = new RegExp(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
          .PIPE_SUBSCRIBE.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should match property subscribe assignment', () => {
      const content = 'this.subscription = this.data$.subscribe()';
      const regex = new RegExp(
        ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
          .PROPERTY_SUBSCRIBE.source
      );
      expect(regex.test(content)).toBe(true);
    });
  });

  describe('LIFECYCLE_PATTERNS constants', () => {
    it('should have IMPLEMENTS_ON_DESTROY pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.LIFECYCLE_PATTERNS
          .IMPLEMENTS_ON_DESTROY
      ).toBe('implements OnDestroy');
    });

    it('should have NG_ON_DESTROY pattern', () => {
      expect(
        ObservableSubscriptionsConfiguration.LIFECYCLE_PATTERNS.NG_ON_DESTROY
      ).toBe('ngOnDestroy()');
    });

    it('should have exactly 2 lifecycle patterns', () => {
      const patterns = Object.keys(
        ObservableSubscriptionsConfiguration.LIFECYCLE_PATTERNS
      );
      expect(patterns).toHaveLength(2);
    });
  });

  describe('VALIDATION_MESSAGES constants', () => {
    it('should have MISSING_UNSUBSCRIBE message with placeholder', () => {
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_UNSUBSCRIBE
      ).toContain('{fileName}');
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_UNSUBSCRIBE
      ).toContain('Missing unsubscribe');
    });

    it('should have MISSING_ON_DESTROY message with placeholder', () => {
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_ON_DESTROY
      ).toContain('{fileName}');
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_ON_DESTROY
      ).toContain('OnDestroy');
    });

    it('should have POTENTIAL_LEAK message with property placeholder', () => {
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES.POTENTIAL_LEAK
      ).toContain('{property}');
      expect(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES.POTENTIAL_LEAK
      ).toContain('memory leak');
    });

    it('should have exactly 3 validation messages', () => {
      const messages = Object.keys(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
      );
      expect(messages).toHaveLength(3);
    });
  });

  describe('RECOMMENDATIONS constants', () => {
    it('should have at least 4 recommendations', () => {
      expect(
        ObservableSubscriptionsConfiguration.RECOMMENDATIONS.length
      ).toBeGreaterThanOrEqual(4);
    });

    it('should include recommendation about takeUntil', () => {
      const hasTakeUntilRecommendation =
        ObservableSubscriptionsConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('takeUntil')
        );
      expect(hasTakeUntilRecommendation).toBe(true);
    });

    it('should include recommendation about OnDestroy', () => {
      const hasOnDestroyRecommendation =
        ObservableSubscriptionsConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('OnDestroy')
        );
      expect(hasOnDestroyRecommendation).toBe(true);
    });

    it('should include recommendation about async pipe', () => {
      const hasAsyncPipeRecommendation =
        ObservableSubscriptionsConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('async pipe')
        );
      expect(hasAsyncPipeRecommendation).toBe(true);
    });

    it('should include recommendation about storing subscriptions', () => {
      const hasStoreRecommendation =
        ObservableSubscriptionsConfiguration.RECOMMENDATIONS.some(
          rec => rec.includes('Store') || rec.includes('subscriptions')
        );
      expect(hasStoreRecommendation).toBe(true);
    });
  });

  describe('buildMessage', () => {
    it('should replace fileName placeholder', () => {
      const template = 'Error in {fileName}: something wrong';
      const result = ObservableSubscriptionsConfiguration.buildMessage(
        template,
        'my-component.ts'
      );

      expect(result).toBe('Error in my-component.ts: something wrong');
    });

    it('should work with MISSING_UNSUBSCRIBE template', () => {
      const result = ObservableSubscriptionsConfiguration.buildMessage(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_UNSUBSCRIBE,
        'test.component.ts'
      );

      expect(result).toContain('test.component.ts');
      expect(result).not.toContain('{fileName}');
    });

    it('should work with MISSING_ON_DESTROY template', () => {
      const result = ObservableSubscriptionsConfiguration.buildMessage(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES
          .MISSING_ON_DESTROY,
        'my-service.ts'
      );

      expect(result).toContain('my-service.ts');
      expect(result).not.toContain('{fileName}');
    });
  });

  describe('buildPropertyMessage', () => {
    it('should replace property placeholder', () => {
      const template = 'Issue with {property} subscription';
      const result = ObservableSubscriptionsConfiguration.buildPropertyMessage(
        template,
        'dataSub'
      );

      expect(result).toBe('Issue with dataSub subscription');
    });

    it('should work with POTENTIAL_LEAK template', () => {
      const result = ObservableSubscriptionsConfiguration.buildPropertyMessage(
        ObservableSubscriptionsConfiguration.VALIDATION_MESSAGES.POTENTIAL_LEAK,
        'mySubscription'
      );

      expect(result).toContain('mySubscription');
      expect(result).not.toContain('{property}');
    });
  });

  describe('analyzeSubscriptionPatterns', () => {
    it('should detect subscribe pattern', () => {
      const content = 'this.data$.subscribe(data => this.data = data);';
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasSubscribe).toBe(true);
    });

    it('should detect unsubscribe pattern', () => {
      const content = 'this.subscription.unsubscribe();';
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasUnsubscribe).toBe(true);
    });

    it('should detect ngOnDestroy pattern', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasOnDestroy).toBe(true);
    });

    it('should detect implements OnDestroy pattern', () => {
      const content = 'export class MyComponent implements OnDestroy {}';
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasImplementsOnDestroy).toBe(true);
    });

    it('should return false for all when no patterns found', () => {
      const content = 'const x = 1 + 1;';
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasSubscribe).toBe(false);
      expect(result.hasUnsubscribe).toBe(false);
      expect(result.hasOnDestroy).toBe(false);
      expect(result.hasImplementsOnDestroy).toBe(false);
    });

    it('should detect all patterns in complete component', () => {
      const content = `
        export class MyComponent implements OnDestroy {
          subscription: Subscription;

          ngOnInit() {
            this.subscription = this.data$.subscribe(d => this.data = d);
          }

          ngOnDestroy() {
            this.subscription.unsubscribe();
          }
        }
      `;
      const result =
        ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns(
          content
        );

      expect(result.hasSubscribe).toBe(true);
      expect(result.hasUnsubscribe).toBe(true);
      expect(result.hasOnDestroy).toBe(true);
      expect(result.hasImplementsOnDestroy).toBe(true);
    });
  });

  describe('extractSubscriptionAssignments', () => {
    it('should extract single subscription assignment', () => {
      const content = 'this.mySub = this.data$.subscribe()';
      const result =
        ObservableSubscriptionsConfiguration.extractSubscriptionAssignments(
          content
        );

      expect(result).toHaveLength(1);
      expect(result[0]?.property).toBe('mySub');
    });

    it('should extract multiple subscription assignments', () => {
      const content = `
        this.sub1 = this.data1$.subscribe()
        this.sub2 = this.data2$.subscribe()
        this.sub3 = this.data3$.subscribe()
      `;
      const result =
        ObservableSubscriptionsConfiguration.extractSubscriptionAssignments(
          content
        );

      expect(result).toHaveLength(3);
      expect(result[0]?.property).toBe('sub1');
      expect(result[1]?.property).toBe('sub2');
      expect(result[2]?.property).toBe('sub3');
    });

    it('should return empty array when no assignments found', () => {
      const content = 'const x = 1;';
      const result =
        ObservableSubscriptionsConfiguration.extractSubscriptionAssignments(
          content
        );

      expect(result).toHaveLength(0);
    });

    it('should include full match in result', () => {
      const content = 'this.subscription = this.source$.subscribe()';
      const result =
        ObservableSubscriptionsConfiguration.extractSubscriptionAssignments(
          content
        );

      expect(result[0]?.full).toContain('this.subscription');
      expect(result[0]?.full).toContain('.subscribe');
    });

    it('should handle complex subscription patterns', () => {
      const content = `
        this.dataSub = this.store.select(selectData).subscribe(
          data => this.handleData(data)
        )
      `;
      const result =
        ObservableSubscriptionsConfiguration.extractSubscriptionAssignments(
          content
        );

      expect(result).toHaveLength(1);
      expect(result[0]?.property).toBe('dataSub');
    });
  });

  describe('hasPropertyUnsubscribe', () => {
    it('should return true when property unsubscribe exists', () => {
      const content = `
        this.mySub = this.data$.subscribe();
        this.mySub.unsubscribe();
      `;
      const result =
        ObservableSubscriptionsConfiguration.hasPropertyUnsubscribe(
          content,
          'mySub'
        );

      expect(result).toBe(true);
    });

    it('should return false when property unsubscribe missing', () => {
      const content = 'this.mySub = this.data$.subscribe();';
      const result =
        ObservableSubscriptionsConfiguration.hasPropertyUnsubscribe(
          content,
          'mySub'
        );

      expect(result).toBe(false);
    });

    it('should return false for different property', () => {
      const content = `
        this.mySub = this.data$.subscribe();
        this.otherSub.unsubscribe();
      `;
      const result =
        ObservableSubscriptionsConfiguration.hasPropertyUnsubscribe(
          content,
          'mySub'
        );

      expect(result).toBe(false);
    });

    it('should handle property names with underscores', () => {
      const content = `
        this.my_subscription = this.data$.subscribe();
        this.my_subscription.unsubscribe();
      `;
      const result =
        ObservableSubscriptionsConfiguration.hasPropertyUnsubscribe(
          content,
          'my_subscription'
        );

      expect(result).toBe(true);
    });

    it('should handle property names with numbers', () => {
      const content = `
        this.sub1 = this.data$.subscribe();
        this.sub1.unsubscribe();
      `;
      const result =
        ObservableSubscriptionsConfiguration.hasPropertyUnsubscribe(
          content,
          'sub1'
        );

      expect(result).toBe(true);
    });
  });

  describe('getSubscriptionPatterns', () => {
    it('should return array of regex patterns', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return 3 patterns', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      expect(patterns).toHaveLength(3);
    });

    it('should include SIMPLE_SUBSCRIBE pattern', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      const hasSimpleSubscribe = patterns.some(
        p =>
          p.source ===
          ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
            .SIMPLE_SUBSCRIBE.source
      );
      expect(hasSimpleSubscribe).toBe(true);
    });

    it('should include PIPE_SUBSCRIBE pattern', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      const hasPipeSubscribe = patterns.some(
        p =>
          p.source ===
          ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
            .PIPE_SUBSCRIBE.source
      );
      expect(hasPipeSubscribe).toBe(true);
    });

    it('should include PROPERTY_SUBSCRIBE pattern', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      const hasPropertySubscribe = patterns.some(
        p =>
          p.source ===
          ObservableSubscriptionsConfiguration.SUBSCRIPTION_PATTERNS
            .PROPERTY_SUBSCRIBE.source
      );
      expect(hasPropertySubscribe).toBe(true);
    });

    it('should return patterns that are instanceof RegExp', () => {
      const patterns =
        ObservableSubscriptionsConfiguration.getSubscriptionPatterns();

      patterns.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });
  });
});
