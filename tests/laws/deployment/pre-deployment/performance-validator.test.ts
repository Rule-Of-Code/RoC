/**
 * Tests for PerformanceValidationChecker
 *
 * Comprehensive tests for performance validation
 */
import {
  PerformanceValidationChecker,
  performanceValidator,
} from '../../../../src/laws/deployment/pre-deployment/performance-validator';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../../src/types';
import { FileUtils } from '../../../../src/utils/file-utils';
import { PathOperations } from '../../../../src/utils/path-operations';

describe('PerformanceValidationChecker', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;
  let validator: PerformanceValidationChecker;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('performance-validator-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
    validator = new PerformanceValidationChecker();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('validate()', () => {
    it('should return isValid false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(false);
    });

    it('should return benchmarkingConfigured false for empty project', () => {
      const result = validator.validate(mockContext);
      expect(result.benchmarkingConfigured).toBe(false);
    });

    it('should return performanceScripts array', () => {
      const result = validator.validate(mockContext);
      expect(Array.isArray(result.performanceScripts)).toBe(true);
    });

    it('should return lighthouseConfigured boolean', () => {
      const result = validator.validate(mockContext);
      expect(typeof result.lighthouseConfigured).toBe('boolean');
    });

    it('should return budgetConfigured boolean', () => {
      const result = validator.validate(mockContext);
      expect(typeof result.budgetConfigured).toBe('boolean');
    });

    it('should have error when validation fails', () => {
      const result = validator.validate(mockContext);
      expect(result.errors).toContain('Performance validation failed');
    });

    it('should have empty errors when validation passes', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { performance: 'lighthouse' },
        })
      );
      const result = validator.validate(mockContext);
      expect(result.errors).toEqual([]);
    });

    it('should return isValid true when benchmarking configured', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { performance: 'lighthouse' },
        })
      );
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkPerformanceBenchmarking()', () => {
    it('should return benchmarkingConfigured false when no scripts', () => {
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.benchmarkingConfigured).toBe(false);
    });

    it('should return empty performanceScripts when no package.json', () => {
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toEqual([]);
    });

    it('should detect performance script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { performance: 'lighthouse' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('performance');
    });

    it('should detect perf script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { perf: 'perf-test' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('perf');
    });

    it('should detect lighthouse script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { lighthouse: 'lighthouse http://localhost' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('lighthouse');
      expect(result.lighthouseConfigured).toBe(true);
    });

    it('should detect benchmark script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { benchmark: 'node benchmark.js' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('benchmark');
    });

    it('should detect webvitals script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { webvitals: 'web-vitals' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('webvitals');
    });

    it('should detect bundle-analyzer script', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          scripts: { 'bundle-analyzer': 'webpack-bundle-analyzer' },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.performanceScripts).toContain('bundle-analyzer');
    });

    it('should detect lighthouse.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'lighthouse.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.lighthouseConfigured).toBe(true);
    });

    it('should detect lighthouserc.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'lighthouserc.js'),
        'module.exports = {};'
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.lighthouseConfigured).toBe(true);
    });

    it('should detect .lighthouserc.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.lighthouserc.json'),
        JSON.stringify({})
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.lighthouseConfigured).toBe(true);
    });

    it('should detect webpack-bundle-analyzer.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack-bundle-analyzer.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.budgetConfigured).toBe(true);
    });

    it('should detect bundle-analyzer.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bundle-analyzer.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.budgetConfigured).toBe(true);
    });

    it('should detect performance-budget.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'performance-budget.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.budgetConfigured).toBe(true);
    });

    it('should detect Angular budgets in angular.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({
          projects: {
            app: {
              architect: {
                build: {
                  configurations: {
                    production: {
                      budgets: [{ type: 'bundle', maximumWarning: '500kb' }],
                    },
                  },
                },
              },
            },
          },
        })
      );
      const result = validator.checkPerformanceBenchmarking(tempDir);
      expect(result.budgetConfigured).toBe(true);
    });
  });

  describe('checkMonitoringSetup()', () => {
    it('should return healthChecksConfigured false for empty project', () => {
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.healthChecksConfigured).toBe(false);
    });

    it('should return loggingConfigured false for empty project', () => {
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.loggingConfigured).toBe(false);
    });

    it('should return metricsConfigured false for empty project', () => {
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.metricsConfigured).toBe(false);
    });

    it('should return alertingConfigured false for empty project', () => {
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.alertingConfigured).toBe(false);
    });

    it('should detect health check files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export function health() { return "ok"; }'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.healthChecksConfigured).toBe(true);
    });

    it('should detect status files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'status.ts'),
        'export function status() { return "ok"; }'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.healthChecksConfigured).toBe(true);
    });

    it('should detect ping files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'ping.ts'),
        'export function ping() { return "pong"; }'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.healthChecksConfigured).toBe(true);
    });

    it('should detect winston.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'winston.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.loggingConfigured).toBe(true);
    });

    it('should detect logging.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'logging.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.loggingConfigured).toBe(true);
    });

    it('should detect log4js.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'log4js.json'),
        JSON.stringify({})
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.loggingConfigured).toBe(true);
    });

    it('should detect pino.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'pino.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.loggingConfigured).toBe(true);
    });

    it('should detect metrics.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'metrics.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.metricsConfigured).toBe(true);
    });

    it('should detect prometheus.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'prometheus.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.metricsConfigured).toBe(true);
    });

    it('should detect datadog.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'datadog.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.metricsConfigured).toBe(true);
    });

    it('should detect newrelic.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'newrelic.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.metricsConfigured).toBe(true);
    });

    it('should detect alerts.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'alerts.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.alertingConfigured).toBe(true);
    });

    it('should detect alertmanager.yml', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'alertmanager.yml'),
        'route:\n  receiver: default'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.alertingConfigured).toBe(true);
    });

    it('should detect pagerduty.config.js', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'pagerduty.config.js'),
        'module.exports = {};'
      );
      const result = validator.checkMonitoringSetup(tempDir, mockConfig);
      expect(result.alertingConfigured).toBe(true);
    });
  });

  describe('performanceValidator export', () => {
    it('should be an instance of PerformanceValidationChecker', () => {
      expect(performanceValidator).toBeInstanceOf(PerformanceValidationChecker);
    });

    it('should have validate method', () => {
      expect(typeof performanceValidator.validate).toBe('function');
    });

    it('should have checkPerformanceBenchmarking method', () => {
      expect(typeof performanceValidator.checkPerformanceBenchmarking).toBe(
        'function'
      );
    });

    it('should have checkMonitoringSetup method', () => {
      expect(typeof performanceValidator.checkMonitoringSetup).toBe('function');
    });
  });
});
