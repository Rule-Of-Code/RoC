import { FileUtils, PathOperations } from '../../../../utils';
import { PerformanceBudgetComplianceCheckConstants } from '../constants';

/**
 * WebpackBudgetAnalyzerService
 *
 * Responsibility:
 * - Analyze Webpack performance configuration
 * - Verify maxAssetSize and hints configuration
 */
export class WebpackBudgetAnalyzerService {
  /**
   * Analyze Webpack performance configuration
   */
  static analyze(projectRoot: string): {
    configured: boolean;
    configs: string[];
  } {
    const configs: string[] = [];
    const webpackPaths = [
      PathOperations.join(projectRoot, 'webpack.config.js'),
      PathOperations.join(projectRoot, 'webpack.prod.js'),
      PathOperations.join(projectRoot, 'config/webpack.config.js'),
      PathOperations.join(projectRoot, 'config/webpack.prod.js'),
    ];

    for (const configPath of webpackPaths) {
      if (FileUtils.exists(configPath)) {
        const configName = this.checkConfigFile(configPath);
        if (configName) {
          configs.push(configName);
        }
      }
    }

    return { configured: configs.length > 0, configs };
  }

  /**
   * Check if Webpack config file has performance settings
   */
  private static checkConfigFile(configPath: string): string | null {
    try {
      const content = FileUtils.readFile(configPath, { encoding: 'utf8' });

      if (
        PerformanceBudgetComplianceCheckConstants.hasWebpackPerformance(content)
      ) {
        const hasMaxAssetSize = content.includes(
          PerformanceBudgetComplianceCheckConstants.WEBPACK_CONFIG_KEYS
            .MAX_ASSET_SIZE
        );
        const hasMaxEntrypointSize = content.includes(
          PerformanceBudgetComplianceCheckConstants.WEBPACK_CONFIG_KEYS
            .MAX_ENTRYPOINT_SIZE
        );
        const hasHints =
          PerformanceBudgetComplianceCheckConstants.hasWebpackHints(content);

        if (hasMaxAssetSize || hasMaxEntrypointSize || hasHints) {
          return PathOperations.getBasename(configPath);
        }
      }
    } catch {
      // Ignore file read errors
    }
    return null;
  }
}
