import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { PerformanceBudgetComplianceCheckConstants } from '../constants';

/**
 * BundleSizeAnalyzerService
 *
 * Responsibility:
 * - Analyze bundle size monitoring tools setup
 * - Verify monitoring configuration in package.json
 */
export class BundleSizeAnalyzerService {
  /**
   * Analyze bundle size monitoring
   */
  static analyze(projectRoot: string): { monitored: boolean; tools: string[] } {
    const tools: string[] = [];

    // Use ProjectTypeDetectorValidation utility for safe package.json reading
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    // Check for bundle analysis tools
    for (const tool of PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS) {
      if (allDeps[tool]) {
        tools.push(tool);
      }
    }

    // Check for bundle monitoring in npm scripts
    const scripts =
      ProjectTypeDetectorValidation.getPackageScripts(projectRoot) ?? {};
    if (Object.keys(scripts).length > 0) {
      this.checkPackageScripts(scripts, tools);
    }

    return { monitored: tools.length > 0, tools };
  }

  /**
   * Check if package scripts have bundle monitoring
   */
  private static checkPackageScripts(
    scripts: Record<string, unknown>,
    tools: string[]
  ): void {
    const scriptValues = Object.values(scripts).filter(
      (script): script is string => typeof script === 'string'
    );

    const hasBundleTool = scriptValues.some(script =>
      PerformanceBudgetComplianceCheckConstants.BUNDLE_TOOLS.some(tool =>
        script.includes(tool)
      )
    );

    if (hasBundleTool && !tools.includes('npm-scripts')) {
      tools.push('npm-scripts');
    }
  }
}
