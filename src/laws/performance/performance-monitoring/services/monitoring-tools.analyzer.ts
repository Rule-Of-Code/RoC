import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { MonitoringToolsConstants } from '../constants/monitoring-tools.constants';

/**
 * Monitoring Tools Analyzer Service
 *
 * Single Responsibility: Analyze monitoring tools integration
 */
export class MonitoringToolsAnalyzerService {
  static checkMonitoringToolsIntegration(projectRoot: string): {
    hasTools: boolean;
    tools: string[];
  } {
    const detectedTools: string[] = [];
    let hasTools = false;

    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      for (const [dep, name] of Object.entries(
        MonitoringToolsConstants.MONITORING_TOOL_PACKAGES
      )) {
        if (deps[dep]) {
          detectedTools.push(name);
          hasTools = true;
        }
      }

      // Check for custom performance monitoring files
      for (const filePath of MonitoringToolsConstants.CUSTOM_MONITORING_FILE_PATTERNS) {
        const fullPath = PathOperations.join(projectRoot, filePath);
        if (FileUtils.exists(fullPath)) {
          detectedTools.push('Custom Performance Monitoring');
          hasTools = true;
          break;
        }
      }
    } catch {
      // Ignore errors
    }

    return { hasTools, tools: detectedTools };
  }
}
