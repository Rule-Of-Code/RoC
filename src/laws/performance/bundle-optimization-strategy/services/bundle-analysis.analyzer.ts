import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { PerformanceBudgetGates } from '../../../../utils/performance-budget-gates';
import {
  BUNDLE_ANALYZER_COMMAND,
  type BundlerReport,
  WebBundlerConfig,
} from '../../../../utils/react/web-bundler-config';
import { WorkspaceManifests } from '../../../../utils/workspace-manifests';
import { BundleOptimizationStrategyCheckConstants } from '../constants';

/**
 * BundleAnalysisAnalyzerService
 *
 * Responsibility:
 * - Analyze bundle analysis tools configuration
 * - Verify bundle monitoring setup
 */
export class BundleAnalysisAnalyzerService {
  // Analyzers for the bundlers people actually use, not only webpack.
  private static readonly BUNDLE_TOOLS = [
    'webpack-bundle-analyzer',
    'bundlesize',
    'bundle-buddy',
    'source-map-explorer',
    'esbuild-visualizer',
    'rollup-plugin-visualizer',
    'vite-bundle-visualizer',
    '@next/bundle-analyzer',
  ];

  /**
   * Analyze bundle analysis setup
   */
  static analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    bundler?: BundlerReport
  ): {
    isSetup: boolean;
    tools: string[];
  } {
    // The root manifest and every workspace manifest: a monorepo app declares
    // its analyzer in its own package.json, not the workspace root's.
    const rootDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
    const tools = this.BUNDLE_TOOLS.filter(
      tool => Boolean(rootDeps[tool]) || WorkspaceManifests.declares(projectRoot, tool)
    );

    // A script that RUNS an analyzer. This used to accept any script whose
    // text contained "bundle" — `bundle exec`, `build:bundle`, a smoke test's
    // filename — which says nothing about measuring a bundle.
    const scripts = [
      ...Object.values(
        ProjectTypeDetectorValidation.getPackageScripts(projectRoot) ?? {}
      ),
      ...WorkspaceManifests.scriptCommands(projectRoot),
    ];
    if (
      scripts.some(
        command =>
          typeof command === 'string' && BUNDLE_ANALYZER_COMMAND.test(command)
      )
    ) {
      tools.push(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .BUNDLE_ANALYSIS_SCRIPT
      );
    }

    // @next/bundle-analyzer wired into next.config (enabled from a script by
    // an env var, so the script itself never names the tool).
    const report = bundler ?? WebBundlerConfig.inspect(projectRoot);
    for (const app of report.apps) {
      if (app.bundleAnalyzer) {
        tools.push(`${WebBundlerConfig.label(projectRoot, app)}: @next/bundle-analyzer in next.config`);
      }
    }

    // A size-limit check that something runs measures the bundle and fails on it.
    const sizeLimit = PerformanceBudgetGates.enforcedSizeLimit(projectRoot, config);
    if (sizeLimit) tools.push(sizeLimit);

    // Declared budgets ARE a bundle-size policy, and an enforced one: the build
    // fails on them. On the esbuild builder there is no webpack analyzer to
    // install and no reason to install one — the budgets in the build config
    // are where such a project states its policy, and a sibling law already
    // reads them from exactly there. Requiring a webpack-era tool instead left
    // no configuration that both satisfied this check and stayed correct for
    // the toolchain.
    if (tools.length === 0 && this.declaresBundleBudgets(projectRoot)) {
      tools.push('bundle budgets declared in the build configuration');
    }

    return {
      isSetup: tools.length > 0,
      tools,
    };
  }

  private static declaresBundleBudgets(projectRoot: string): boolean {
    const buildConfig = NxWorkspace.getBuildConfigContent(projectRoot);
    if (!buildConfig) return false;

    // A budgets array with at least one entry that names a size ceiling.
    return (
      /"budgets"\s*:\s*\[/.test(buildConfig) &&
      /"(?:maximumError|maximumWarning)"\s*:/.test(buildConfig)
    );
  }
}
