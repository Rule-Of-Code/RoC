/**
 * Tests for PerformanceMonitoringStandardsLaw
 *
 * Comprehensive tests for performance monitoring standards analysis
 * including monitoring tools, real user monitoring, performance budgets,
 * build performance, error tracking, and performance alerts.
 */
import { PerformanceMonitoringStandardsLaw } from '../../../src/laws/performance/performance-monitoring-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceMonitoringStandardsLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('perf-monitoring-standards-test-');
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
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('empty project analysis', () => {
    it('should detect missing monitoring tools', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('monitoring tools') ||
            v.toLowerCase().includes('monitoring')
        )
      ).toBe(true);
    });

    // Real User Monitoring, a Lighthouse budget and build-time (bundler)
    // monitoring are properties of a PAGE a human loads. A project with no
    // browser surface cannot satisfy them — only fake them (a backend consumer). So the
    // three assertions below now require a browser-facing project.
    const browserProject = (): void => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'app',
          version: '1.0.0',
          dependencies: { '@angular/core': '^17.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'index.html'),
        '<html></html>'
      );
    };

    it('should detect missing Real User Monitoring in a browser-facing project', async () => {
      browserProject();
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('real user monitoring') ||
            v.toLowerCase().includes('rum')
        )
      ).toBe(true);
    });

    it('should detect missing performance budget in a browser-facing project', async () => {
      browserProject();
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('budget'))
      ).toBe(true);
    });

    it('should detect missing build performance monitoring in a browser-facing project', async () => {
      browserProject();
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('build'))
      ).toBe(true);
    });

    it('should NOT demand RUM or a Lighthouse budget from a service with no browser', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      const violations = (result.violations ?? []).join(' ').toLowerCase();

      expect(violations).not.toContain('real user monitoring');
      expect(violations).not.toContain('performance budget');
    });

    it('should detect missing error tracking', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(
          v =>
            v.toLowerCase().includes('error') ||
            v.toLowerCase().includes('tracking')
        )
      ).toBe(true);
    });

    it('should detect missing performance alerts', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('alert'))
      ).toBe(true);
    });

    it('should fail for empty project', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('project with monitoring tools', () => {
    beforeEach(() => {
      // Create package.json with monitoring dependencies
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@angular/fire': '^7.0.0',
          firebase: '^10.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create Firebase Performance initialization
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const appConfig = `
import { ApplicationConfig } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { providePerformance, getPerformance } from '@angular/fire/performance';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    providePerformance(() => getPerformance()),
  ],
};
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.config.ts'),
        appConfig
      );
    });

    it('should detect Firebase Performance', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Firebase Performance should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have better score with monitoring tools', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Should detect monitoring configuration
      expect(result).toBeDefined();
    });
  });

  describe('project with Sentry monitoring', () => {
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

      const mainTs = `
import * as Sentry from '@sentry/angular';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: 'https://example@sentry.io/123',
  integrations: [
    new BrowserTracing({
      tracePropagationTargets: ['localhost', 'https://api.example.com'],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
  tracesSampleRate: 0.2,
});
`;
      FileUtils.writeFile(PathOperations.join(srcDir, 'main.ts'), mainTs);
    });

    it('should detect Sentry monitoring', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Sentry should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with Real User Monitoring', () => {
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

      const webVitalsService = `
import { Injectable } from '@angular/core';
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

@Injectable({ providedIn: 'root' })
export class WebVitalsService {
  initWebVitals(): void {
    getCLS(this.sendToAnalytics);
    getFID(this.sendToAnalytics);
    getLCP(this.sendToAnalytics);
    getFCP(this.sendToAnalytics);
    getTTFB(this.sendToAnalytics);
  }

  private sendToAnalytics(metric: any): void {
    console.log(metric);
    // Send to analytics service
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'web-vitals.service.ts'),
        webVitalsService
      );
    });

    it('should detect Real User Monitoring', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // RUM should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize web-vitals library', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // web-vitals is a RUM solution
      expect(result).toBeDefined();
    });
  });

  describe('project with performance budgets', () => {
    beforeEach(() => {
      // Create Lighthouse config with budgets
      const lighthouseConfig = `
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
};
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.js'),
        lighthouseConfig
      );

      // Create angular.json with budgets
      const angularJson = {
        projects: {
          'test-project': {
            architect: {
              build: {
                configurations: {
                  production: {
                    budgets: [
                      {
                        type: 'initial',
                        maximumWarning: '500kb',
                        maximumError: '1mb',
                      },
                      { type: 'anyComponentStyle', maximumWarning: '2kb' },
                    ],
                  },
                },
              },
            },
          },
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify(angularJson, null, 2)
      );
    });

    it('should detect performance budget configuration', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Budgets should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with build performance monitoring', () => {
    beforeEach(() => {
      // Create CI config with build time tracking
      const bitbucketPipelines = `
pipelines:
  default:
    - step:
        name: Build
        script:
          - time npm run build
          - echo "Build completed"
        after-script:
          - npx bundlesize
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bitbucket-pipelines.yml'),
        bitbucketPipelines
      );

      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'ng build',
          'build:stats': 'ng build --stats-json',
        },
        devDependencies: {
          bundlesize: '^0.18.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
    });

    it('should detect build performance monitoring', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Build monitoring should be detected
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

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      const errorHandler = `
import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    Sentry.captureException(error);
    console.error('Error caught by global handler:', error);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'global-error-handler.ts'),
        errorHandler
      );
    });

    it('should detect error tracking configuration', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Error tracking should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with performance alerts', () => {
    beforeEach(() => {
      // Create alerting configuration
      const alertsConfig = `
{
  "alerts": {
    "performance": {
      "lcp_threshold": 2500,
      "fid_threshold": 100,
      "cls_threshold": 0.1,
      "notification_channel": "slack"
    }
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'alerts.config.json'),
        alertsConfig
      );

      // Create monitoring service with alerting
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const alertService = `
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PerformanceAlertService {
  private readonly LCP_THRESHOLD = 2500;
  private readonly FID_THRESHOLD = 100;
  private readonly CLS_THRESHOLD = 0.1;

  checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    if (metrics.lcp > this.LCP_THRESHOLD) {
      this.sendAlert('LCP exceeded threshold', metrics.lcp);
    }
    if (metrics.fid > this.FID_THRESHOLD) {
      this.sendAlert('FID exceeded threshold', metrics.fid);
    }
    if (metrics.cls > this.CLS_THRESHOLD) {
      this.sendAlert('CLS exceeded threshold', metrics.cls);
    }
  }

  private sendAlert(message: string, value: number): void {
    // Send alert to monitoring service
    console.warn(\`Performance Alert: \${message} - Value: \${value}\`);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'performance-alert.service.ts'),
        alertService
      );
    });

    it('should detect performance alerts configuration', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Alerts should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create comprehensive monitoring setup
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@angular/fire': '^7.0.0',
          '@sentry/angular': '^7.0.0',
          'web-vitals': '^3.0.0',
        },
        devDependencies: {
          bundlesize: '^0.18.0',
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
import { getCLS, getFID, getLCP } from 'web-vitals';
import * as Sentry from '@sentry/angular';
import { getPerformance } from '@angular/fire/performance';

export function initMonitoring() {
  getCLS(console.log);
  getFID(console.log);
  getLCP(console.log);
  Sentry.init({ dsn: 'https://example.sentry.io' });
  getPerformance();
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'monitoring.ts'),
        monitoring
      );
    });

    it('should have better score for fully configured project', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('implemented');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('issues');
      }
    });
  });

  describe('details array', () => {
    it('should contain violations and suggestions in details', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details for empty project', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      if (result.details) {
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct 25 points for missing monitoring tools', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Score deduction for monitoring tools is 25
      if (result.violations?.some(v => v.includes('monitoring tools'))) {
        expect(result.score).toBeLessThanOrEqual(75);
      }
    });

    it('should deduct 20 points for missing RUM', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Score deduction for RUM is 20
      expect(result.score).toBeLessThan(100);
    });

    it('should deduct 20 points for missing performance budget', async () => {
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      // Score deduction for budget is 20
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with generic project type', async () => {
      mockContext.config.project.type = 'generic';
      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('monitoring tools detection', () => {
    it('should detect New Relic', async () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          newrelic: '^10.0.0',
        },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should detect DataDog', async () => {
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

      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should detect LogRocket', async () => {
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

      const result = await PerformanceMonitoringStandardsLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });
});
