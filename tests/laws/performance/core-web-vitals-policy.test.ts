/**
 * Tests for CoreWebVitalsPolicyConstants
 *
 * Tests Core Web Vitals monitoring configuration and detection.
 */
import { CoreWebVitalsPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/core-web-vitals-policy.constants';

describe('CoreWebVitalsPolicyConstants', () => {
  describe('WEB_VITALS_PACKAGE', () => {
    it('should be web-vitals', () => {
      expect(CoreWebVitalsPolicyConstants.WEB_VITALS_PACKAGE).toBe(
        'web-vitals'
      );
    });
  });

  describe('CWV_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(CoreWebVitalsPolicyConstants.CWV_KEYWORDS)).toBe(
        true
      );
      CoreWebVitalsPolicyConstants.CWV_KEYWORDS.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should contain getCLS', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getCLS');
    });

    it('should contain getFID', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getFID');
    });

    it('should contain getFCP', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getFCP');
    });

    it('should contain getLCP', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getLCP');
    });

    it('should contain getTTFB', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getTTFB');
    });

    it('should contain web-vitals', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('web-vitals');
    });
  });

  describe('pattern constants', () => {
    it('should have LCP_PATTERN as getLCP', () => {
      expect(CoreWebVitalsPolicyConstants.LCP_PATTERN).toBe('getLCP');
    });

    it('should have FID_PATTERN as getFID', () => {
      expect(CoreWebVitalsPolicyConstants.FID_PATTERN).toBe('getFID');
    });

    it('should have CLS_PATTERN as getCLS', () => {
      expect(CoreWebVitalsPolicyConstants.CLS_PATTERN).toBe('getCLS');
    });
  });

  describe('hasCoreWebVitalsTracking', () => {
    it('should return true when getCLS is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'import { getCLS } from "web-vitals"'
        )
      ).toBe(true);
    });

    it('should return true when getFID is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'getFID(console.log)'
        )
      ).toBe(true);
    });

    it('should return true when getFCP is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'getFCP(reportMetric)'
        )
      ).toBe(true);
    });

    it('should return true when getLCP is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'getLCP(sendToAnalytics)'
        )
      ).toBe(true);
    });

    it('should return true when getTTFB is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'getTTFB(callback)'
        )
      ).toBe(true);
    });

    it('should return true when web-vitals is mentioned', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'from "web-vitals"'
        )
      ).toBe(true);
    });

    it('should return false when no keywords are present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking('regular code')
      ).toBe(false);
    });
  });

  describe('hasWebVitalsLibrary', () => {
    it('should return true when web-vitals is in dependencies', () => {
      const deps = { 'web-vitals': '^3.0.0', lodash: '^4.0.0' };
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary(deps)).toBe(true);
    });

    it('should return false when web-vitals is not in dependencies', () => {
      const deps = { lodash: '^4.0.0', express: '^4.0.0' };
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary(deps)).toBe(
        false
      );
    });

    it('should return false for empty dependencies', () => {
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary({})).toBe(false);
    });
  });

  describe('hasCoreWebVitalsMetrics', () => {
    it('should return true when getLCP is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getLCP(callback)')
      ).toBe(true);
    });

    it('should return true when getFID is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getFID(callback)')
      ).toBe(true);
    });

    it('should return true when getCLS is present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getCLS(callback)')
      ).toBe(true);
    });

    it('should return true when multiple metrics are present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics(
          'getLCP(cb); getFID(cb); getCLS(cb)'
        )
      ).toBe(true);
    });

    it('should return false when no core metrics are present', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics(
          'getTTFB(callback)'
        )
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('')).toBe(
        false
      );
    });
  });
});
