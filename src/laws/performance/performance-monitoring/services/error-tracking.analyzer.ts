import type { RuleOfCodeConfig } from '../../../../config/types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { ErrorTrackingConstants } from '../constants/error-tracking.constants';

/**
 * Error Tracking Analyzer Service
 *
 * Single Responsibility: Analyze error tracking configuration
 */
export class ErrorTrackingAnalyzerService {
  static async checkPerformanceErrorTracking(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    configured: boolean;
  }> {
    try {
      const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
      if (!FileUtils.exists(packageJsonPath)) {
        return { configured: false };
      }

      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      if (
        !ErrorTrackingConstants.ERROR_TRACKING_TOOLS.some(tool => deps[tool])
      ) {
        return { configured: false };
      }

      return await this.checkErrorTrackingConfiguration(projectRoot, config);
    } catch {
      return { configured: false };
    }
  }

  private static async checkErrorTrackingConfiguration(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    configured: boolean;
  }> {
    const configFilePaths =
      await ErrorTrackingConstants.getErrorTrackingConfigFilePaths(
        projectRoot,
        config
      );
    for (const fullPath of configFilePaths) {
      if (FileUtils.exists(fullPath)) {
        const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
        if (ErrorTrackingConstants.hasErrorTrackingConfig(content)) {
          return { configured: true };
        }
      }
    }

    return { configured: false };
  }
}
