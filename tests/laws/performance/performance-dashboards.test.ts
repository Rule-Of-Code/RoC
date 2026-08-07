/**
 * Tests for PerformanceDashboardsConstants
 *
 * Tests performance dashboard configuration detection.
 */
import { PerformanceDashboardsConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-dashboards.constants';

describe('PerformanceDashboardsConstants', () => {
  describe('DASHBOARD_CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain grafana.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'grafana.json'
      );
    });

    it('should contain dashboard.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'dashboard.json'
      );
    });

    it('should contain kibana.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'kibana.json'
      );
    });

    it('should contain newrelic-dashboard.json', () => {
      expect(PerformanceDashboardsConstants.DASHBOARD_CONFIG_FILES).toContain(
        'newrelic-dashboard.json'
      );
    });
  });

  describe('LIGHTHOUSE_CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES)
      ).toBe(true);
    });

    it('should contain .lighthouserc.js', () => {
      expect(PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES).toContain(
        '.lighthouserc.js'
      );
    });

    it('should contain .lighthouserc.json', () => {
      expect(PerformanceDashboardsConstants.LIGHTHOUSE_CONFIG_FILES).toContain(
        '.lighthouserc.json'
      );
    });
  });

  describe('GITHUB_WORKFLOWS_PATTERN', () => {
    it('should be the correct pattern', () => {
      expect(PerformanceDashboardsConstants.GITHUB_WORKFLOWS_PATTERN).toBe(
        '.github/workflows/*.{yml,yaml}'
      );
    });
  });

  describe('CI_REPORT_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(PerformanceDashboardsConstants.CI_REPORT_PATTERNS)
      ).toBe(true);
    });

    it('should contain lighthouse', () => {
      expect(PerformanceDashboardsConstants.CI_REPORT_PATTERNS).toContain(
        'lighthouse'
      );
    });

    it('should contain report', () => {
      expect(PerformanceDashboardsConstants.CI_REPORT_PATTERNS).toContain(
        'report'
      );
    });
  });

  describe('isDashboardConfigFile', () => {
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

    it('should return true for kibana.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('kibana.json')
      ).toBe(true);
    });

    it('should return true for newrelic-dashboard.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile(
          'newrelic-dashboard.json'
        )
      ).toBe(true);
    });

    it('should return true for full paths', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile(
          'config/grafana.json'
        )
      ).toBe(true);
    });

    it('should return false for non-dashboard files', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('package.json')
      ).toBe(false);
    });
  });

  describe('isLighthouseDashboard', () => {
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

    it('should return true for full paths', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard(
          'config/.lighthouserc.js'
        )
      ).toBe(true);
    });

    it('should return false for non-lighthouse files', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard('package.json')
      ).toBe(false);
    });
  });

  describe('hasCIReporting', () => {
    it('should return true when both lighthouse and report are present', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting(
          'run lighthouse and generate report'
        )
      ).toBe(true);
    });

    it('should return true when patterns appear in different order', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting(
          'generate report from lighthouse'
        )
      ).toBe(true);
    });

    it('should return false when only lighthouse is present', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting('run lighthouse')
      ).toBe(false);
    });

    it('should return false when only report is present', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting('generate report')
      ).toBe(false);
    });

    it('should return false when neither is present', () => {
      expect(PerformanceDashboardsConstants.hasCIReporting('run tests')).toBe(
        false
      );
    });
  });
});
