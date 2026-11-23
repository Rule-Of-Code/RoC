import { CodeText } from '../../../../utils/code-text';
import { FileUtils } from '../../../../utils/file-utils';

/**
 * UnitTestPerformanceTestingConstants
 *
 * Centralized configuration for performance testing validation.
 * All performance testing rules, thresholds, file patterns, and detection logic.
 *
 * Covers:
 * - Performance test file discovery and patterns
 * - Load testing configuration detection
 * - Bundle size testing requirements
 * - Core Web Vitals testing validation
 * - Performance monitoring integration
 * - Critical flow performance test identification
 *
 * Single source of truth for all performance testing validation rules.
 */
export class UnitTestPerformanceTestingConstants {
  // Performance test file patterns
  static readonly PERFORMANCE_TEST_PATTERNS = [
    /perf\.test\.ts$/,
    /performance\.test\.ts$/,
    /\.perf\.spec\.ts$/,
    /performance-test\.ts$/,
    /load-test\.ts$/,
    /stress-test\.ts$/,
    /benchmark\.ts$/,
  ];

  // Load testing tool patterns
  static readonly LOAD_TESTING_TOOLS = [
    /artillery/i,
    /k6/i,
    /locust/i,
    /jmeter/i,
    /gatling/i,
  ];

  // Load testing config file patterns
  static readonly LOAD_TESTING_CONFIG_FILES = [
    /artillery\.(yaml|yml|json)$/,
    /k6\.js$/,
    /locustfile\.py$/,
    /jmeter\.jmx$/,
  ];

  // Bundle size testing patterns
  static readonly BUNDLE_SIZE_TOOLS = [
    /webpack-bundle-analyzer/i,
    /size-limit/i,
    /bundlesize/i,
    /bundle-analyzer/i,
  ];

  // Bundle size config patterns
  static readonly BUNDLE_SIZE_CONFIG_PATTERNS = [
    /\.bundlesize\.json$/,
    /\.size-limit\.json$/,
    /webpack-bundle-analyzer/,
  ];

  // Web Vitals testing patterns
  static readonly WEB_VITALS_PATTERNS = [
    /web-vitals/i,
    /lighthouse/i,
    /pageSpeedInsights/i,
    /CLS|LCP|FID|TTFB/,
  ];

  // Web Vitals config patterns
  static readonly WEB_VITALS_CONFIG_PATTERNS = [
    /lighthouse\.json$/,
    /web-vitals\.config\.js$/,
    /\.lighthouserc/,
  ];

  // Performance monitoring tools
  static readonly PERFORMANCE_MONITORING_TOOLS = [
    /new-relic/i,
    /datadog/i,
    /elastic/i,
    /prometheus/i,
    /grafana/i,
    /dynatrace/i,
  ];

  // Performance monitoring config patterns
  static readonly PERFORMANCE_MONITORING_CONFIG_PATTERNS = [
    /newrelic\.js$/,
    /datadog\.config\.js$/,
    /elastic\.config\.js$/,
    /prometheus\.yaml$/,
  ];

  // Critical flow test keywords
  static readonly CRITICAL_FLOW_KEYWORDS = [
    /login/i,
    /checkout/i,
    /payment/i,
    /authentication/i,
    /registration/i,
    /purchase/i,
    /critical.*flow/i,
    /user.*journey/i,
  ];

