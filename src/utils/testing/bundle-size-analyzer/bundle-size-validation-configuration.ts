import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { BundleSizeTestingConfiguration } from './bundle-size-testing-configuration';

/**
 * Configuration mapping for metrics analysis (RULE 1: Single source of truth)
 * Consolidates keyword → metric type associations to eliminate duplicate checks
 */
interface MetricsMapping {
  keyword: string[] | undefined;
  metricIndex: number;
}

/**
 * Bundle Size Validation Configuration
 * Specialized analysis wrapper that uses BundleSizeTestingConfiguration
 * Eliminates hardcoded constants and duplication (RULE 1: Single source of truth)
 * Uses PatternMatchingUtils for keyword matching (meta-dogfooding)
 */
export class BundleSizeValidationConfiguration {
  /**
   * Delegate to BundleSizeTestingConfiguration for all patterns (RULE 1: No duplication)
   */
  static readonly CONFIG_PATTERNS =
    BundleSizeTestingConfiguration.BUNDLE_CONFIG_PATTERNS;

  /**
   * Delegate to BundleSizeTestingConfiguration (RULE 1: Single source of truth)
   */
  static readonly TEST_DIRECTORIES =
    BundleSizeTestingConfiguration.TEST_DIRECTORIES;

  /**
   * Delegate to BundleSizeTestingConfiguration (RULE 1: Single source of truth)
   */
  static readonly CI_CONFIG_FILES =
    BundleSizeTestingConfiguration.CI_CONFIG_FILES;

  /**
   * Delegate to BundleSizeTestingConfiguration (RULE 1: Single source of truth)
   */
  static readonly BUNDLE_KEYWORDS =
    BundleSizeTestingConfiguration.PERFORMANCE_KEYWORDS;

  /**
   * Metrics mapping configuration (RULE 1: Eliminate duplicate checks)
   * Maps keyword arrays to metric type indices for centralized analysis
   */
  private static readonly METRICS_ANALYSIS_MAP: MetricsMapping[] = [
    {
      keyword: BundleSizeTestingConfiguration.PERFORMANCE_KEYWORDS.BUNDLE_SIZE,
      metricIndex: 0,
    },
    {
      keyword: BundleSizeTestingConfiguration.PERFORMANCE_KEYWORDS.LIGHTHOUSE,
      metricIndex: 1,
    },
    {
      keyword:
        BundleSizeTestingConfiguration.PERFORMANCE_KEYWORDS.BUNDLE_ENFORCEMENT,
      metricIndex: 2,
    },
  ];

  /**
   * Helper method to safely retrieve metric type by index (RULE 2: Centralized logic)
   */
  private static getMetricType(index: number): string | undefined {
    return BundleSizeTestingConfiguration.PERFORMANCE_METRICS_TYPES[index];
  }

  /**
   * Core analysis method for detecting bundle size metrics in CI content
   * Uses PatternMatchingUtils for keyword matching (RULE 1: 100% coverage dogfooding)
   * Delegates to BundleSizeTestingConfiguration for all constants
   * Configuration-driven iteration eliminates duplicate if-checks (RULE 2: Optimize internals)
   */
  static analyzeMetricsInContent(content: string): string[] {
    const metrics: string[] = [];

    for (const mapping of this.METRICS_ANALYSIS_MAP) {
      if (
        mapping.keyword &&
        PatternMatchingUtils.hasAllPatterns(content, mapping.keyword)
      ) {
        const metricType = this.getMetricType(mapping.metricIndex);
        if (metricType) {
          metrics.push(metricType);
        }
      }
    }

    return metrics;
  }
}
