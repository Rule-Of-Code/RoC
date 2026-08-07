/**
 * Tests for UnitTestPerformanceTestingConstants
 *
 * Tests performance testing patterns, validation methods, and score calculations.
 */
import { UnitTestPerformanceTestingConstants } from '../../../src/laws/testing/unit-test-performance-testing/constants/performance-testing';

describe('UnitTestPerformanceTestingConstants', () => {
  describe('PERFORMANCE_TEST_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS
        )
      ).toBe(true);
      expect(
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS.length
      ).toBeGreaterThan(0);
      UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS.forEach(
        pattern => {
          expect(pattern).toBeInstanceOf(RegExp);
        }
      );
    });

    it('should match perf.test.ts files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS;
      expect(patterns.some(p => p.test('component.perf.test.ts'))).toBe(true);
    });

    it('should match performance.test.ts files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS;
      expect(patterns.some(p => p.test('app.performance.test.ts'))).toBe(true);
    });

    it('should match load-test.ts files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS;
      expect(patterns.some(p => p.test('api.load-test.ts'))).toBe(true);
    });

    it('should match stress-test.ts files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS;
      expect(patterns.some(p => p.test('server.stress-test.ts'))).toBe(true);
    });

    it('should match benchmark.ts files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_TEST_PATTERNS;
      expect(patterns.some(p => p.test('sort.benchmark.ts'))).toBe(true);
    });
  });

  describe('LOAD_TESTING_TOOLS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS)
      ).toBe(true);
      expect(
        UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS.length
      ).toBeGreaterThan(0);
    });

    it('should match artillery', () => {
      const patterns = UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS;
      expect(patterns.some(p => p.test('artillery'))).toBe(true);
      expect(patterns.some(p => p.test('Artillery'))).toBe(true);
    });

    it('should match k6', () => {
      const patterns = UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS;
      expect(patterns.some(p => p.test('k6'))).toBe(true);
    });

    it('should match locust', () => {
      const patterns = UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS;
      expect(patterns.some(p => p.test('locust'))).toBe(true);
    });

    it('should match jmeter', () => {
      const patterns = UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS;
      expect(patterns.some(p => p.test('jmeter'))).toBe(true);
    });

    it('should match gatling', () => {
      const patterns = UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS;
      expect(patterns.some(p => p.test('gatling'))).toBe(true);
    });
  });

  describe('LOAD_TESTING_CONFIG_FILES', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES
        )
      ).toBe(true);
    });

    it('should match artillery.yaml', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES;
      expect(patterns.some(p => p.test('artillery.yaml'))).toBe(true);
      expect(patterns.some(p => p.test('artillery.yml'))).toBe(true);
      expect(patterns.some(p => p.test('artillery.json'))).toBe(true);
    });

    it('should match k6.js', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES;
      expect(patterns.some(p => p.test('k6.js'))).toBe(true);
    });

    it('should match locustfile.py', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES;
      expect(patterns.some(p => p.test('locustfile.py'))).toBe(true);
    });

    it('should match jmeter.jmx', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES;
      expect(patterns.some(p => p.test('jmeter.jmx'))).toBe(true);
    });
  });

  describe('BUNDLE_SIZE_TOOLS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(UnitTestPerformanceTestingConstants.BUNDLE_SIZE_TOOLS)
      ).toBe(true);
    });

    it('should match webpack-bundle-analyzer', () => {
      const patterns = UnitTestPerformanceTestingConstants.BUNDLE_SIZE_TOOLS;
      expect(patterns.some(p => p.test('webpack-bundle-analyzer'))).toBe(true);
    });

    it('should match size-limit', () => {
      const patterns = UnitTestPerformanceTestingConstants.BUNDLE_SIZE_TOOLS;
      expect(patterns.some(p => p.test('size-limit'))).toBe(true);
    });

    it('should match bundlesize', () => {
      const patterns = UnitTestPerformanceTestingConstants.BUNDLE_SIZE_TOOLS;
      expect(patterns.some(p => p.test('bundlesize'))).toBe(true);
    });
  });

  describe('BUNDLE_SIZE_CONFIG_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.BUNDLE_SIZE_CONFIG_PATTERNS
        )
      ).toBe(true);
    });

    it('should match .bundlesize.json', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.BUNDLE_SIZE_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('.bundlesize.json'))).toBe(true);
    });

    it('should match .size-limit.json', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.BUNDLE_SIZE_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('.size-limit.json'))).toBe(true);
    });
  });

  describe('WEB_VITALS_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(UnitTestPerformanceTestingConstants.WEB_VITALS_PATTERNS)
      ).toBe(true);
    });

    it('should match web-vitals', () => {
      const patterns = UnitTestPerformanceTestingConstants.WEB_VITALS_PATTERNS;
      expect(patterns.some(p => p.test('web-vitals'))).toBe(true);
    });

    it('should match lighthouse', () => {
      const patterns = UnitTestPerformanceTestingConstants.WEB_VITALS_PATTERNS;
      expect(patterns.some(p => p.test('lighthouse'))).toBe(true);
    });

    it('should match Core Web Vitals metrics', () => {
      const patterns = UnitTestPerformanceTestingConstants.WEB_VITALS_PATTERNS;
      expect(patterns.some(p => p.test('CLS'))).toBe(true);
      expect(patterns.some(p => p.test('LCP'))).toBe(true);
      expect(patterns.some(p => p.test('FID'))).toBe(true);
      expect(patterns.some(p => p.test('TTFB'))).toBe(true);
    });
  });

  describe('WEB_VITALS_CONFIG_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.WEB_VITALS_CONFIG_PATTERNS
        )
      ).toBe(true);
    });

    it('should match lighthouse.json', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.WEB_VITALS_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('lighthouse.json'))).toBe(true);
    });

    it('should match web-vitals.config.js', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.WEB_VITALS_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('web-vitals.config.js'))).toBe(true);
    });

    it('should match .lighthouserc files', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.WEB_VITALS_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('.lighthouserc'))).toBe(true);
      expect(patterns.some(p => p.test('.lighthouserc.json'))).toBe(true);
    });
  });

  describe('PERFORMANCE_MONITORING_TOOLS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS
        )
      ).toBe(true);
    });

    it('should match new-relic', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('new-relic'))).toBe(true);
    });

    it('should match datadog', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('datadog'))).toBe(true);
    });

    it('should match elastic', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('elastic'))).toBe(true);
    });

    it('should match prometheus', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('prometheus'))).toBe(true);
    });

    it('should match grafana', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('grafana'))).toBe(true);
    });

    it('should match dynatrace', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS;
      expect(patterns.some(p => p.test('dynatrace'))).toBe(true);
    });
  });

  describe('PERFORMANCE_MONITORING_CONFIG_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_CONFIG_PATTERNS
        )
      ).toBe(true);
    });

    it('should match newrelic.js', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('newrelic.js'))).toBe(true);
    });

    it('should match datadog.config.js', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('datadog.config.js'))).toBe(true);
    });

    it('should match prometheus.yaml', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_CONFIG_PATTERNS;
      expect(patterns.some(p => p.test('prometheus.yaml'))).toBe(true);
    });
  });

  describe('CRITICAL_FLOW_KEYWORDS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS
        )
      ).toBe(true);
    });

    it('should match login', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('login'))).toBe(true);
      expect(patterns.some(p => p.test('Login'))).toBe(true);
    });

    it('should match checkout', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('checkout'))).toBe(true);
    });

    it('should match payment', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('payment'))).toBe(true);
    });

    it('should match authentication', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('authentication'))).toBe(true);
    });

    it('should match registration', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('registration'))).toBe(true);
    });

    it('should match purchase', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('purchase'))).toBe(true);
    });

    it('should match critical flow', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('critical flow'))).toBe(true);
      expect(patterns.some(p => p.test('critical-flow'))).toBe(true);
    });

    it('should match user journey', () => {
      const patterns =
        UnitTestPerformanceTestingConstants.CRITICAL_FLOW_KEYWORDS;
      expect(patterns.some(p => p.test('user journey'))).toBe(true);
      expect(patterns.some(p => p.test('user-journey'))).toBe(true);
    });
  });

  describe('PERFORMANCE_BUDGETS', () => {
    it('should have correct threshold values', () => {
      expect(
        UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.EXCELLENT
      ).toBe(100);
      expect(
        UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.VERY_GOOD
      ).toBe(90);
      expect(UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.GOOD).toBe(
        80
      );
      expect(
        UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.ACCEPTABLE
      ).toBe(70);
      expect(UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.POOR).toBe(
        50
      );
      expect(
        UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS.CRITICAL
      ).toBe(0);
    });

    it('should have thresholds in descending order', () => {
      const budgets = UnitTestPerformanceTestingConstants.PERFORMANCE_BUDGETS;
      expect(budgets.EXCELLENT).toBeGreaterThan(budgets.VERY_GOOD);
      expect(budgets.VERY_GOOD).toBeGreaterThan(budgets.GOOD);
      expect(budgets.GOOD).toBeGreaterThan(budgets.ACCEPTABLE);
      expect(budgets.ACCEPTABLE).toBeGreaterThan(budgets.POOR);
      expect(budgets.POOR).toBeGreaterThan(budgets.CRITICAL);
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have correct deduction values', () => {
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS
          .NO_PERFORMANCE_TESTS
      ).toBe(25);
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS.NO_LOAD_TESTING
      ).toBe(15);
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS
          .NO_BUNDLE_SIZE_TESTS
      ).toBe(20);
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS.NO_WEB_VITALS
      ).toBe(20);
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS.NO_MONITORING
      ).toBe(10);
      expect(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS
          .NO_CRITICAL_FLOW_TESTS
      ).toBe(10);
    });

    it('should have all deductions sum to 100', () => {
      const total = Object.values(
        UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS
      ).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(100);
    });
  });

  describe('isPerformanceTestFile', () => {
    it('should return true for perf.test.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'component.perf.test.ts'
        )
      ).toBe(true);
    });

    it('should return true for performance.test.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'app.performance.test.ts'
        )
      ).toBe(true);
    });

    it('should return true for .perf.spec.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'widget.perf.spec.ts'
        )
      ).toBe(true);
    });

    it('should return true for load-test.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'api.load-test.ts'
        )
      ).toBe(true);
    });

    it('should return true for stress-test.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'server.stress-test.ts'
        )
      ).toBe(true);
    });

    it('should return true for benchmark.ts files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'sort.benchmark.ts'
        )
      ).toBe(true);
    });

    it('should return false for regular test files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'component.test.ts'
        )
      ).toBe(false);
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'service.spec.ts'
        )
      ).toBe(false);
    });

    it('should return false for non-test files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile(
          'component.ts'
        )
      ).toBe(false);
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceTestFile('service.js')
      ).toBe(false);
    });
  });

  describe('hasLoadTestingSetup', () => {
    it('should return true when artillery is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'import artillery from "artillery"'
        )
      ).toBe(true);
    });

    it('should return true when k6 is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'import k6 from "k6"'
        )
      ).toBe(true);
    });

    it('should return true when locust is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'from locust import HttpUser'
        )
      ).toBe(true);
    });

    it('should return true when jmeter is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'using jmeter config'
        )
      ).toBe(true);
    });

    it('should return true when gatling is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'import gatling'
        )
      ).toBe(true);
    });

    it('should return false when no load testing tool is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasLoadTestingSetup(
          'import { Component } from "@angular/core"'
        )
      ).toBe(false);
    });
  });

  describe('isLoadTestingConfig', () => {
    it('should return true for artillery.yaml', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig(
          'artillery.yaml'
        )
      ).toBe(true);
    });

    it('should return true for artillery.yml', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('artillery.yml')
      ).toBe(true);
    });

    it('should return true for artillery.json', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig(
          'artillery.json'
        )
      ).toBe(true);
    });

    it('should return true for k6.js', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('k6.js')
      ).toBe(true);
    });

    it('should return true for locustfile.py', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('locustfile.py')
      ).toBe(true);
    });

    it('should return true for jmeter.jmx', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('jmeter.jmx')
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('config.json')
      ).toBe(false);
      expect(
        UnitTestPerformanceTestingConstants.isLoadTestingConfig('test.js')
      ).toBe(false);
    });
  });

  describe('hasBundleSizeTesting', () => {
    it('should return true when webpack-bundle-analyzer is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasBundleSizeTesting(
          'import webpack-bundle-analyzer'
        )
      ).toBe(true);
    });

    it('should return true when size-limit is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasBundleSizeTesting(
          'using size-limit'
        )
      ).toBe(true);
    });

    it('should return true when bundlesize is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasBundleSizeTesting(
          'bundlesize check'
        )
      ).toBe(true);
    });

    it('should return false when no bundle size tool is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasBundleSizeTesting(
          'import { Component }'
        )
      ).toBe(false);
    });
  });

  describe('isBundleSizeConfig', () => {
    it('should return true for .bundlesize.json', () => {
      expect(
        UnitTestPerformanceTestingConstants.isBundleSizeConfig(
          '.bundlesize.json'
        )
      ).toBe(true);
    });

    it('should return true for .size-limit.json', () => {
      expect(
        UnitTestPerformanceTestingConstants.isBundleSizeConfig(
          '.size-limit.json'
        )
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isBundleSizeConfig('package.json')
      ).toBe(false);
    });
  });

  describe('hasWebVitalsTesting', () => {
    it('should return true when web-vitals is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting(
          'import { getCLS } from "web-vitals"'
        )
      ).toBe(true);
    });

    it('should return true when lighthouse is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting(
          'lighthouse audit'
        )
      ).toBe(true);
    });

    it('should return true when CLS is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting('measure CLS')
      ).toBe(true);
    });

    it('should return true when LCP is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting('check LCP')
      ).toBe(true);
    });

    it('should return true when FID is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting('monitor FID')
      ).toBe(true);
    });

    it('should return true when TTFB is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting(
          'TTFB threshold'
        )
      ).toBe(true);
    });

    it('should return false when no web vitals are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting(
          'regular test code'
        )
      ).toBe(false);
    });
  });

  describe('isWebVitalsConfig', () => {
    it('should return true for lighthouse.json', () => {
      expect(
        UnitTestPerformanceTestingConstants.isWebVitalsConfig('lighthouse.json')
      ).toBe(true);
    });

    it('should return true for web-vitals.config.js', () => {
      expect(
        UnitTestPerformanceTestingConstants.isWebVitalsConfig(
          'web-vitals.config.js'
        )
      ).toBe(true);
    });

    it('should return true for .lighthouserc', () => {
      expect(
        UnitTestPerformanceTestingConstants.isWebVitalsConfig('.lighthouserc')
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isWebVitalsConfig('config.js')
      ).toBe(false);
    });
  });

  describe('hasPerformanceMonitoring', () => {
    it('should return true when new-relic is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'new-relic integration'
        )
      ).toBe(true);
    });

    it('should return true when datadog is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'datadog metrics'
        )
      ).toBe(true);
    });

    it('should return true when elastic is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'elastic apm'
        )
      ).toBe(true);
    });

    it('should return true when prometheus is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'prometheus exporter'
        )
      ).toBe(true);
    });

    it('should return true when grafana is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'grafana dashboard'
        )
      ).toBe(true);
    });

    it('should return true when dynatrace is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'dynatrace agent'
        )
      ).toBe(true);
    });

    it('should return false when no monitoring tool is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasPerformanceMonitoring(
          'regular code'
        )
      ).toBe(false);
    });
  });

  describe('isPerformanceMonitoringConfig', () => {
    it('should return true for newrelic.js', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceMonitoringConfig(
          'newrelic.js'
        )
      ).toBe(true);
    });

    it('should return true for datadog.config.js', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceMonitoringConfig(
          'datadog.config.js'
        )
      ).toBe(true);
    });

    it('should return true for prometheus.yaml', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceMonitoringConfig(
          'prometheus.yaml'
        )
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        UnitTestPerformanceTestingConstants.isPerformanceMonitoringConfig(
          'app.config.js'
        )
      ).toBe(false);
    });
  });

  describe('hasCriticalFlowTesting', () => {
    it('should return true for login tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'test login performance'
        )
      ).toBe(true);
    });

    it('should return true for checkout tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'checkout flow test'
        )
      ).toBe(true);
    });

    it('should return true for payment tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'payment processing'
        )
      ).toBe(true);
    });

    it('should return true for authentication tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'authentication flow'
        )
      ).toBe(true);
    });

    it('should return true for registration tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'user registration'
        )
      ).toBe(true);
    });

    it('should return true for purchase tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'purchase completion'
        )
      ).toBe(true);
    });

    it('should return true for critical flow tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'critical flow validation'
        )
      ).toBe(true);
    });

    it('should return true for user journey tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(
          'user journey test'
        )
      ).toBe(true);
    });

    it('should return false for non-critical tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.hasCriticalFlowTesting('unit test')
      ).toBe(false);
    });
  });

  describe('getDeductionForMissingComponent', () => {
    it('should return correct deduction for NO_PERFORMANCE_TESTS', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_PERFORMANCE_TESTS'
        )
      ).toBe(25);
    });

    it('should return correct deduction for NO_LOAD_TESTING', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_LOAD_TESTING'
        )
      ).toBe(15);
    });

    it('should return correct deduction for NO_BUNDLE_SIZE_TESTS', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_BUNDLE_SIZE_TESTS'
        )
      ).toBe(20);
    });

    it('should return correct deduction for NO_WEB_VITALS', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_WEB_VITALS'
        )
      ).toBe(20);
    });

    it('should return correct deduction for NO_MONITORING', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_MONITORING'
        )
      ).toBe(10);
    });

    it('should return correct deduction for NO_CRITICAL_FLOW_TESTS', () => {
      expect(
        UnitTestPerformanceTestingConstants.getDeductionForMissingComponent(
          'NO_CRITICAL_FLOW_TESTS'
        )
      ).toBe(10);
    });
  });

  describe('isComprehensivePerformanceTesting', () => {
    it('should return true when has performance tests and 2+ components', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          true,
          true,
          false,
          false
        )
      ).toBe(true);
    });

    it('should return true when has performance tests and all components', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          true,
          true,
          true,
          true
        )
      ).toBe(true);
    });

    it('should return false when missing performance tests', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          false,
          true,
          true,
          true,
          true
        )
      ).toBe(false);
    });

    it('should return false when has performance tests but only 1 component', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          true,
          false,
          false,
          false
        )
      ).toBe(false);
    });

    it('should return false when has performance tests but no other components', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          false,
          false,
          false,
          false
        )
      ).toBe(false);
    });

    it('should return true when has performance tests with exactly 2 components', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          false,
          true,
          true,
          false
        )
      ).toBe(true);
    });

    it('should return true with web vitals and monitoring', () => {
      expect(
        UnitTestPerformanceTestingConstants.isComprehensivePerformanceTesting(
          true,
          false,
          false,
          true,
          true
        )
      ).toBe(true);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 0 when no components are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          false,
          false,
          false,
          false,
          false
        )
      ).toBe(0);
    });

    it('should return 20 when 1 component is present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          true,
          false,
          false,
          false,
          false
        )
      ).toBe(20);
    });

    it('should return 40 when 2 components are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          true,
          true,
          false,
          false,
          false
        )
      ).toBe(40);
    });

    it('should return 60 when 3 components are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          true,
          true,
          true,
          false,
          false
        )
      ).toBe(60);
    });

    it('should return 80 when 4 components are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          true,
          true,
          true,
          true,
          false
        )
      ).toBe(80);
    });

    it('should return 100 when all 5 components are present', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          true,
          true,
          true,
          true,
          true
        )
      ).toBe(100);
    });

    it('should calculate correctly for various combinations', () => {
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          false,
          true,
          false,
          true,
          false
        )
      ).toBe(40);
      expect(
        UnitTestPerformanceTestingConstants.calculateCoverage(
          false,
          false,
          true,
          true,
          true
        )
      ).toBe(60);
    });
  });
});
