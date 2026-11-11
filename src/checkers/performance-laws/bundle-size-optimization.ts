/**
 * Bundle Size Optimization Law
 * BundleSizeAnalyzer: Ensures bundle size stays within performance limits
 */

import { BundleOptimizationConstants } from '../../laws/performance/performance-standards/constants/bundle-optimization.constants';
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
import { PerformanceBudgetGates } from '../../utils/performance-budget-gates';
import { JsConfigSource } from '../../utils/react/js-config-source';
import {
  type ReactPerformanceEvidence,
  ReactPerformanceSource,
  unreadViolation,
} from '../../utils/react/react-performance-source';
import type { TsxSource } from '../../utils/react/tsx-source';
import {
  BUNDLE_ANALYZER_COMMAND,
  type BundlerReport,
  WebBundlerConfig,
} from '../../utils/react/web-bundler-config';
import { WorkspaceManifests } from '../../utils/workspace-manifests';

type Findings = { violations: string[]; suggestions: string[] };

export class BundleSizeOptimizationLaw {
  private static readonly BUNDLE_REPORTS = [
    'dist/bundle.js',
    'dist/bundle-analysis.html',
    'report.html',
  ];
  private static readonly ROLLUP_CONFIGS = [
    'rollup.config.js',
    'rollup.config.mjs',
    'rollup.config.ts',
  ];
  private static readonly TERSER_PLUGINS = [
    '@rollup/plugin-terser',
    'rollup-plugin-terser',
  ];
  private static readonly ROUTING_FILE_PATTERN = 'routing';
  private static readonly LAZY_LOADING_KEYWORD = 'loadChildren';
  private static readonly VALIDATION_MESSAGES = {
    NO_BUNDLE_ANALYSIS: 'No bundle analysis script found',
    NO_BUNDLE_ANALYSIS_SUGGESTION:
      'Add bundle analysis script to measure bundle size impact (source-map-explorer, size-limit, `next experimental-analyze`, @next/bundle-analyzer)',
    NO_OPTIMIZATION_CONFIG: 'Bundle optimization configuration not found',
    NO_OPTIMIZATION_CONFIG_SUGGESTION:
      'Configure the production build to optimize (Angular optimization/budgets, a Next.js or Vite build that does not turn minification off, webpack production mode)',
    HEAVY_LIBS_NO_LAZY_LOADING:
      'Heavy dependencies ({libs}) detected without lazy loading',
    HEAVY_LIBS_SUGGESTION:
      'Implement lazy loading for heavy dependencies to reduce initial bundle size (loadChildren, next/dynamic, React.lazy, import())',
  };

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const bundler = WebBundlerConfig.inspect(context.projectRoot);

    // Check for bundle optimization configuration
    const optimizationAnalysis = this.checkBundleOptimizationConfig(
      context.projectRoot,
      bundler
    );
    violations.push(...optimizationAnalysis.violations);
    suggestions.push(...optimizationAnalysis.suggestions);

    // Check for large bundle indicators
    const bundleAnalysis = this.checkBundleSize(context);
    violations.push(...bundleAnalysis.violations);
    suggestions.push(...bundleAnalysis.suggestions);

    // Check for bundle analysis reports
    const reportAnalysis = this.checkBundleReports(context, bundler);
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

  /**
   * Optimization configured, read from what the build tool actually loads.
   *
   * This used to pass when a listed build file contained any of `optimize`,
   * `bundle`, `minify`, `compress` — so a comment saying "TODO: bundle" was
   * enough, and `minify: false` passed because it contains `minify`. And it
   * never listed `next.config.*` or `vite.config.ts`, so a Next or Vite app
   * could only pass by adding an unused webpack config. Now:
   * - Angular: the modern setup (esbuild builder or budgets), or an
   *   `"optimization"` / `"buildOptimizer": true` entry in angular.json;
   * - Next.js / Vite: the production build minifies by default; it counts
   *   unless next.config / vite.config turns minification off;
   * - webpack: `mode` unset or 'production' (webpack treats an unset mode as
   *   production, whose defaults minimize) and no `minimize: false`;
   * - Rollup: a terser plugin imported and called.
   */
  private static checkBundleOptimizationConfig(
    projectRoot: string,
    bundler: BundlerReport
  ): Findings {
    const violations: string[] = [];
    const suggestions: string[] = [];

    if (AngularBundleConfig.hasModernBundleSetup(projectRoot)) {
      return { violations, suggestions };
    }
    if (WebBundlerConfig.optimizingBuilds(bundler).length > 0) {
      return { violations, suggestions };
    }

    const unread: string[] = [...bundler.unread];
    if (
      this.angularJsonOptimizes(projectRoot) ||
      WebBundlerConfig.webpackProduction(projectRoot, unread) !== null ||
      this.rollupMinifies(projectRoot, unread)
    ) {
      return { violations, suggestions };
    }

    if (unread.length > 0) violations.push(unreadViolation(unread));
    violations.push(this.VALIDATION_MESSAGES.NO_OPTIMIZATION_CONFIG);
    suggestions.push(this.VALIDATION_MESSAGES.NO_OPTIMIZATION_CONFIG_SUGGESTION);
    return { violations, suggestions };
  }

