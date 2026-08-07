/**
 * Tests for PerformanceDashboardsConstants
 */
import { PerformanceDashboardsConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-dashboards.constants';

describe('PerformanceDashboardsConstants', () => {
  describe('DASHBOARD_CONFIG_FILES', () => {
    it('should be a non-empty array', () => {
      expect(
        Array.isArray(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES)
      ).toBe(true);
      expect(
        PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES.length
      ).toBeGreaterThan(0);
    });

    it('should include grafana.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'grafana.json'
      );
    });

    it('should include dashboard.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'dashboard.json'
      );
    });

    it('should include kibana.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'kibana.json'
      );
    });

    it('should include newrelic-dashboard.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'newrelic-dashboard.json'
      );
    });
  });

  describe('LIGHTHOUSE_CONFIG_FILES', () => {
    it('should include .lighthouserc.js', () => {
      expect(PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES).toContain(
        '.lighthouserc.js'
      );
    });

    it('should include .lighthouserc.json', () => {
      expect(PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES).toContain(
        '.lighthouserc.json'
      );
    });
  });

  describe('GITHUB_WORKFLOWS_PATTERN', () => {
    it('should match github workflows path', () => {
      expect(PerformanceDashboardsConstants.GITHUB_WORKFLOWS_PATTERN).toBe(
        '.github/workflows/*.{yml,yaml}'
      );
    });
  });

  describe('CI_REPORT_PATTERNS', () => {
    it('should include lighthouse', () => {
      expect(PerformanceDashboardsConstants.CI_REPORT_PATTERNS).toContain(
        'lighthouse'
      );
    });

    it('should include report', () => {
      expect(PerformanceDashboardsConstants.CI_REPORT_PATTERNS).toContain(
        'report'
      );
    });
  });

  describe('isDashboardConfigFile()', () => {
    it('should return true for grafana.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('grafana.json')
      ).toBe(true);
    });

    it('should return true for dashboard.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('dashboard.json')
      ).toBe(true);
    });

    it('should return true for path with grafana.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile(
          'config/grafana.json'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('package.json')
      ).toBe(false);
    });
  });

  describe('isLighthouseDashboard()', () => {
    it('should return true for .lighthouserc.js', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard('.lighthouserc.js')
      ).toBe(true);
    });

    it('should return true for .lighthouserc.json', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard(
          '.lighthouserc.json'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard('package.json')
      ).toBe(false);
    });
  });

  describe('hasCIReporting()', () => {
    it('should return true for content with both lighthouse and report', () => {
      const content = 'lighthouse ci report generation';
      expect(PerformanceDashboardsConstants.hasCIReporting(content)).toBe(true);
    });

    it('should return false for content with only lighthouse', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting('lighthouse ci')
      ).toBe(false);
    });

    it('should return false for content with only report', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting('generate report')
      ).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(PerformanceDashboardsConstants.hasCIReporting('')).toBe(false);
    });
  });
});
