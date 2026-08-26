import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { ConfigFileUtils } from '../../../../utils/config-file-utils';
import { FileSystemOperations } from '../../../../utils/file-system-operations';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { TestAnalyzerMixin } from '../../test-analyzer-mixin';
import { UnitTestPerformanceTestingConstants } from '../constants/performance-testing';
import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';

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
    } catch (error) {
      // A TypeError here is OUR bug, not a project without performance tests,
      // and returning the empty result made the two indistinguishable: the
      // predicate below was passed as a bare reference, lost its receiver,
      // threw on `this.PATTERNS`, and this catch reported "no performance test
      // files found" against a project that had one. A crash reported as a
      // clean result is worse than a wrong answer — it hides that anything
      // went wrong. Filesystem errors are still expected and still swallowed.
      if (error instanceof TypeError || error instanceof ReferenceError) {
        throw error;
      }
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

      // Declared build budgets ARE bundle-size testing, and an enforced kind:
      // the build fails on them. The check recognised four vendor names in
      // package.json and nothing else, so a project whose build breaks on a
      // 500kb initial bundle and a 4kb component stylesheet was told it does
      // not test bundle size — while this same tool reads those budgets in the
      // performance family two laws away.
      const hasDeclaredBudgets = AngularBundleConfig.hasBudgets(projectRoot);

      return {
        hasBundleSizeTesting:
          configFiles.length > 0 || hasInPackageJson || hasDeclaredBudgets,
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
  /**
   * CONFIG files — which is what every caller of this looks for, and what it
   * did not return.
   *
   * It called `findTypeScriptFiles`, which scans `.ts` and `.tsx` only. The
   * four sub-checks reading it search for `artillery.yml`, `k6.js`,
   * `locustfile.py`, `jmeter.jmx`, `.bundlesize.json`, `.size-limit.json`,
   * `lighthouse.json`, `.lighthouserc`, `newrelic.js`, `prometheus.yaml` —
   * not one of which is a TypeScript file. The branch could never be true, so
   * all four were decided entirely by a substring search in `package.json`.
   *
   * `findConfigFiles` sits one method below the one that was called, and scans
   * exactly the extensions these names use.
   */
  private static getAllConfigFiles(projectRoot: string): string[] {
    try {
      if (FileUtils.exists(projectRoot)) {
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        return [
          ...CheckerUtils.findConfigFiles(projectRoot, config),
          ...this.rootConfigFiles(projectRoot),
        ];
      }
    } catch (_error) {
      // Return empty list on error
    }

    return [];
  }

  /**
   * Configuration sitting at the project ROOT, which the shared scan misses
   * twice over.
   *
   * It skips names beginning with a dot — and the conventional spelling of
   * three of the four things these sub-checks look for is exactly that:
   * `.lighthouserc.json`, `.size-limit.json`, `.bundlesize.json`. Its config
   * extensions also cover `.config.js` but not a bare `.js`, so `newrelic.js`
   * and `datadog.js` were invisible as well.
   *
   * The root is where every one of these tools puts its file, so that is the
   * only directory widened here.
   */
  private static rootConfigFiles(projectRoot: string): string[] {
    const CONFIG_SUFFIXES = ['.json', '.yaml', '.yml', '.js', '.mjs', '.cjs'];

    try {
      return FileSystemOperations.readDirectory(projectRoot)
        .filter(entry => entry.isFile())
        .filter(entry =>
          CONFIG_SUFFIXES.some(suffix => entry.name.endsWith(suffix))
        )
        .map(entry => PathOperations.join(projectRoot, entry.name));
    } catch {
      return [];
    }
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
