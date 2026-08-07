/**
 * Tests for Performance Monitoring Policy Constants Part 2
 *
 * Tests for budget, dashboards, and RUM policy constants.
 */
import { PerformanceBudgetPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-budget-policy.constants';
import { PerformanceDashboardsConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/performance-dashboards.constants';
import { RealUserMonitoringPolicyConstants } from '../../../src/laws/performance/performance-monitoring-policy/constants/real-user-monitoring-policy.constants';

describe('PerformanceBudgetPolicyConstants', () => {
  describe('ANGULAR_BUDGET_FILE', () => {
    it('should be angular.json', () => {
      expect(PerformanceBudgetPolicyConstants.ANGULAR_BUDGET_FILE).toBe(
        'angular.json'
      );
    });
  });

  describe('ANGULAR_BUDGET_PATTERN', () => {
    it('should be budgets', () => {
      expect(PerformanceBudgetPolicyConstants.ANGULAR_BUDGET_PATTERN).toBe(
        'budgets'
      );
    });
  });

  describe('LIGHTHOUSE_CONFIG_FILES', () => {
    it('should include .lighthouserc.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.js');
    });

    it('should include .lighthouserc.json', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('.lighthouserc.json');
    });

    it('should include lighthouse.config.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.LIGHTHOUSE_CONFIG_FILES
      ).toContain('lighthouse.config.js');
    });
  });

  describe('WEBPACK_CONFIG_FILE', () => {
    it('should be webpack.config.js', () => {
      expect(PerformanceBudgetPolicyConstants.WEBPACK_CONFIG_FILE).toBe(
        'webpack.config.js'
      );
    });
  });

  describe('WEBPACK_PERFORMANCE_PATTERNS', () => {
    it('should include performance', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('performance');
    });

    it('should include maxAssetSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxAssetSize');
    });

    it('should include maxEntrypointSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.WEBPACK_PERFORMANCE_PATTERNS
      ).toContain('maxEntrypointSize');
    });
  });

  describe('isLighthouseConfigFile', () => {
    it('should return true for .lighthouserc.js', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          '.lighthouserc.js'
        )
      ).toBe(true);
    });

    it('should return true for path containing lighthouse config', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile(
          '/project/.lighthouserc.json'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceBudgetPolicyConstants.isLighthouseConfigFile('app.config.js')
      ).toBe(false);
    });
  });

  describe('hasAngularBudgets', () => {
    it('should return true when content has budgets', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasAngularBudgets('{ "budgets": [] }')
      ).toBe(true);
    });

    it('should return false when content lacks budgets', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasAngularBudgets('{ "scripts": [] }')
      ).toBe(false);
    });
  });

  describe('hasWebpackPerformanceConfig', () => {
    it('should return true for performance with maxAssetSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'performance: { maxAssetSize: 250000 }'
        )
      ).toBe(true);
    });

    it('should return true for performance with maxEntrypointSize', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'performance: { maxEntrypointSize: 500000 }'
        )
      ).toBe(true);
    });

    it('should return false for performance without size configs', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'performance: { hints: false }'
        )
      ).toBe(false);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetPolicyConstants.hasWebpackPerformanceConfig(
          'output: { path: "./dist" }'
        )
      ).toBe(false);
    });
  });
});

describe('PerformanceDashboardsConstants', () => {
  describe('DASHBOARD_CONFIG_FILES', () => {
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
    it('should match GitHub workflows', () => {
      expect(PerformanceDashboardsConstants.GITHUB_WORKFLOWS_PATTERN).toContain(
        '.github/workflows'
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

  describe('isDashboardConfigFile', () => {
    it('should return true for grafana.json', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('grafana.json')
      ).toBe(true);
    });

    it('should return true for path containing dashboard config', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile(
          '/config/dashboard.json'
        )
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceDashboardsConstants.isDashboardConfigFile('app.json')
      ).toBe(false);
    });
  });

  describe('isLighthouseDashboard', () => {
    it('should return true for .lighthouserc.js', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard('.lighthouserc.js')
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceDashboardsConstants.isLighthouseDashboard('app.config.js')
      ).toBe(false);
    });
  });

  describe('hasCIReporting', () => {
    it('should return true when content has both lighthouse and report', () => {
      expect(
        PerformanceDashboardsConstants.hasCIReporting(
          'run lighthouse and generate report'
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
  });
});

describe('RealUserMonitoringPolicyConstants', () => {
  describe('RUM_TOOLS', () => {
    it('should have web-vitals', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['web-vitals']).toBe(
        'Web Vitals'
      );
    });

    it('should have gtag', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['gtag']).toBe(
        'Google Analytics'
      );
    });

    it('should have newrelic', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_TOOLS['newrelic']).toBe(
        'New Relic'
      );
    });

    it('should have @datadog/browser-rum', () => {
      expect(
        RealUserMonitoringPolicyConstants.RUM_TOOLS['@datadog/browser-rum']
      ).toBe('DataDog RUM');
    });
  });

  describe('GOOGLE_ANALYTICS_PATTERNS', () => {
    it('should include gtag', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('gtag');
    });

    it('should include google-analytics', () => {
      expect(
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS
      ).toContain('google-analytics');
    });
  });

  describe('RUM_CONFIG_FILES', () => {
    it('should include newrelic.js', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'newrelic.js'
      );
    });

    it('should include datadog.json', () => {
      expect(RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES).toContain(
        'datadog.json'
      );
    });
  });

  describe('INDEX_HTML_FILE', () => {
    it('should be src/index.html', () => {
      expect(RealUserMonitoringPolicyConstants.INDEX_HTML_FILE).toBe(
        'src/index.html'
      );
    });
  });

  describe('isRumTool', () => {
    it('should return true for web-vitals', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('web-vitals')).toBe(
        true
      );
    });

    it('should return true for newrelic', () => {
      expect(RealUserMonitoringPolicyConstants.isRumTool('newrelic')).toBe(
        true
      );
    });

    it('should return false for unknown package', () => {
      expect(
        RealUserMonitoringPolicyConstants.isRumTool('unknown-package')
      ).toBe(false);
    });
  });

  describe('getRumToolName', () => {
    it('should return Web Vitals for web-vitals', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('web-vitals')
      ).toBe('Web Vitals');
    });

    it('should return New Relic for newrelic', () => {
      expect(RealUserMonitoringPolicyConstants.getRumToolName('newrelic')).toBe(
        'New Relic'
      );
    });

    it('should return undefined for unknown package', () => {
      expect(
        RealUserMonitoringPolicyConstants.getRumToolName('unknown')
      ).toBeUndefined();
    });
  });
});
