/**
 * Tests for PerformanceBudgetComplianceFileDiscoveryConstants
 *
 * Tests file patterns and keyword detection.
 */
import { PerformanceBudgetComplianceFileDiscoveryConstants } from '../../../src/laws/performance/performance-budget-compliance/constants/file-discovery';

describe('PerformanceBudgetComplianceFileDiscoveryConstants', () => {
  describe('CONFIG_FILE_PATTERNS', () => {
    it('should have ANGULAR_JSON pattern', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .ANGULAR_JSON
      ).toBe('angular.json');
    });

    it('should have WEBPACK_CONFIG patterns array', () => {
      const patterns =
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .WEBPACK_CONFIG;
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toContain('webpack.config.js');
      expect(patterns).toContain('webpack.prod.js');
    });

    it('should have LIGHTHOUSE patterns array', () => {
      const patterns =
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .LIGHTHOUSE;
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toContain('.lighthouserc.js');
      expect(patterns).toContain('.lighthouserc.json');
      expect(patterns).toContain('lighthouse.config.js');
      expect(patterns).toContain('lighthouserc.json');
    });

    it('should have CI_CD.GITHUB pattern', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .CI_CD.GITHUB
      ).toBe('.github/workflows');
    });

    it('should have CI_CD.GITLAB pattern', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .CI_CD.GITLAB
      ).toBe('.gitlab-ci.yml');
    });

    it('should have CI_CD.BITBUCKET pattern', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .CI_CD.BITBUCKET
      ).toBe('bitbucket-pipelines.yml');
    });
  });

  describe('PERFORMANCE_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
        )
      ).toBe(true);
    });

    it('should contain lighthouse keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
      ).toContain('lighthouse');
    });

    it('should contain BundleSizeAnalyzer keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
      ).toContain('BundleSizeAnalyzer');
    });

    it('should contain bundlesize keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
      ).toContain('bundlesize');
    });

    it('should contain performance keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
      ).toContain('performance');
    });

    it('should contain budget keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.PERFORMANCE_KEYWORDS
      ).toContain('budget');
    });
  });

  describe('MONITORING_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          PerformanceBudgetComplianceFileDiscoveryConstants.MONITORING_KEYWORDS
        )
      ).toBe(true);
    });

    it('should contain SENTRY_DSN keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.MONITORING_KEYWORDS
      ).toContain('SENTRY_DSN');
    });

    it('should contain NEWRELIC_ keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.MONITORING_KEYWORDS
      ).toContain('NEWRELIC_');
    });

    it('should contain DATADOG_ keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.MONITORING_KEYWORDS
      ).toContain('DATADOG_');
    });

    it('should contain performance keyword', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.MONITORING_KEYWORDS
      ).toContain('performance');
    });
  });

  describe('hasPerformanceKeywords', () => {
    it('should return true for lighthouse content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          'running lighthouse audit'
        )
      ).toBe(true);
    });

    it('should return true for LIGHTHOUSE (case insensitive)', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          'LIGHTHOUSE CI'
        )
      ).toBe(true);
    });

    it('should return true for bundlesize content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          'checking bundlesize'
        )
      ).toBe(true);
    });

    it('should return true for performance budget content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          'set performance budget limits'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          'this is just normal code'
        )
      ).toBe(false);
    });
  });

  describe('hasMonitoringKeywords', () => {
    it('should return true for SENTRY_DSN content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
          'SENTRY_DSN=abc123'
        )
      ).toBe(true);
    });

    it('should return true for NEWRELIC_ content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
          'NEWRELIC_LICENSE_KEY=xyz'
        )
      ).toBe(true);
    });

    it('should return true for DATADOG_ content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
          'DATADOG_API_KEY=abc'
        )
      ).toBe(true);
    });

    it('should return true for performance content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
          'track performance metrics'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetComplianceFileDiscoveryConstants.hasMonitoringKeywords(
          'this is just test code'
        )
      ).toBe(false);
    });
  });
});
