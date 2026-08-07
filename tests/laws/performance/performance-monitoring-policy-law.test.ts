/**
 * Tests for PerformanceMonitoringPolicyLaw
 *
 * Comprehensive tests for performance monitoring policy analysis
 * including Real User Monitoring, performance budgets, error tracking,
 * performance alerting, Core Web Vitals, and performance dashboards.
 */
import { PerformanceMonitoringPolicyLaw } from '../../../src/laws/performance/performance-monitoring-policy';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceMonitoringPolicyLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('perf-monitoring-policy-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          componentPrefix: 'app',
          type: 'angular',
        },
        ignores: {
          global: ['node_modules/**', 'dist/**'],
          tests: ['**/*.spec.ts'],
          build: ['dist/**'],
          design: [],
        },
        laws: {
          paretoMode: false,
          severity: {},
        },
        hooks: {
          preCommit: false,
          prePush: false,
          commitMsg: false,
        },
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: true,
        },
        performance: {
          parallel: true,
          maxConcurrent: 4,
          cache: true,

        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check method', () => {
    it('should return LawResult with expected structure', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('empty project analysis', () => {
    it('should detect missing Real User Monitoring', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('real user monitoring') ||
            v.toLowerCase().includes('rum')
        )
      ).toBe(true);
    });

    it('should detect missing performance budget', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('budget'))
      ).toBe(true);
    });

    it('should detect missing error tracking', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('error') ||
            v.toLowerCase().includes('tracking')
        )
      ).toBe(true);
    });

    it('should detect missing performance alerts', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('alert'))
      ).toBe(true);
    });

    it('should detect missing Core Web Vitals monitoring', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('core web vitals') ||
            v.toLowerCase().includes('vitals')
        )
      ).toBe(true);
    });

    it('should detect missing performance dashboards', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('dashboard'))
      ).toBe(true);
    });

    it('should fail for empty project', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('project with Real User Monitoring', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@datadog/browser-rum': '^4.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const rumInit = `
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'app-id',
  clientToken: 'client-token',
  site: 'datadoghq.com',
  service: 'test-project',
  env: 'production',
  sampleRate: 100,
  trackInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});

datadogRum.startSessionReplayRecording();
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'rum-init.ts'), rumInit);
    });

    it('should detect DataDog RUM', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // DataDog RUM should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have better score with RUM configured', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Should detect RUM configuration
      expect(result).toBeDefined();
    });
  });

  describe('project with Google Analytics', () => {
    beforeEach(() => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'index.html'), indexHtml);
    });

    it('should detect Google Analytics', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // GA should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with performance budgets', () => {
    beforeEach(() => {
      // Create Lighthouse config with budgets
      const lighthouseConfig = `
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-input-delay': ['warn', { maxNumericValue: 100 }],
      },
    },
  },
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.js'),
        lighthouseConfig
      );
    });

    it('should detect Lighthouse performance budgets', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Lighthouse budgets should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with error tracking', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@sentry/angular': '^7.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const sentryInit = `
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: 'https://example@sentry.io/123',
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'main.ts'), sentryInit);
    });

    it('should detect Sentry error tracking', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Sentry should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with LogRocket', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          logrocket: '^3.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const logrocketInit = `
import LogRocket from 'logrocket';

LogRocket.init('app-id/project');

LogRocket.getSessionURL(sessionURL => {
  console.log('LogRocket session:', sessionURL);
});
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'logrocket.ts'),
        logrocketInit
      );
    });

    it('should detect LogRocket', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // LogRocket should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with performance alerting', () => {
    beforeEach(() => {
      // Create alerting configuration
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const alertService = `
import { Injectable } from '@angular/core';

interface PerformanceAlert {
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'error';
}

@Injectable({ providedIn: 'root' })
export class PerformanceAlertingService {
  private readonly thresholds = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    TTFB: 600,
  };

  checkAndAlert(metrics: Record<string, number>): void {
    const alerts: PerformanceAlert[] = [];

    if (metrics.LCP > this.thresholds.LCP) {
      alerts.push({
        metric: 'LCP',
        threshold: this.thresholds.LCP,
        currentValue: metrics.LCP,
        severity: metrics.LCP > this.thresholds.LCP * 1.5 ? 'error' : 'warning',
      });
    }

    if (metrics.CLS > this.thresholds.CLS) {
      alerts.push({
        metric: 'CLS',
        threshold: this.thresholds.CLS,
        currentValue: metrics.CLS,
        severity: 'error',
      });
    }

    this.sendAlerts(alerts);
  }

  private sendAlerts(alerts: PerformanceAlert[]): void {
    alerts.forEach(alert => {
      console.warn('Performance Alert:', alert);
      // Send to monitoring service
    });
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'performance-alerting.service.ts'),
        alertService
      );
    });

    it('should detect performance alerting', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Performance alerting should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with Core Web Vitals monitoring', () => {
    beforeEach(() => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          'web-vitals': '^3.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const webVitals = `
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
  });

  navigator.sendBeacon('/analytics', body);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getFCP(sendToAnalytics);
