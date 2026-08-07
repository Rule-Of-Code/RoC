/**
 * Tests for Performance Monitoring Constants
 *
 * Tests for error tracking, monitoring tools, alerts, budget, and RUM constants.
 */
import { ErrorTrackingConstants } from '../../../src/laws/performance/performance-monitoring/constants/error-tracking.constants';
import { MonitoringToolsConstants } from '../../../src/laws/performance/performance-monitoring/constants/monitoring-tools.constants';
import { PerformanceAlertsConstants } from '../../../src/laws/performance/performance-monitoring/constants/performance-alerts.constants';
import { PerformanceBudgetConstants } from '../../../src/laws/performance/performance-monitoring/constants/performance-budget.constants';
import { RealUserMonitoringConstants } from '../../../src/laws/performance/performance-monitoring/constants/real-user-monitoring.constants';

describe('ErrorTrackingConstants', () => {
  describe('ERROR_TRACKING_TOOLS', () => {
    it('should include @sentry/browser', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/browser'
      );
    });

    it('should include @sentry/angular', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain(
        '@sentry/angular'
      );
    });

    it('should include bugsnag', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain('bugsnag');
    });

    it('should include rollbar', () => {
      expect(ErrorTrackingConstants.ERROR_TRACKING_TOOLS).toContain('rollbar');
    });
  });

  describe('getErrorTrackingConfigFilePaths', () => {
    const projectRoot = '/test/project';

    it('should include src/app/app.module.ts', async () => {
      expect(
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        )
      ).toContain(`${projectRoot}/src/app/app.module.ts`);
    });

    it('should include sentry.config.js', async () => {
      expect(
        await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
          projectRoot
        )
      ).toContain(`${projectRoot}/sentry.config.js`);
    });
  });

  describe('PERFORMANCE_ERROR_TRACKING_PATTERNS', () => {
    it('should include tracesSampleRate', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
      ).toContain('tracesSampleRate');
    });

    it('should include performance', () => {
      expect(
        ErrorTrackingConstants.PERFORMANCE_ERROR_TRACKING_PATTERNS
      ).toContain('performance');
    });
  });

  describe('isErrorTrackingTool', () => {
    it('should return true for @sentry/browser', () => {
      expect(
        ErrorTrackingConstants.isErrorTrackingTool('@sentry/browser')
      ).toBe(true);
    });

    it('should return false for unknown tool', () => {
      expect(ErrorTrackingConstants.isErrorTrackingTool('unknown')).toBe(false);
    });
  });

  describe('hasErrorTrackingConfig', () => {
    it('should return true for content with tracesSampleRate', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig('tracesSampleRate: 1.0')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        ErrorTrackingConstants.hasErrorTrackingConfig('config: true')
      ).toBe(false);
    });
  });
});

describe('MonitoringToolsConstants', () => {
  describe('MONITORING_TOOL_PACKAGES', () => {
    it('should have @sentry/browser', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['@sentry/browser']
      ).toBe('Sentry');
    });

    it('should have firebase', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['firebase']
      ).toBe('Firebase');
    });

    it('should have web-vitals', () => {
      expect(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES['web-vitals']
      ).toBe('Web Vitals');
    });
  });

  describe('CUSTOM_MONITORING_FILE_PATTERNS', () => {
    it('should include src/utils/performance.ts', () => {
      expect(
        MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS
      ).toContain('src/utils/performance.ts');
    });
  });

  describe('getMonitoringToolName', () => {
    it('should return Sentry for @sentry/browser', () => {
      expect(
        MonitoringToolsConstants.getMonitoringToolName('@sentry/browser')
      ).toBe('Sentry');
    });

    it('should return undefined for unknown package', () => {
      expect(
        MonitoringToolsConstants.getMonitoringToolName('unknown')
      ).toBeUndefined();
    });
  });

  describe('isMonitoringTool', () => {
    it('should return true for web-vitals', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('web-vitals')).toBe(
        true
      );
    });

    it('should return false for unknown package', () => {
      expect(MonitoringToolsConstants.isMonitoringTool('unknown')).toBe(false);
    });
  });
});

