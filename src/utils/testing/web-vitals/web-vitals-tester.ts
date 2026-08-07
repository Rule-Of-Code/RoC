import type { RuleOfCodeConfig } from '../../../config/types';
import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../file-utils';
import { FileSystemSearcher } from '../file-system-searcher';
import { WebVitalsConfiguration } from './web-vitals-configuration';

/**
 * Web Vitals Testing Inspector
 * Specialized utility for analyzing Core Web Vitals testing implementation
 */
export class WebVitalsTester {
  /**
   * Check for Core Web Vitals testing implementation
   */
  static checkWebVitalsTesting(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasWebVitalsTesting: boolean;
    tools: string[];
    testFiles: string[];
    lighthouseConfigs: string[];
    performanceMetrics: string[];
  } {
    const webVitalsTools: string[] = [];
    const webVitalsTests: string[] = [];
    const lighthouseConfig: string[] = [];
    const performanceMetrics: string[] = [];

    // Check for web vitals monitoring tools
    this.checkWebVitalsTools(projectRoot, webVitalsTools);

    // Check for web vitals test files - use FileSystemSearcher directly
    FileSystemSearcher.searchFilesRecursively(
      projectRoot,
      (filename: string) =>
        FileSystemSearcher.matchesPatterns(
          filename,
          WebVitalsConfiguration.TEST_PATTERNS
        ),
      (dirname: string) => WebVitalsConfiguration.shouldSkipDirectory(dirname),
      webVitalsTests,
      config
    );

    // Check for Lighthouse configuration - use FileSystemSearcher directly
    FileSystemSearcher.searchFilesRecursively(
      projectRoot,
      (filename: string) =>
        FileSystemSearcher.matchesExactName(
          filename,
          WebVitalsConfiguration.LIGHTHOUSE_CONFIG_FILES
        ),
      (dirname: string) => WebVitalsConfiguration.shouldSkipDirectory(dirname),
      lighthouseConfig,
      config
    );

    // Check for performance metrics monitoring
    this.checkPerformanceMetricsMonitoring(
      projectRoot,
      performanceMetrics,
      config
    );

    return {
      hasWebVitalsTesting:
        webVitalsTools.length > 0 ||
        webVitalsTests.length > 0 ||
        lighthouseConfig.length > 0,
      tools: webVitalsTools,
      testFiles: webVitalsTests,
      lighthouseConfigs: lighthouseConfig,
      performanceMetrics,
    };
  }

  /**
   * Check package.json for web vitals monitoring tools
   * RULE 2: Dogfood internals - use ProjectTypeDetectorValidation utility for safe dependency reading
   * Uses centralized configuration from WebVitalsConfiguration
   */
  private static checkWebVitalsTools(
    projectRoot: string,
    tools: string[]
  ): void {
    try {
      const allDependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      for (const lib of WebVitalsConfiguration.WEB_VITALS_LIBRARIES) {
        if (allDependencies[lib]) {
          tools.push(lib);
        }
      }
    } catch (_error) {
      // Ignore dependency reading errors
    }
  }

  /**
   * Check for performance metrics monitoring in source code
   * RULE 2: Dogfood internals - use WebVitalsPatternMatcher for centralized detection
   * RULE 1: Uses centralized metrics check configuration from WebVitalsConfiguration
   */
  private static checkPerformanceMetricsMonitoring(
    projectRoot: string,
    metrics: string[],
    config: RuleOfCodeConfig
  ): void {
    const sourceFiles = this.findRelevantSourceFiles(projectRoot, config);
    const metricsCheckConfig = WebVitalsConfiguration.METRICS_CHECK_CONFIG;

    for (const file of sourceFiles.slice(
      0,
      WebVitalsConfiguration.MAX_FILES_TO_ANALYZE
    )) {
      try {
        const content = FileUtils.readFile(file);

        for (const config of metricsCheckConfig) {
          if (config.checker(content)) {
            metrics.push(config.message);
          }
        }
      } catch (_error) {
        // Ignore file read errors
      }
    }
  }

  /**
   * Find relevant source files for analysis
   * RULE 2: Dogfood internals - use FileSystemSearcher and WebVitalsConfiguration
   */
  private static findRelevantSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const sourceFiles: string[] = [];
    FileSystemSearcher.searchFilesRecursively(
      projectRoot,
      (filename: string) =>
        FileSystemSearcher.hasExtension(
          filename,
          WebVitalsConfiguration.SOURCE_FILE_EXTENSIONS
        ) &&
        !FileSystemSearcher.containsPattern(
          filename,
          WebVitalsConfiguration.TEST_FILE_PATTERNS
        ),
      (dirname: string) => WebVitalsConfiguration.shouldSkipDirectory(dirname),
      sourceFiles,
      config
    );
    return sourceFiles;
  }
}
