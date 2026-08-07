import { FileUtils, PathOperations } from '../../../../utils';
import { PerformanceBudgetComplianceCheckConstants } from '../constants';

/**
 * LighthouseBudgetAnalyzerService
 *
 * Responsibility:
 * - Analyze Lighthouse CI performance budget configuration
 * - Verify budget assertions and metrics
 */
export class LighthouseBudgetAnalyzerService {
  /**
   * Analyze Lighthouse CI budgets
   */
  static analyze(projectRoot: string): {
    configured: boolean;
    configFiles: string[];
  } {
    const configFiles: string[] = [];
    const lighthousePaths = [
      PathOperations.join(projectRoot, '.lighthouserc.js'),
      PathOperations.join(projectRoot, '.lighthouserc.json'),
      PathOperations.join(projectRoot, 'lighthouse.config.js'),
      PathOperations.join(projectRoot, 'config/lighthouse.config.js'),
      PathOperations.join(projectRoot, 'lighthouserc.json'),
    ];

    for (const configPath of lighthousePaths) {
      if (FileUtils.exists(configPath)) {
        const configName = this.checkConfigFile(configPath);
        if (configName) {
          configFiles.push(configName);
        }
      }
    }

    return { configured: configFiles.length > 0, configFiles };
  }

  /**
   * Check if Lighthouse config file has budget configuration
   */
  private static checkConfigFile(configPath: string): string | null {
    try {
      const content = FileUtils.readFile(configPath, { encoding: 'utf8' });

      if (
        PerformanceBudgetComplianceCheckConstants.hasLighthouseBudget(content)
      ) {
        return PathOperations.getBasename(configPath);
      }
    } catch {
      // Ignore file read errors
    }
    return null;
  }
}
