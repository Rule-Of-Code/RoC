import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { BundleOptimizationStrategyCheckConstants } from '../constants';

/**
 * BundleAnalysisAnalyzerService
 *
 * Responsibility:
 * - Analyze bundle analysis tools configuration
 * - Verify bundle monitoring setup
 */
export class BundleAnalysisAnalyzerService {
  /**
   * Analyze bundle analysis setup
   */
  static analyze(projectRoot: string): {
    isSetup: boolean;
    tools: string[];
  } {
    const tools: string[] = [];

    // Check for bundle analysis tools using ProjectTypeDetector utility
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    // Analyzers for the bundlers people actually use, not only webpack.
    const bundleTools = [
      'webpack-bundle-analyzer',
      'bundlesize',
      'bundle-buddy',
      'source-map-explorer',
      'esbuild-visualizer',
      'rollup-plugin-visualizer',
      'vite-bundle-visualizer',
      '@next/bundle-analyzer',
    ];

    for (const tool of bundleTools) {
      if (allDeps[tool]) {
        tools.push(tool);
      }
    }

    // Check scripts for bundle analysis commands
    const scripts =
      ProjectTypeDetectorValidation.getPackageScripts(projectRoot) ?? {};

    for (const script of Object.values(scripts)) {
      if (
        typeof script === 'string' &&
        script.includes(
          BundleOptimizationStrategyCheckConstants.BUNDLE_ANALYSIS_SCRIPT_PATTERN
        )
      ) {
        tools.push(
          BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
            .BUNDLE_ANALYSIS_SCRIPT
        );
        break;
      }
    }

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