  // Performance budget thresholds
  static readonly PERFORMANCE_BUDGETS = {
    EXCELLENT: 100,
    VERY_GOOD: 90,
    GOOD: 80,
    ACCEPTABLE: 70,
    POOR: 50,
    CRITICAL: 0,
  };

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    NO_PERFORMANCE_TESTS: 25,
    NO_LOAD_TESTING: 15,
    NO_BUNDLE_SIZE_TESTS: 20,
    NO_WEB_VITALS: 20,
    NO_MONITORING: 10,
    NO_CRITICAL_FLOW_TESTS: 10,
  };

  /**
   * Check if filename matches performance test patterns
   */
  static isPerformanceTestFile(filename: string): boolean {
    const self = UnitTestPerformanceTestingConstants;
    if (self.PERFORMANCE_TEST_PATTERNS.some(pattern => pattern.test(filename)))
      return true;
    // A name is one way in, not the only one (#554): a spec whose code
    // compares a measured duration with a budget is a performance test,
    // whatever it is called.
    if (!self.TEST_FILE.test(filename)) return false;
    try {
      return self.assertsTimingBudget(
        FileUtils.readFile(filename, { encoding: 'utf8' })
      );
    } catch {
      return false;
    }
  }

  /** A test file by name: `.spec.`, `.test.` or `.e2e-spec.`. */
  private static readonly TEST_FILE = /\.(?:spec|test|e2e-spec)\.[cm]?[jt]sx?$/;

  /** A clock read that a measured duration is taken from. */
  static readonly CLOCK_READ = /\b(?:performance|Date)\.now\s*\(\s*\)/;

  /** A value compared with an upper bound: the budget. */
  static readonly BUDGET_ASSERTION = /\.toBeLessThan(?:OrEqual)?\s*\(/;

  /** Code that drives a browser or a device through a user flow. */
  static readonly USER_FLOW_DRIVER =
    /\b(?:page\.goto|cy\.visit|browser\.url|device\.launchApp)\s*\(/;

  /**
   * Whether the CODE of a test file reads the clock and asserts an upper
   * bound (#554): `const ms = performance.now() - start;
   * expect(ms).toBeLessThan(BUDGET_MS)`. Comments and strings are not code,
   * so a detector's fixture string holding the same text is not one.
   */
  static assertsTimingBudget(content: string): boolean {
    const self = UnitTestPerformanceTestingConstants;
    const code = CodeText.stripCommentsAndStrings(content);
    return self.CLOCK_READ.test(code) && self.BUDGET_ASSERTION.test(code);
  }

  /**
   * Check if content indicates load testing setup
   */
  static hasLoadTestingSetup(content: string): boolean {
    return UnitTestPerformanceTestingConstants.LOAD_TESTING_TOOLS.some(
      pattern => pattern.test(content)
    );
  }

  /**
   * Check if filename is load testing config
   */
  static isLoadTestingConfig(filename: string): boolean {
    return UnitTestPerformanceTestingConstants.LOAD_TESTING_CONFIG_FILES.some(
      pattern => pattern.test(filename)
    );
  }

  /**
   * Check if content indicates bundle size testing
   */
  static hasBundleSizeTesting(content: string): boolean {
    return UnitTestPerformanceTestingConstants.BUNDLE_SIZE_TOOLS.some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Check if filename is bundle size config
   */
  static isBundleSizeConfig(filename: string): boolean {
    return UnitTestPerformanceTestingConstants.BUNDLE_SIZE_CONFIG_PATTERNS.some(
      pattern => pattern.test(filename)
    );
  }

  /**
   * Check if content indicates Web Vitals testing
   */
  static hasWebVitalsTesting(content: string): boolean {
    return UnitTestPerformanceTestingConstants.WEB_VITALS_PATTERNS.some(
      pattern => pattern.test(content)
    );
  }

  /**
   * Check if filename is Web Vitals config
   */
  static isWebVitalsConfig(filename: string): boolean {
    return UnitTestPerformanceTestingConstants.WEB_VITALS_CONFIG_PATTERNS.some(
      pattern => pattern.test(filename)
    );
  }

  /**
   * Check if content indicates performance monitoring
   */
  static hasPerformanceMonitoring(content: string): boolean {
    return UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_TOOLS.some(
      pattern => pattern.test(content)
    );
  }

  /**
   * Check if filename is performance monitoring config
   */
  static isPerformanceMonitoringConfig(filename: string): boolean {
    return UnitTestPerformanceTestingConstants.PERFORMANCE_MONITORING_CONFIG_PATTERNS.some(
      pattern => pattern.test(filename)
    );
  }

  /**
   * Check if test content indicates critical flow testing
   */
  static hasCriticalFlowTesting(content: string): boolean {
    const self = UnitTestPerformanceTestingConstants;
    if (self.CRITICAL_FLOW_KEYWORDS.some(pattern => pattern.test(content)))
      return true;
    // A budget asserted on a flow the test drives through a browser or a
    // device is a user-flow performance test, whatever the flow is called
    // (#554): a cold start or a first screen is as critical as a login.
    return (
      self.assertsTimingBudget(content) &&
      self.USER_FLOW_DRIVER.test(CodeText.stripCommentsAndStrings(content))
    );
  }

  /**
   * Get score deduction for missing component
   */
  static getDeductionForMissingComponent(
    component: keyof typeof this.SCORE_DEDUCTIONS
  ): number {
    return UnitTestPerformanceTestingConstants.SCORE_DEDUCTIONS[component];
  }

  /**
   * Determine if performance testing is comprehensive
   */
  static isComprehensivePerformanceTesting(
    hasPerformanceTests: boolean,
    hasLoadTesting: boolean,
    hasBundleSizeTesting: boolean,
    hasWebVitals: boolean,
    hasMonitoring: boolean
  ): boolean {
    // Must have at least performance tests and one additional component
    const components = [
      hasLoadTesting,
      hasBundleSizeTesting,
      hasWebVitals,
      hasMonitoring,
    ].filter(Boolean).length;

    return hasPerformanceTests && components >= 2;
  }

  /**
   * Calculate coverage percentage
   */
  static calculateCoverage(
    hasPerformanceTests: boolean,
    hasLoadTesting: boolean,
    hasBundleSizeTesting: boolean,
    hasWebVitals: boolean,
    hasMonitoring: boolean
  ): number {
    const components = [
      hasPerformanceTests,
      hasLoadTesting,
      hasBundleSizeTesting,
      hasWebVitals,
      hasMonitoring,
    ].filter(Boolean).length;

    return (components / 5) * 100;
  }
}
