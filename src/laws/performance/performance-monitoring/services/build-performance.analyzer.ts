import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../../../utils/file-system-operations';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { BuildPerformanceConstants } from '../constants/build-performance.constants';

/**
 * Build Performance Analyzer Service
 *
 * Single Responsibility: Analyze build performance monitoring configuration
 */
export class BuildPerformanceAnalyzerService {
  static checkBuildPerformanceMonitoring(projectRoot: string): {
    configured: boolean;
  } {
    try {
      const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
      if (!FileUtils.exists(packageJsonPath)) return { configured: false };

      // Check for build performance monitoring tools
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const hasBuildMonitoring =
        BuildPerformanceConstants.BUILD_MONITORING_TOOLS.some(
          tool => deps[tool]
        );

      // Check for build performance scripts
      const packageJson = FileSystemOperations.readJsonFile(
        packageJsonPath,
        {}
      ) as Record<string, unknown>;
      const scripts = packageJson.scripts ?? {};
      const hasBuildPerfScript = Object.keys(scripts).some(script =>
        BuildPerformanceConstants.isBuildPerfScript(script)
      );

      return { configured: hasBuildMonitoring || hasBuildPerfScript };
    } catch {
      return { configured: false };
    }
  }
}