  private static angularJsonOptimizes(projectRoot: string): boolean {
    const file = PathOperations.join(projectRoot, 'angular.json');
    if (!FileUtils.exists(file)) return false;
    try {
      return BundleOptimizationConstants.hasAngularOptimization(
        FileUtils.readFile(file)
      );
    } catch {
      return false;
    }
  }

  private static configSources(
    projectRoot: string,
    names: readonly string[],
    unread: string[]
  ): TsxSource[] {
    const sources: TsxSource[] = [];
    for (const name of names) {
      const file = PathOperations.join(projectRoot, name);
      if (!FileUtils.exists(file)) continue;
      const read = JsConfigSource.read(projectRoot, file);
      if (read.source) sources.push(read.source);
      else unread.push(read.unread);
    }
    return sources;
  }

  private static rollupMinifies(projectRoot: string, unread: string[]): boolean {
    return this.configSources(projectRoot, this.ROLLUP_CONFIGS, unread).some(
      source =>
        this.TERSER_PLUGINS.some(
          module =>
            JsConfigSource.callsOf(
              source,
              JsConfigSource.importedNames(source, module)
            ).length > 0
        )
    );
  }

  private static checkBundleSize(context: LawCheckContext): Findings {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const foundHeavyLibs = ProjectTypeDetector.getHeavyLibraries(
      context.projectRoot
    );
    if (foundHeavyLibs.length === 0) return { violations, suggestions };

    if (this.checkLazyLoading(context.projectRoot, context.config)) {
      return { violations, suggestions };
    }

    // React/Next: next/dynamic, React.lazy or a dynamic import() in the parsed
    // source. Angular routing (loadChildren) was the only form recognised.
    const react: ReactPerformanceEvidence = ReactPerformanceSource.scan(context);
    if (react.dynamicImports.length > 0) return { violations, suggestions };
    if (react.unread.length > 0) violations.push(unreadViolation(react.unread));

    violations.push(
      this.VALIDATION_MESSAGES.HEAVY_LIBS_NO_LAZY_LOADING.replace(
        '{libs}',
        foundHeavyLibs.join(', ')
      )
    );
    suggestions.push(this.VALIDATION_MESSAGES.HEAVY_LIBS_SUGGESTION);
    return { violations, suggestions };
  }

  private static checkBundleReports(
    context: LawCheckContext,
    bundler: BundlerReport
  ): Findings {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const projectRoot = context.projectRoot;

    // A project satisfies bundle analysis either by a committed analysis REPORT,
    // or — far more commonly — by a package.json SCRIPT that runs a bundle
    // analyzer. Reports are generated build artifacts (normally git-ignored), so
    // checking ONLY for report files wrongly fails every project that analyses
    // bundle size on demand.
    const hasBundleAnalysis =
      this.BUNDLE_REPORTS.some(report =>
        FileUtils.exists(PathOperations.join(projectRoot, report))
      ) ||
      this.hasBundleAnalysisScript(projectRoot) ||
      // `@next/bundle-analyzer` is enabled from a script through an env var
      // (`ANALYZE=true next build`), so the wrapper being CALLED in
      // next.config is what wires it — the script itself never names it.
      bundler.apps.some(app => app.bundleAnalyzer) ||
      PerformanceBudgetGates.enforcedSizeLimit(projectRoot, context.config) !==
        null;

    if (!hasBundleAnalysis) {
      violations.push(this.VALIDATION_MESSAGES.NO_BUNDLE_ANALYSIS);
      suggestions.push(this.VALIDATION_MESSAGES.NO_BUNDLE_ANALYSIS_SUGGESTION);
    }

    return { violations, suggestions };
  }

  /**
   * True if any workspace package.json has a script that runs a known
   * bundle-size analyzer. The presence of the SCRIPT is what proves the
   * project measures bundle size; the report itself is a build artifact.
   */
  private static hasBundleAnalysisScript(projectRoot: string): boolean {
    return WorkspaceManifests.scriptCommands(projectRoot).some(command =>
      BUNDLE_ANALYZER_COMMAND.test(command)
    );
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
