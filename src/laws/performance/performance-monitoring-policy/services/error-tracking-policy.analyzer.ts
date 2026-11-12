import type { RuleOfCodeConfig } from '../../../../config/types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PathResolver } from '../../../../utils/path-resolver';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import { ErrorTrackingPolicyConstants } from '../constants/error-tracking-policy.constants';

/**
 * Error Tracking Policy Analyzer Service
 *
 * Single Responsibility: Analyze error tracking and performance tracking configuration
 */
export class ErrorTrackingPolicyAnalyzerService {
  static async checkErrorAndPerformanceTracking(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence
  ): Promise<{
    hasTracking: boolean;
    tools: string[];
  }> {
    const packageTools = this.checkTrackingInPackageJson(projectRoot);
    const configTools = this.checkTrackingConfigFiles(projectRoot);
    const appTools = await this.checkTrackingInAppFiles(projectRoot, config);
    // React/Next: an error-tracking SDK imported by the source - typically
    // `instrumentation.ts` / `instrumentation-client.ts` or the root layout.
    // In a monorepo the SDK is declared by the app's own manifest, which the
    // root package.json read above does not see.
    const sourceTools = (react?.errorTrackingImports ?? [])
      .slice(0, 1)
      .map(entry => `Error tracking imported (${entry})`);

    const allTools = [...packageTools, ...configTools, ...appTools, ...sourceTools];
    const uniqueTools = [...new Set(allTools)];

    return {
      hasTracking: uniqueTools.length > 0,
      tools: uniqueTools,
    };
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

  private static async checkTrackingInAppFiles(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    let appFiles: string[];
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [appModulePaths, appComponentPaths] = await Promise.all([
        resolver.getAppModulePaths(),
        resolver.getAppComponentPaths(),
      ]);
      appFiles = [...appModulePaths, ...appComponentPaths];
    } else {
      appFiles = [
        PathOperations.join(projectRoot, 'src/app/app.module.ts'),
        PathOperations.join(projectRoot, 'src/app/app.component.ts'),
      ];
    }

    for (const fullPath of appFiles) {
      try {
        if (FileUtils.exists(fullPath)) {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (
            ErrorTrackingPolicyConstants.hasErrorTrackingImplementation(content)
          ) {
            return ['Custom error tracking'];
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return [];
  }
}
