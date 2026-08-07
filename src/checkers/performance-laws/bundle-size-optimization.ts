/**
 * Bundle Size Optimization Law
 * BundleSizeAnalyzer: Ensures bundle size stays within performance limits
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { AngularBundleConfig } from '../../utils/angular-bundle-config';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
// BundleSizeTestingConfiguration import removed - using direct pattern matching instead

export class BundleSizeOptimizationLaw {
  private static readonly OPTIMIZATION_KEYWORDS = [
    'optimize',
    'bundle',
    'minify',
    'compress',
    'tree-shake',
    'lazy-load',
  ];
  private static readonly BUNDLE_REPORTS = [
    'dist/bundle.js',
    'dist/bundle-analysis.html',
    'report.html',
  ];
  private static readonly ROUTING_FILE_PATTERN = 'routing';
  private static readonly LAZY_LOADING_KEYWORD = 'loadChildren';
  private static readonly VALIDATION_MESSAGES = {
    NO_BUNDLE_OPTIMIZATION: 'Bundle optimization configuration not found',
    NO_BUNDLE_OPTIMIZATION_SUGGESTION:
      'Configure webpack/build tool with bundle optimization plugins',
    NO_BUNDLE_ANALYSIS: 'No bundle analysis script found',
    NO_BUNDLE_ANALYSIS_SUGGESTION:
      'Add bundle analysis script to measure bundle size impact',
    NO_BUNDLE_REPORTS: 'No bundle reports found',
    NO_BUNDLE_REPORTS_SUGGESTION:
      'Generate bundle reports to monitor bundle size trends',
    LARGE_BUNDLE_SIZE: 'Bundle size may be too large',
    LARGE_BUNDLE_SIZE_SUGGESTION:
      'Review bundle size and consider code splitting or lazy loading',
    NO_OPTIMIZATION_CONFIG: 'Bundle optimization configuration not found',
    NO_OPTIMIZATION_CONFIG_SUGGESTION:
      'Configure webpack/build tool with bundle optimization plugins',
    HEAVY_LIBS_NO_LAZY_LOADING:
      'Heavy dependencies ({libs}) detected without lazy loading',
    HEAVY_LIBS_SUGGESTION:
      'Implement lazy loading for heavy dependencies to reduce initial bundle size',
  };

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for bundle optimization configuration
    const optimizationAnalysis = this.checkBundleOptimizationConfig(
      context.projectRoot
    );
    violations.push(...optimizationAnalysis.violations);
    suggestions.push(...optimizationAnalysis.suggestions);

    // Check for large bundle indicators
    const bundleAnalysis = this.checkBundleSize(
      context.projectRoot,
      context.config
    );
    violations.push(...bundleAnalysis.violations);
    suggestions.push(...bundleAnalysis.suggestions);

    // Check for bundle analysis reports
    const reportAnalysis = this.checkBundleReports(context.projectRoot);
    violations.push(...reportAnalysis.violations);
    suggestions.push(...reportAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Bundle size optimization compliance verified'
          : `BundleSizeAnalyzer: ${violations.length} bundle size optimization violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      fixable: violations.length > 0,
      config: context.config,
    };
  }

  private static checkBundleOptimizationConfig(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // A modern Angular project on the esbuild `application` builder optimizes
    // automatically and controls size with budgets — it has no root angular.json
    // or webpack/vite/rollup config for this root-only scan to find, so it read
    // as "no optimization config". Budgets or the esbuild builder (resolved
    // across the whole Nx workspace) count as optimization configured.
    if (AngularBundleConfig.hasModernBundleSetup(projectRoot)) {
      return { violations, suggestions };
    }

    const configFiles = ProjectTypeDetector.getBuildConfigFiles(projectRoot);
    let hasOptimizationConfig = false;

    for (const filePath of configFiles) {
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath);
          if (
            [
              'optimize',
              'bundle',
              'minify',
              'compress',
              'tree-shake',
              'lazy-load',
            ].some((keyword: string) => content.includes(keyword))
          ) {
            hasOptimizationConfig = true;
            break;
          }
        } catch (_error) {
          continue;
        }
      }
    }

    if (!hasOptimizationConfig) {
      violations.push(this.VALIDATION_MESSAGES.NO_OPTIMIZATION_CONFIG);
      suggestions.push(
        this.VALIDATION_MESSAGES.NO_OPTIMIZATION_CONFIG_SUGGESTION
      );
    }

    return { violations, suggestions };
  }

  private static checkBundleSize(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const foundHeavyLibs = ProjectTypeDetector.getHeavyLibraries(projectRoot);

    if (foundHeavyLibs.length > 0) {
      // Check if lazy loading is implemented
      const hasLazyLoading = this.checkLazyLoading(projectRoot, config);

      if (!hasLazyLoading) {
        violations.push(
          this.VALIDATION_MESSAGES.HEAVY_LIBS_NO_LAZY_LOADING.replace(
            '{libs}',
            foundHeavyLibs.join(', ')
          )
        );
        suggestions.push(this.VALIDATION_MESSAGES.HEAVY_LIBS_SUGGESTION);
      }
    }

    return { violations, suggestions };
  }

  private static checkBundleReports(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // A project satisfies bundle analysis either by a committed analysis REPORT,
    // or — far more commonly — by a package.json SCRIPT that runs a bundle
    // analyzer. Reports are generated build artifacts (normally git-ignored), so
    // checking ONLY for report files wrongly fails every project that analyses
    // bundle size on demand.
    let hasBundleAnalysis = false;
    for (const report of this.BUNDLE_REPORTS) {
      if (FileUtils.exists(PathOperations.join(projectRoot, report))) {
        hasBundleAnalysis = true;
        break;
      }
    }
    if (!hasBundleAnalysis) {
      hasBundleAnalysis = this.hasBundleAnalysisScript(projectRoot);
    }

    if (!hasBundleAnalysis) {
      violations.push(this.VALIDATION_MESSAGES.NO_BUNDLE_ANALYSIS);
      suggestions.push(this.VALIDATION_MESSAGES.NO_BUNDLE_ANALYSIS_SUGGESTION);
    }

    return { violations, suggestions };
  }

  /**
   * True if package.json has a script that runs a known bundle-size analyzer
   * (source-map-explorer, webpack-bundle-analyzer, `--stats-json`, rollup/esbuild/
   * vite visualizers, bundlesize, …). The presence of the SCRIPT is what proves
   * the project measures bundle size; the report itself is a build artifact.
   */
  private static hasBundleAnalysisScript(projectRoot: string): boolean {
    try {
      const pkgPath = PathOperations.join(projectRoot, 'package.json');
      if (!FileUtils.exists(pkgPath)) {
        return false;
      }
      const pkg = JSON.parse(FileUtils.readFile(pkgPath)) as {
        scripts?: Record<string, string>;
      };
      const analyzers =
        /source-map-explorer|webpack-bundle-analyzer|stats-json|rollup-plugin-visualizer|esbuild-visualizer|vite-bundle-visualizer|bundlesize|bundle-analyzer/i;
      return Object.values(pkg.scripts ?? {}).some(
        (cmd) => typeof cmd === 'string' && analyzers.test(cmd)
      );
    } catch {
      return false;
    }
  }

  private static checkLazyLoading(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): boolean {
    const routingFiles = this.getRoutingFiles(projectRoot, config);

    for (const file of routingFiles) {
      try {
        const content = FileUtils.readFile(file);
        if (content.includes(this.LAZY_LOADING_KEYWORD)) {
          return true;
        }
      } catch (_error) {
        continue;
      }
    }

    return false;
  }

  private static getRoutingFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find routing files with proper ignore handling
    const allTsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );

    return allTsFiles.filter(file => {
      const fileName = PathOperations.getBasename(file);
      return (
        fileName.includes(this.ROUTING_FILE_PATTERN) && fileName.endsWith('.ts')
      );
    });
  }
}
