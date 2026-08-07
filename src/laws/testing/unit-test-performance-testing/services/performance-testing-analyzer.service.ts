import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { ConfigFileUtils } from '../../../../utils/config-file-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { TestAnalyzerMixin } from '../../test-analyzer-mixin';
import { UnitTestPerformanceTestingConstants } from '../constants/performance-testing';

/**
 * UnitTestPerformanceTestingAnalyzerService
 *
 * Orchestrates performance testing analysis by coordinating:
 * - Performance test file discovery
 * - Load testing configuration detection
 * - Bundle size testing verification
 * - Web Vitals testing identification
 * - Performance monitoring integration detection
 * - Critical flow performance test identification
 *
 * Delegates all pattern matching to Constants for single source of truth.
 */
export class UnitTestPerformanceTestingAnalyzerService extends TestAnalyzerMixin {
  /**
   * Analyze performance test file coverage
   */
  static analyzePerformanceTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    testFiles: string[];
    testCount: number;
    hasCriticalFlowTests: boolean;
  } {
    try {
      const testFiles = this.findPerformanceTestFiles(projectRoot, config);
      let hasCriticalFlowTests = false;

      for (const testFile of testFiles) {
        try {
          const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
          if (
            UnitTestPerformanceTestingConstants.hasCriticalFlowTesting(content)
          ) {
            hasCriticalFlowTests = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }

      return {
        testFiles,
        testCount: testFiles.length,
        hasCriticalFlowTests,
      };
    } catch (_error) {
      return { testFiles: [], testCount: 0, hasCriticalFlowTests: false };
    }
  }

  /**
   * Analyze load testing configuration
   */
  static analyzeLoadTesting(projectRoot: string): {
    hasLoadTesting: boolean;
    configFiles: string[];
    tools: string[];
  } {
    try {
      const configFiles = this.findLoadTestingConfigs(projectRoot);
      const tools: string[] = [];

      if (
        this.checkPackageJsonFor(
          projectRoot,
          UnitTestPerformanceTestingConstants.hasLoadTestingSetup
        )
      ) {
        tools.push('detected-in-package.json');
      }

      return {
        hasLoadTesting: configFiles.length > 0 || tools.length > 0,
        configFiles,
        tools,
      };
    } catch (_error) {
      return { hasLoadTesting: false, configFiles: [], tools: [] };
    }
  }

  /**
   * Analyze bundle size testing setup
   */
  static analyzeBundleSizeTesting(projectRoot: string): {
    hasBundleSizeTesting: boolean;
    configFiles: string[];
  } {
    try {
      const configFiles = this.findBundleSizeConfigs(projectRoot);

      const hasInPackageJson = this.checkPackageJsonFor(
        projectRoot,
        UnitTestPerformanceTestingConstants.hasBundleSizeTesting
      );

      return {
        hasBundleSizeTesting: configFiles.length > 0 || hasInPackageJson,
        configFiles,
      };
    } catch (_error) {
      return { hasBundleSizeTesting: false, configFiles: [] };
    }
  }

  /**
   * Analyze Web Vitals testing setup
   */
  static analyzeWebVitalsTesting(projectRoot: string): {
    hasWebVitalsTesting: boolean;
    configFiles: string[];
  } {
    try {
      const configFiles = this.findWebVitalsConfigs(projectRoot);

      const hasInPackageJson = this.checkPackageJsonFor(
        projectRoot,
        UnitTestPerformanceTestingConstants.hasWebVitalsTesting
      );

      return {
        hasWebVitalsTesting: configFiles.length > 0 || hasInPackageJson,
        configFiles,
      };
    } catch (_error) {
      return { hasWebVitalsTesting: false, configFiles: [] };
    }
  }

  /**
   * Analyze performance monitoring integration
   */
  static analyzePerformanceMonitoring(projectRoot: string): {
    hasPerformanceMonitoring: boolean;
    configFiles: string[];
    tools: string[];
  } {
    try {
      const configFiles = this.findPerformanceMonitoringConfigs(projectRoot);
      const tools: string[] = [];

      if (
        this.checkPackageJsonFor(
          projectRoot,
          UnitTestPerformanceTestingConstants.hasPerformanceMonitoring
        )
      ) {
        tools.push('detected-in-package.json');
      }

      return {
        hasPerformanceMonitoring: configFiles.length > 0 || tools.length > 0,
        configFiles,
        tools,
      };
    } catch (_error) {
      return { hasPerformanceMonitoring: false, configFiles: [], tools: [] };
    }
  }

  /**
   * Find performance test files in the project
   */
  private static findPerformanceTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const searchDirs = this.buildTestSearchDirs(projectRoot, ['performance']);
    return this.findTestFilesInDirectories(
      projectRoot,
      searchDirs,
      UnitTestPerformanceTestingConstants.isPerformanceTestFile,
      config
    );
  }

  /**
   * Find load testing config files
   */
  private static findLoadTestingConfigs(projectRoot: string): string[] {
    const configFiles: string[] = [];
    const files = this.getAllConfigFiles(projectRoot);

    files.forEach(file => {
      if (UnitTestPerformanceTestingConstants.isLoadTestingConfig(file)) {
        configFiles.push(file);
      }
    });

    return configFiles;
  }

  /**
   * Find bundle size testing config files
   */
  private static findBundleSizeConfigs(projectRoot: string): string[] {
    const configFiles: string[] = [];
    const files = this.getAllConfigFiles(projectRoot);

    files.forEach(file => {
      if (UnitTestPerformanceTestingConstants.isBundleSizeConfig(file)) {
        configFiles.push(file);
      }
    });

    return configFiles;
  }

  /**
   * Find Web Vitals config files
   */
  private static findWebVitalsConfigs(projectRoot: string): string[] {
    const configFiles: string[] = [];
    const files = this.getAllConfigFiles(projectRoot);

    files.forEach(file => {
      if (UnitTestPerformanceTestingConstants.isWebVitalsConfig(file)) {
        configFiles.push(file);
      }
    });

    return configFiles;
  }

  /**
   * Find performance monitoring config files
   */
  private static findPerformanceMonitoringConfigs(
    projectRoot: string
  ): string[] {
    const configFiles: string[] = [];
    const files = this.getAllConfigFiles(projectRoot);

    files.forEach(file => {
      if (
        UnitTestPerformanceTestingConstants.isPerformanceMonitoringConfig(file)
      ) {
        configFiles.push(file);
      }
    });

    return configFiles;
  }

  /**
   * Get all config files in project root
   */
  private static getAllConfigFiles(projectRoot: string): string[] {
    const configFiles: string[] = [];

    try {
      if (FileUtils.exists(projectRoot)) {
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        return CheckerUtils.findTypeScriptFiles(projectRoot, config);
      }
    } catch (_error) {
      // Return empty list on error
    }

    return configFiles;
  }

  /**
   * Check package.json for patterns
   */
  private static checkPackageJsonFor(
    projectRoot: string,
    checker: (content: string) => boolean
  ): boolean {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const content = FileUtils.readFile(packageJsonPath, {
          encoding: 'utf8',
        });
        return checker(content);
      } catch (_error) {
        return false;
      }
    }
    return false;
  }
}
