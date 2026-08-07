/**
 * Tests for CoreWebVitalsPerformanceChecksConstants
 *
 * Tests the Core Web Vitals performance check configuration.
 */
import { CoreWebVitalsPerformanceChecksConstants } from '../../../src/laws/performance/core-web-vitals-compliance/constants/performance-checks';

describe('CoreWebVitalsPerformanceChecksConstants', () => {
  describe('SCORE_DEDUCTIONS', () => {
    it('should have LIGHTHOUSE_NOT_CONFIGURED deduction', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .LIGHTHOUSE_NOT_CONFIGURED
      ).toBeDefined();
    });

    it('should have PERFORMANCE_BUDGETS_MISSING deduction', () => {
      expect(
        typeof CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .PERFORMANCE_BUDGETS_MISSING
      ).toBe('number');
    });

    it('should have BUNDLE_NOT_OPTIMIZED deduction', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .BUNDLE_NOT_OPTIMIZED
      ).toBeDefined();
    });

    it('should have CACHING_STRATEGY_MISSING deduction', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .CACHING_STRATEGY_MISSING
      ).toBeDefined();
    });

    it('should have IMAGE_NOT_OPTIMIZED deduction', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .IMAGE_NOT_OPTIMIZED
      ).toBeDefined();
    });

    it('should have RESOURCE_HINTS_MISSING deduction', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SCORE_DEDUCTIONS
          .RESOURCE_HINTS_MISSING
      ).toBeDefined();
    });
  });

  describe('VIOLATION_MESSAGES', () => {
    it('should have LIGHTHOUSE_NOT_FOUND message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .LIGHTHOUSE_NOT_FOUND
      ).toContain('Lighthouse');
    });

    it('should have BUDGETS_NOT_CONFIGURED message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .BUDGETS_NOT_CONFIGURED
      ).toContain('budgets');
    });

    it('should have BUNDLE_NOT_OPTIMIZED message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .BUNDLE_NOT_OPTIMIZED
      ).toContain('Bundle');
    });

    it('should have CACHING_NOT_IMPLEMENTED message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .CACHING_NOT_IMPLEMENTED
      ).toContain('caching');
    });

    it('should have IMAGES_NOT_OPTIMIZED message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .IMAGES_NOT_OPTIMIZED
      ).toContain('Image');
    });

    it('should have HINTS_NOT_CONFIGURED message', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.VIOLATION_MESSAGES
          .HINTS_NOT_CONFIGURED
      ).toContain('resource hints');
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    it('should have LIGHTHOUSE suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES.LIGHTHOUSE
      ).toContain('lighthouse.config.js');
    });

    it('should have BUDGETS suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES.BUDGETS
      ).toContain('performance budgets');
    });

    it('should have BUNDLE_OPTIMIZATION suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES
          .BUNDLE_OPTIMIZATION
      ).toContain('code splitting');
    });

    it('should have CACHING suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES.CACHING
      ).toContain('service worker');
    });

    it('should have IMAGE_OPTIMIZATION suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES
          .IMAGE_OPTIMIZATION
      ).toContain('lazy loading');
    });

    it('should have RESOURCE_HINTS suggestion', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.SUGGESTION_MESSAGES
          .RESOURCE_HINTS
      ).toContain('preload');
    });
  });

  describe('OPTIMIZATION_KEYWORDS', () => {
    it('should have LAZY_LOADING keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.OPTIMIZATION_KEYWORDS
          .LAZY_LOADING
      ).toBe('loadChildren');
    });

    it('should have DYNAMIC_IMPORT keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.OPTIMIZATION_KEYWORDS
          .DYNAMIC_IMPORT
      ).toBe('import(');
    });

    it('should have BUILD_OPTIMIZATION keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.OPTIMIZATION_KEYWORDS
          .BUILD_OPTIMIZATION
      ).toBe('optimization');
    });

    it('should have PERFORMANCE_BUDGETS keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.OPTIMIZATION_KEYWORDS
          .PERFORMANCE_BUDGETS
      ).toBe('budgets');
    });

    it('should have MAX_ASSET_SIZE keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.OPTIMIZATION_KEYWORDS
          .MAX_ASSET_SIZE
      ).toBe('maxAssetSize');
    });
  });

  describe('CACHING_KEYWORDS', () => {
    it('should have CACHE_CONTROL keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.CACHING_KEYWORDS.CACHE_CONTROL
      ).toBe('Cache-Control');
    });

    it('should have EXPIRES keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.CACHING_KEYWORDS.EXPIRES
      ).toBe('expires');
    });

    it('should have SERVICE_WORKER keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.CACHING_KEYWORDS.SERVICE_WORKER
      ).toBe('serviceWorker');
    });

    it('should have PWA keyword', () => {
      expect(CoreWebVitalsPerformanceChecksConstants.CACHING_KEYWORDS.PWA).toBe(
        'manifest'
      );
    });
  });

  describe('RESOURCE_HINT_KEYWORDS', () => {
    it('should have PRELOAD keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.RESOURCE_HINT_KEYWORDS.PRELOAD
      ).toBe('rel="preload"');
    });

    it('should have PREFETCH keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.RESOURCE_HINT_KEYWORDS.PREFETCH
      ).toBe('rel="prefetch"');
    });

    it('should have DNS_PREFETCH keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.RESOURCE_HINT_KEYWORDS
          .DNS_PREFETCH
      ).toBe('rel="dns-prefetch"');
    });

    it('should have PRECONNECT keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.RESOURCE_HINT_KEYWORDS
          .PRECONNECT
      ).toBe('rel="preconnect"');
    });
  });

  describe('IMAGE_KEYWORDS', () => {
    it('should have LOADING_LAZY keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.IMAGE_KEYWORDS.LOADING_LAZY
      ).toBe('loading="lazy"');
    });

    it('should have INTERSECTION_OBSERVER keyword', () => {
      expect(
        CoreWebVitalsPerformanceChecksConstants.IMAGE_KEYWORDS
          .INTERSECTION_OBSERVER
      ).toBe('IntersectionObserver');
    });

    it('should have WEBP keyword', () => {
      expect(CoreWebVitalsPerformanceChecksConstants.IMAGE_KEYWORDS.WEBP).toBe(
        '.webp'
      );
    });
  });
});
