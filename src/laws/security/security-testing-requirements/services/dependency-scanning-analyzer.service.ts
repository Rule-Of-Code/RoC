import { FileUtils, PathOperations } from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { PythonSatisfaction } from '../../../../utils/python-satisfaction';
import { DependencyScanningConstants } from '../constants/dependency-scanning';

/**
 * DependencyScanningAnalyzerService
 *
 * Analyzes dependency vulnerability scanning setup.
 * Responsibilities:
 * - Check package.json scripts and dependencies
 * - Find dependency scanning configuration files
 */
export class DependencyScanningAnalyzerService {
  /**
   * Analyze dependency scanning configuration
   */
  static analyze(projectRoot: string): {
    configured: boolean;
    configFiles: string[];
  } {
    try {
      // Check package.json for scanning scripts or tools
      const packageJson =
        ProjectTypeDetectorValidation.getPackageJson(projectRoot);
      if (packageJson && typeof packageJson === 'object') {
        const pkg = packageJson as Record<string, unknown>;
        const scripts = (pkg.scripts ?? {}) as Record<string, string>;
        const deps =
          ProjectTypeDetectorValidation.getAllDependencies(packageJson);

        if (
          DependencyScanningConstants.hasSecurityScript(scripts) ||
          DependencyScanningConstants.hasTool(deps)
        ) {
          return { configured: true, configFiles: [] };
        }
      }

      // Check for configuration files
      const configFiles = this.findConfigFiles(projectRoot);
      if (configFiles.length > 0) {
        return { configured: true, configFiles };
      }

      // A Python gate declares its scanner in .pre-commit-config.yaml or
      // pyproject.toml, not in package.json scripts (a backend consumer).
      if (
        PythonSatisfaction.isPython(projectRoot) &&
        PythonSatisfaction.hasPythonDependencyScanner(projectRoot)
      ) {
        return { configured: true, configFiles: ['pip-audit/safety in gate'] };
      }

      return { configured: false, configFiles };
    } catch {
      return { configured: false, configFiles: [] };
    }
  }

  /**
   * Find dependency scanning configuration files
   */
  private static findConfigFiles(projectRoot: string): string[] {
    const configFiles: string[] = [];

    for (const configFile of DependencyScanningConstants.CONFIG_FILES) {
      const fullPath = PathOperations.join(projectRoot, configFile);
      if (FileUtils.exists(fullPath)) {
        configFiles.push(fullPath);
      }
    }

    return configFiles;
  }
}
