/**
 * Tests for WebVitalsPatternMatcher
 *
 * Tests the web vitals pattern matching functionality.
 */
import { WebVitalsPatternMatcher } from '../../src/utils/testing/web-vitals/web-vitals-pattern-matcher';

describe('WebVitalsPatternMatcher', () => {
  describe('hasWebVitalsMonitoring', () => {
    it('should return true for web-vitals import', () => {
      const content = 'import { getCLS } from "web-vitals";';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for getCLS usage', () => {
      const content = 'getCLS(onPerfEntry);';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for getFID usage', () => {
      const content = 'getFID(onPerfEntry);';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for getFCP usage', () => {
      const content = 'getFCP(onPerfEntry);';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for getLCP usage', () => {
      const content = 'getLCP(onPerfEntry);';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for getTTFB usage', () => {
      const content = 'getTTFB(onPerfEntry);';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for vitals measure', () => {
      const content = 'vitals.measure()';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return true for performance vitals', () => {
      const content = 'performance.vitals';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should return false for unrelated content', () => {
      const content = 'const x = 1;';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        false
      );
    });

    it('should be case insensitive for web-vitals', () => {
      const content = 'WEB-VITALS';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });
  });

  describe('hasPerformanceObserverUsage', () => {
    it('should return true for PerformanceObserver', () => {
      const content = 'new PerformanceObserver(callback)';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should return true for performance.observer', () => {
      const content = 'performance.observer.observe()';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should return true for performance.measure', () => {
      const content = 'performance.measure("test", "start", "end")';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should return true for performance.mark', () => {
      const content = 'performance.mark("start")';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should return true for performance.now', () => {
      const content = 'const start = performance.now()';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should return false for unrelated content', () => {
      const content = 'const x = 1;';
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        false
      );
    });
  });

  describe('hasLighthouseIntegration', () => {
    it('should return true for lighthouse import', () => {
      const content = 'import lighthouse from "lighthouse"';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });

    it('should return true for lhci', () => {
      const content = 'lhci autorun';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });

    it('should return true for lighthouse audit', () => {
      const content = 'lighthouse.audit(url)';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });

    it('should return true for performance audit', () => {
      const content = 'performance.audit()';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });

    it('should return false for unrelated content', () => {
      const content = 'const x = 1;';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        false
      );
    });

    it('should be case insensitive for lighthouse', () => {
      const content = 'LIGHTHOUSE';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });

    it('should be case insensitive for lhci', () => {
      const content = 'LHCI';
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration(content)).toBe(
        true
      );
    });
  });

  describe('pattern matching edge cases', () => {
    it('should handle empty content', () => {
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring('')).toBe(false);
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage('')).toBe(
        false
      );
      expect(WebVitalsPatternMatcher.hasLighthouseIntegration('')).toBe(false);
    });

    it('should handle multiline content', () => {
      const content = `
        import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

        getCLS(onPerfEntry);
        getFID(onPerfEntry);
      `;
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });

    it('should detect multiple patterns in same content', () => {
      const content = `
        new PerformanceObserver(callback);
        performance.mark("start");
        performance.measure("test");
      `;
      expect(WebVitalsPatternMatcher.hasPerformanceObserverUsage(content)).toBe(
        true
      );
    });

    it('should handle content with special characters', () => {
      const content = '// Comment: web-vitals is great!';
      expect(WebVitalsPatternMatcher.hasWebVitalsMonitoring(content)).toBe(
        true
      );
    });
  });
});
