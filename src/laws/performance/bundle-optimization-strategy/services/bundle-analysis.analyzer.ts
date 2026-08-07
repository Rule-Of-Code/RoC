import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
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

    // Check for bundle analysis tools
    const bundleTools = [
      'webpack-bundle-analyzer',
      'bundlesize',
      'bundle-buddy',
      'source-map-explorer',
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

    return {
      isSetup: tools.length > 0,
      tools,
    };
  }
}