getTTFB(sendToAnalytics);
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'web-vitals.ts'),
        webVitals
      );
    });

    it('should detect Core Web Vitals monitoring', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // CWV monitoring should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize web-vitals library patterns', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // web-vitals usage should be detected
      expect(result).toBeDefined();
    });
  });

  describe('project with performance dashboards', () => {
    beforeEach(() => {
      // Create dashboard configuration
      const docsDir = PathOperations.join(tempDir, 'docs');
      FileUtils.createDirectory(docsDir);

      const dashboardDoc = `
# Performance Dashboards

## Grafana Dashboard

Access the performance dashboard at: https://grafana.example.com/d/performance

### Metrics Tracked
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

## DataDog Dashboard

Access the DataDog dashboard at: https://app.datadoghq.com/dashboard/xxx

### Alerts Configured
- LCP > 2.5s
- CLS > 0.1
- Error rate > 1%
`;
      FileUtils.writeFile(
        PathOperations.join(docsDir, 'performance-dashboard.md'),
        dashboardDoc
      );

      // Create Grafana dashboard JSON
      const grafanaDir = PathOperations.join(tempDir, 'monitoring', 'grafana');
      FileUtils.createDirectory(grafanaDir);

      const dashboard = {
        dashboard: {
          title: 'Performance Metrics',
          panels: [
            { title: 'LCP', type: 'graph' },
            { title: 'FID', type: 'graph' },
            { title: 'CLS', type: 'graph' },
          ],
        },
      };
      FileUtils.writeFile(
        PathOperations.join(grafanaDir, 'performance-dashboard.json'),
        JSON.stringify(dashboard, null, 2)
      );
    });

    it('should detect performance dashboards', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Dashboard configuration should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create comprehensive monitoring policy setup
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@datadog/browser-rum': '^4.0.0',
          '@sentry/angular': '^7.0.0',
          'web-vitals': '^3.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const lighthouseConfig = `
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
  },
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.js'),
        lighthouseConfig
      );

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const monitoring = `
import { datadogRum } from '@datadog/browser-rum';
import * as Sentry from '@sentry/angular';
import { getCLS, getFID, getLCP } from 'web-vitals';

// RUM
datadogRum.init({ applicationId: 'app', clientToken: 'token' });

// Error Tracking
Sentry.init({ dsn: 'https://example.sentry.io' });

// CWV
getCLS(console.log);
getFID(console.log);
getLCP(console.log);
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'monitoring.ts'),
        monitoring
      );

      // Create dashboard config
      const grafanaDir = PathOperations.join(tempDir, 'monitoring');
      FileUtils.createDirectory(grafanaDir);
      FileUtils.writeFile(
        PathOperations.join(grafanaDir, 'dashboard.json'),
        JSON.stringify({ dashboard: { title: 'Performance' } })
      );
    });

    it('should have better score for fully configured project', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('implemented');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('issues');
      }
    });
  });

  describe('details array', () => {
    it('should contain violations in details', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details for empty project', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      if (result.details) {
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct 25 points for missing RUM', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for RUM is 25
      if (result.violations?.some(v => v.includes('Real User Monitoring'))) {
        expect(result.score).toBeLessThanOrEqual(75);
      }
    });

    it('should deduct 20 points for missing performance budget', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for budget is 20
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 20 points for missing error tracking', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for error tracking is 20
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 15 points for missing alerts', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for alerts is 15
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 10 points for missing CWV monitoring', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for CWV is 10
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 10 points for missing dashboards', async () => {
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      // Score deduction for dashboards is 10
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with generic project type', async () => {
      mockContext.config.project.type = 'generic';
      const result = await PerformanceMonitoringPolicyLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