describe('PerformanceAlertsConstants', () => {
  describe('ALERT_CONFIG_FILE_PATTERNS', () => {
    it('should include lighthouse.config.js', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'lighthouse.config.js'
      );
    });

    it('should include bitbucket-pipelines.yml', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIG_FILE_PATTERNS).toContain(
        'bitbucket-pipelines.yml'
      );
    });
  });

  describe('ALERT_CONFIGURATION_PATTERNS', () => {
    it('should include alert', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'alert'
      );
    });

    it('should include slack', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'slack'
      );
    });

    it('should include threshold', () => {
      expect(PerformanceAlertsConstants.ALERT_CONFIGURATION_PATTERNS).toContain(
        'threshold'
      );
    });
  });

  describe('isAlertConfigFile', () => {
    it('should return true for lighthouse.config.js', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile('lighthouse.config.js')
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceAlertsConstants.isAlertConfigFile('app.config.js')
      ).toBe(false);
    });
  });

  describe('hasAlertConfiguration', () => {
    it('should return true for content with alert', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('alert: true')
      ).toBe(true);
    });

    it('should return true for content with slack', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('slack webhook')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceAlertsConstants.hasAlertConfiguration('config: true')
      ).toBe(false);
    });
  });
});

describe('PerformanceBudgetConstants', () => {
  describe('BUDGET_CONFIG_FILE_PATTERNS', () => {
    it('should include lighthouse.config.js', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'lighthouse.config.js'
      );
    });

    it('should include webpack.config.js', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        'webpack.config.js'
      );
    });

    it('should include .lighthouserc.json', () => {
      expect(PerformanceBudgetConstants.BUDGET_CONFIG_FILE_PATTERNS).toContain(
        '.lighthouserc.json'
      );
    });
  });

  describe('BUDGET_CONFIGURATION_PATTERNS', () => {
    it('should include budget', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('budget');
    });

    it('should include maxAssetSize', () => {
      expect(
        PerformanceBudgetConstants.BUDGET_CONFIGURATION_PATTERNS
      ).toContain('maxAssetSize');
    });
  });

  describe('ANGULAR_BUDGET_FILE', () => {
    it('should be angular.json', () => {
      expect(PerformanceBudgetConstants.ANGULAR_BUDGET_FILE).toBe(
        'angular.json'
      );
    });
  });

  describe('ANGULAR_BUDGET_PATTERN', () => {
    it('should be budgets', () => {
      expect(PerformanceBudgetConstants.ANGULAR_BUDGET_PATTERN).toBe('budgets');
    });
  });

  describe('isBudgetConfigFile', () => {
    it('should return true for lighthouse.config.js', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('lighthouse.config.js')
      ).toBe(true);
    });

    it('should return false for unrelated file', () => {
      expect(
        PerformanceBudgetConstants.isBudgetConfigFile('app.config.js')
      ).toBe(false);
    });
  });

  describe('hasBudgetConfiguration', () => {
    it('should return true for content with budget', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration('budget: 500000')
      ).toBe(true);
    });

    it('should return true for content with maxAssetSize', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration(
          'maxAssetSize: 250000'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        PerformanceBudgetConstants.hasBudgetConfiguration('config: true')
      ).toBe(false);
    });
  });
});

describe('RealUserMonitoringConstants', () => {
  describe('RUM_DEPENDENCY_PATTERNS', () => {
    it('should include web-vitals', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'web-vitals'
      );
    });

    it('should include getCLS', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'getCLS'
      );
    });

    it('should include getLCP', () => {
      expect(RealUserMonitoringConstants.RUM_DEPENDENCY_PATTERNS).toContain(
        'getLCP'
      );
    });
  });

  describe('RUM_CONFIG_FILE_PATTERNS', () => {
    it('should include src/utils/rum.ts', () => {
      expect(RealUserMonitoringConstants.RUM_CONFIG_FILE_PATTERNS).toContain(
        'src/utils/rum.ts'
      );
    });
  });

  describe('PERFORMANCE_MONITORING_PATTERNS', () => {
    it('should include web-vitals', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('web-vitals');
    });

    it('should include PerformanceObserver', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('PerformanceObserver');
    });

    it('should include performance.mark', () => {
      expect(
        RealUserMonitoringConstants.PERFORMANCE_MONITORING_PATTERNS
      ).toContain('performance.mark');
    });
  });

  describe('getRumConfigLocations', () => {
    const projectRoot = '/test/project';

    it('should include src/main.ts', async () => {
      expect(
        await RealUserMonitoringConstants.getRumConfigLocations(projectRoot)
      ).toContain(`${projectRoot}/src/main.ts`);
    });
  });

  describe('hasRumIndicators', () => {
    it('should return true for content with web-vitals', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators(
          'import { getCLS } from "web-vitals";'
        )
      ).toBe(true);
    });

    it('should return true for content with PerformanceObserver', () => {
      expect(
        RealUserMonitoringConstants.hasRumIndicators(
          'new PerformanceObserver()'
        )
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(RealUserMonitoringConstants.hasRumIndicators('const x = 1;')).toBe(
        false
      );
    });
  });
});
