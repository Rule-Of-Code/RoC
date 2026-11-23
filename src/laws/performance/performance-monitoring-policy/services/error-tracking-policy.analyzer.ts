import type { RuleOfCodeConfig } from '../../../../config/types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import { ErrorTrackingPolicyConstants } from '../constants/error-tracking-policy.constants';
import { ownErrorCapture } from './own-error-capture';

/**
 * Error Tracking Policy Analyzer Service
 *
 * Single Responsibility: Analyze error tracking and performance tracking configuration
 */
export class ErrorTrackingPolicyAnalyzerService {
  static async checkErrorAndPerformanceTracking(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence,
    lawId?: string
  ): Promise<{
    hasTracking: boolean;
    tools: string[];
    unread: string[];
  }> {
    const packageTools = this.checkTrackingInPackageJson(projectRoot);
    const configTools = this.checkTrackingConfigFiles(projectRoot);
    const own = ownErrorCapture(projectRoot, config, lawId);
    const appTools = own.files
      .slice(0, 1)
      .map(
        file => `Custom error tracking (error handler registered in ${file})`
      );
    // React/Next: an error-tracking SDK imported by the source - typically
    // `instrumentation.ts` / `instrumentation-client.ts` or the root layout.
    // In a monorepo the SDK is declared by the app's own manifest, which the
    // root package.json read above does not see.
    const sourceTools = (react?.errorTrackingImports ?? [])
      .slice(0, 1)
      .map(entry => `Error tracking imported (${entry})`);

    const allTools = [
      ...packageTools,
      ...configTools,
      ...appTools,
      ...sourceTools,
    ];
    const uniqueTools = [...new Set(allTools)];

    return Promise.resolve({
      hasTracking: uniqueTools.length > 0,
      tools: uniqueTools,
      unread: own.unread,
    });
  }

  private static checkTrackingInPackageJson(projectRoot: string): string[] {
    const tools: string[] = [];
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    for (const tool of ErrorTrackingPolicyConstants.ERROR_TRACKING_TOOLS) {
      if (allDeps[tool]) {
        const toolName = tool.split('/').pop() ?? tool;
        tools.push(toolName.charAt(0).toUpperCase() + toolName.slice(1));
      }
    }

    return tools;
  }

  private static checkTrackingConfigFiles(projectRoot: string): string[] {
    const tools: string[] = [];

    for (const configFile of ErrorTrackingPolicyConstants.ERROR_TRACKING_CONFIG_FILES) {
      if (FileUtils.exists(PathOperations.join(projectRoot, configFile))) {
        const toolName = configFile.split('.')[0];
        if (
          toolName &&
          !tools.some(tool => tool.toLowerCase().includes(toolName))
        ) {
          tools.push(toolName.charAt(0).toUpperCase() + toolName.slice(1));
        }
      }
    }

    return tools;
  }
}
