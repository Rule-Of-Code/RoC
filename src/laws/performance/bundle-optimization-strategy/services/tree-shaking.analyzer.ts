import { FileUtils, PathOperations } from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import {
  type AngularJson,
  BundleOptimizationStrategyCheckConstants,
  type PackageJsonFile,
} from '../constants';

/**
 * OptimizationConfig interface for type safety
 */
interface OptimizationConfig {
  scripts?: boolean;
  styles?: boolean;
  fonts?: boolean;
  [key: string]: boolean | object | undefined;
}

/**
 * TreeShakingAnalyzerService
 *
 * Responsibility:
 * - Analyze tree shaking configuration
 * - Verify ES6 modules and optimization settings
 */
export class TreeShakingAnalyzerService {
  /**
   * Analyze tree shaking configuration
   */
  static analyze(projectRoot: string): {
    isEnabled: boolean;
    configurations: string[];
  } {
    const configurations: string[] = [];

    // Check Angular build configuration
    const angularJsonPath = PathOperations.join(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.ANGULAR_JSON_FILE
    );

    if (FileUtils.exists(angularJsonPath)) {
      try {
        const angularJson = this.readAngularJson(angularJsonPath);
        if (angularJson && this.hasAngularOptimization(angularJson)) {
          configurations.push(
            BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
              .ANGULAR_OPTIMIZATION_ENABLED
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check for ES6 modules usage
    const packageJsonPath = PathOperations.join(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.PACKAGE_JSON_FILE
    );

    if (FileUtils.exists(packageJsonPath)) {
      try {
        if (this.hasES6Modules(projectRoot)) {
          configurations.push(
            BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
              .ES6_MODULES_CONFIGURED
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    return {
      isEnabled: configurations.length > 0,
      configurations,
    };
  }

  /**
   * Check if Angular has optimization enabled
   */
  private static hasAngularOptimization(angularJson: AngularJson): boolean {
    const buildOptions = this.extractBuildOptions(angularJson);

    for (const opts of buildOptions) {
      const { optimization } = opts;

      if (optimization === true) {
        return true;
      }

      if (
        typeof optimization === 'object' &&
        optimization !== null &&
        'scripts' in optimization
      ) {
        const config = optimization as OptimizationConfig;
        if (config.scripts !== false) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if package has ES6 modules configured
   */
  private static hasES6Modules(projectRoot: string): boolean {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.PACKAGE_JSON_FILE
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return false;
    }

    try {
      const content = FileUtils.readFile(packageJsonPath, {
        encoding: 'utf8',
      });
      const packageJson = JSON.parse(content) as PackageJsonFile;

      if (
        packageJson.type ===
        BundleOptimizationStrategyCheckConstants.MODULE_TYPE_PATTERN
      ) {
        return true;
      }

      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      return Object.keys(deps).some(dep =>
        BundleOptimizationStrategyCheckConstants.ES_MODULE_PATTERNS.some(
          pattern => dep.includes(pattern)
        )
      );
    } catch {
      return false;
    }
  }

  /**
   * Read Angular JSON file
   */
  private static readAngularJson(filePath: string): AngularJson | null {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      return JSON.parse(content) as AngularJson;
    } catch {
      return null;
    }
  }

  /**
   * Read package JSON file
   */
  private static readPackageJson(filePath: string): PackageJsonFile | null {
    try {
      const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
      return JSON.parse(content) as PackageJsonFile;
    } catch {
      return null;
    }
  }

  /**
   * Extract build options from Angular JSON
   */
  private static extractBuildOptions(angularJson: AngularJson) {
    const buildOptions: Array<Record<string, unknown>> = [];

    try {
      const projects = angularJson.projects ?? {};
      for (const projectName of Object.keys(projects)) {
        const project = projects[projectName];
        if (!project) continue;

        this.addProjectBuildOptions(
          project as Record<string, unknown>,
          buildOptions
        );
      }
    } catch {
      // Ignore errors
    }

    return buildOptions;
  }

  /**
   * Add build options from a single project
   */
  private static addProjectBuildOptions(
    project: Record<string, unknown>,
    buildOptions: Array<Record<string, unknown>>
  ): void {
    const architect =
      (project.architect as Record<string, unknown> | undefined) ?? {};
    const build =
      (architect.build as Record<string, unknown> | undefined) ?? {};

    if (build.options) {
      buildOptions.push(build.options as Record<string, unknown>);
    }

    const configurations = build.configurations as
      | Record<string, unknown>
      | undefined;
    if (configurations) {
      for (const configValue of Object.values(configurations)) {
        if (typeof configValue === 'object' && configValue !== null) {
          buildOptions.push(configValue as Record<string, unknown>);
        }
      }
    }
  }
}
