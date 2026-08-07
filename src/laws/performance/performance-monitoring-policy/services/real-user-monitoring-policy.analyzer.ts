import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { RealUserMonitoringPolicyConstants } from '../constants/real-user-monitoring-policy.constants';

/**
 * Real User Monitoring Policy Analyzer Service
 *
 * Single Responsibility: Analyze RUM tools and configuration
 */
export class RealUserMonitoringPolicyAnalyzerService {
  static checkRealUserMonitoring(projectRoot: string): {
    hasRUM: boolean;
    tools: string[];
  } {
    const tools: string[] = [];

    tools.push(...this.getPackageJsonRumTools(projectRoot));
    this.addGoogleAnalyticsIfDetected(projectRoot, tools);
    tools.push(...this.getConfigFileTools(projectRoot));

    return {
      hasRUM: tools.length > 0,
      tools,
    };
  }

  private static getPackageJsonRumTools(projectRoot: string): string[] {
    const tools: string[] = [];
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    for (const [dep, name] of Object.entries(
      RealUserMonitoringPolicyConstants.RUM_TOOLS
    )) {
      if (allDeps[dep]) {
        tools.push(name);
      }
    }

    return tools;
  }

  private static addGoogleAnalyticsIfDetected(
    projectRoot: string,
    tools: string[]
  ): void {
    const indexPath = PathOperations.join(
      projectRoot,
      RealUserMonitoringPolicyConstants.INDEX_HTML_FILE
    );

    if (!FileUtils.exists(indexPath)) return;

    try {
      const content = FileUtils.readFile(indexPath, { encoding: 'utf8' });
      const hasGoogleAnalytics =
        RealUserMonitoringPolicyConstants.GOOGLE_ANALYTICS_PATTERNS.some(
          pattern => content.includes(pattern)
        );

      if (hasGoogleAnalytics && !tools.includes('Google Analytics')) {
        tools.push('Google Analytics');
      }
    } catch {
      // Ignore read errors
    }
  }

  private static getConfigFileTools(projectRoot: string): string[] {
    const tools: string[] = [];

    for (const configFile of RealUserMonitoringPolicyConstants.RUM_CONFIG_FILES) {
      const fullPath = PathOperations.join(projectRoot, configFile);
      if (FileUtils.exists(fullPath)) {
        const toolName = configFile.split('.')[0];
        if (toolName) {
          tools.push(toolName.charAt(0).toUpperCase() + toolName.slice(1));
        }
      }
    }

    return tools;
  }
}
