import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { BundleSizeTestingConfiguration } from './bundle-size-testing-configuration';
import { BundleSizeValidationConfiguration } from './bundle-size-validation-configuration';

/**
 * Bundle Size Testing Validation Patterns
 * Centralized validation logic for bundle size testing implementation
 */
export class BundleSizeValidationPatterns {
  /**
   * Master orchestrator method for complete bundle size testing validation
   */
  static validateAllBundleSizeTestingPatterns(projectRoot: string): {
    hasBundleSizeTests: boolean;
    tools: string[];
    configFiles: string[];
    testFiles: string[];
    metrics: string[];
  } {
    const bundleAnalysisTools: string[] = [];
    const bundleConfigFiles: string[] = [];
    const bundleSizeTests: string[] = [];
    const performanceMetrics: string[] = [];

    // Validate bundle analysis tools in package.json
    this.validateBundleAnalysisTools(projectRoot, bundleAnalysisTools);

    // Validate bundle configuration files
    this.validateBundleConfigFiles(projectRoot, bundleConfigFiles);

    // Validate bundle size test files
    this.validateBundleSizeTestFiles(projectRoot, bundleSizeTests);

    // Validate performance metrics in CI
    this.validatePerformanceMetrics(projectRoot, performanceMetrics);

    return {
      hasBundleSizeTests:
        bundleAnalysisTools.length > 0 ||
        bundleConfigFiles.length > 0 ||
        bundleSizeTests.length > 0,
      tools: bundleAnalysisTools,
      configFiles: bundleConfigFiles,
      testFiles: bundleSizeTests,
      metrics: performanceMetrics,
    };
  }

  /**
   * Validate bundle analysis tools in package.json
   */
  static validateBundleAnalysisTools(
    projectRoot: string,
    tools: string[]
  ): void {
    const allDependencies =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    if (Object.keys(allDependencies).length === 0) {
      return;
    }

    for (const tool of BundleSizeTestingConfiguration.BUNDLE_ANALYSIS_TOOLS) {
      if (allDependencies[tool]) {
        tools.push(tool);
      }
    }
  }

  /**
   * Validate bundle configuration files
   */
  static validateBundleConfigFiles(
    projectRoot: string,
    configFiles: string[]
  ): void {
    for (const pattern of BundleSizeValidationConfiguration.CONFIG_PATTERNS) {
      const configPath = PathOperations.join(projectRoot, pattern);
      if (FileUtils.exists(configPath)) {
        configFiles.push(configPath);
      }
    }
  }

  /**
   * Validate bundle size test files
   */
  static validateBundleSizeTestFiles(
    projectRoot: string,
    testFiles: string[]
  ): void {
    for (const dir of BundleSizeValidationConfiguration.TEST_DIRECTORIES) {
      const testDir = PathOperations.join(projectRoot, dir);
      if (FileUtils.isDirectory(testDir)) {
        this.scanDirForBundleSizeTests(testDir, testFiles);
      }
    }
  }

  /**
   * Recursively scan directory for bundle size test files
   */
  private static scanDirForBundleSizeTests(
    dirPath: string,
    testFiles: string[]
  ): void {
    try {
      const entries = FileSystemOperations.readDirectory(dirPath);

      for (const entry of entries) {
        const fullPath = PathOperations.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          this.scanDirForBundleSizeTests(fullPath, testFiles);
        } else if (this.isBundleSizeTestFile(fullPath)) {
          if (!testFiles.includes(fullPath)) {
            testFiles.push(fullPath);
          }
        }
      }
    } catch (_error) {
      // Ignore directory read errors
    }
  }

  /**
   * Check if file matches bundle size test patterns
   */
  private static isBundleSizeTestFile(filePath: string): boolean {
    return BundleSizeTestingConfiguration.BUNDLE_TEST_PATTERNS.some(pattern =>
      pattern.test(filePath)
    );
  }

  /**
   * Validate performance metrics in CI configuration
   */
  static validatePerformanceMetrics(
    projectRoot: string,
    metrics: string[]
  ): void {
    for (const ciFile of BundleSizeValidationConfiguration.CI_CONFIG_FILES) {
      const ciPath = PathOperations.join(projectRoot, ciFile);
      if (FileUtils.exists(ciPath)) {
        this.processMetricsFromCIFile(ciPath, metrics);
      }
    }
  }

  /**
   * Process metrics from a single CI file
   */
  private static processMetricsFromCIFile(
    ciPath: string,
    metrics: string[]
  ): void {
    try {
      const content = FileSystemOperations.readFile(ciPath);
      if (!content) {
        return;
      }

      const contentStr = `${content}`; // Force string type
      const detectedMetrics =
        BundleSizeValidationConfiguration.analyzeMetricsInContent(contentStr);
      for (const metric of detectedMetrics) {
        if (!metrics.includes(metric)) {
          metrics.push(metric);
        }
      }
    } catch (_error) {
      // Ignore file read errors
    }
  }
}
