/**
 * Tests for CoreWebVitalsPolicyConstants
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
    it('should be a non-empty array', () => {
      expect(Array.isArray(CoreWebVitalsPolicyConstants.CWV_KEYWORDS)).toBe(
        true
      );
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS.length).toBeGreaterThan(
        0
      );
    });

    it('should include getCLS', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getCLS');
    });

    it('should include getFID', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getFID');
    });

    it('should include getFCP', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getFCP');
    });

    it('should include getLCP', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getLCP');
    });

    it('should include getTTFB', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('getTTFB');
    });

    it('should include web-vitals', () => {
      expect(CoreWebVitalsPolicyConstants.CWV_KEYWORDS).toContain('web-vitals');
    });
  });

  describe('LCP_PATTERN', () => {
    it('should be getLCP', () => {
      expect(CoreWebVitalsPolicyConstants.LCP_PATTERN).toBe('getLCP');
    });
  });

  describe('FID_PATTERN', () => {
    it('should be getFID', () => {
      expect(CoreWebVitalsPolicyConstants.FID_PATTERN).toBe('getFID');
    });
  });

  describe('CLS_PATTERN', () => {
    it('should be getCLS', () => {
      expect(CoreWebVitalsPolicyConstants.CLS_PATTERN).toBe('getCLS');
    });
  });

  describe('hasCoreWebVitalsTracking()', () => {
    it('should return true for content with getCLS', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking('getCLS()')
      ).toBe(true);
    });

    it('should return true for content with getLCP', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking('getLCP()')
      ).toBe(true);
    });

    it('should return true for content with web-vitals', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          "import 'web-vitals'"
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(
          'console.log("test")'
        )
      ).toBe(false);
    });
  });

  describe('hasWebVitalsLibrary()', () => {
    it('should return true when web-vitals is in dependencies', () => {
      const deps = { 'web-vitals': '^3.0.0' };
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary(deps)).toBe(true);
    });

    it('should return false when web-vitals is not present', () => {
      const deps = { react: '^18.0.0' };
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary(deps)).toBe(
        false
      );
    });

    it('should return false for empty object', () => {
      expect(CoreWebVitalsPolicyConstants.hasWebVitalsLibrary({})).toBe(false);
    });
  });

  describe('hasCoreWebVitalsMetrics()', () => {
    it('should return true for content with getLCP', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getLCP()')
      ).toBe(true);
    });

    it('should return true for content with getFID', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getFID()')
      ).toBe(true);
    });

    it('should return true for content with getCLS', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics('getCLS()')
      ).toBe(true);
    });

    it('should return false for content without metrics', () => {
      expect(
        CoreWebVitalsPolicyConstants.hasCoreWebVitalsMetrics(
          'console.log("test")'
        )
      ).toBe(false);
    });
  });
});
