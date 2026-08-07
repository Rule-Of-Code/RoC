import {
  FileSystemOperations,
  FileUtils,
  PathOperations,
} from '../../../../utils';
import {
  type AngularProject,
  type BuildConfiguration,
  PerformanceBudgetTypesConstants,
} from '../constants';

/**
 * AngularBudgetAnalyzerService
 *
 * Responsibility:
 * - Analyze Angular CLI performance budgets configuration
 * - Verify budget setup in angular.json or Nx project.json files
 * - Support both traditional Angular CLI and Nx monorepo structures
 */
export class AngularBudgetAnalyzerService {
  /**
   * Analyze Angular performance budgets
   */
  static analyze(projectRoot: string): {
    configured: boolean;
    projects: string[];
  } {
    const projects: string[] = [];

    // Check traditional angular.json first
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (FileUtils.exists(angularJsonPath)) {
      this.analyzeAngularJson(angularJsonPath, projects);
    }

    // Also check Nx monorepo project.json files
    this.analyzeNxProjects(projectRoot, projects);

    return { configured: projects.length > 0, projects };
  }

  /**
   * Analyze traditional angular.json file
   */
  private static analyzeAngularJson(
    angularJsonPath: string,
    projects: string[]
  ): void {
    try {
      const angularJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          angularJsonPath
        );
      const projectsConfig = (angularJson.projects ?? {}) as Record<
        string,
        unknown
      >;

      for (const [projectName, projectConfig] of Object.entries(
        projectsConfig
      )) {
        const angularProject = projectConfig as AngularProject;
        const buildConfigs =
          angularProject.architect?.build?.configurations ?? {};

        for (const [configName, buildConfig] of Object.entries(buildConfigs)) {
          PerformanceBudgetTypesConstants.hasBudgetConfiguration(
            buildConfig,
            projectName,
            configName,
            projects
          );
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  /**
   * Analyze Nx monorepo project.json files
   */
  private static analyzeNxProjects(
    projectRoot: string,
    projects: string[]
  ): void {
    const projectDirs = ['apps', 'libs'];

    for (const dir of projectDirs) {
      const fullDirPath = PathOperations.join(projectRoot, dir);
      if (!FileUtils.exists(fullDirPath)) continue;

      try {
        const entries = FileSystemOperations.readDirectory(fullDirPath);
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const projectJsonPath = PathOperations.join(
              fullDirPath,
              entry.name,
              'project.json'
            );

            if (FileUtils.exists(projectJsonPath)) {
              this.analyzeProjectJson(projectJsonPath, entry.name, projects);
            }
          }
        }
      } catch {
        // Skip directories we can't access
      }
    }
  }

  /**
   * Analyze single Nx project.json file
   */
  private static analyzeProjectJson(
    projectJsonPath: string,
    projectName: string,
    projects: string[]
  ): void {
    try {
      const projectJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          projectJsonPath
        );
      const targetsConfig = (projectJson.targets ?? {}) as Record<
        string,
        unknown
      >;

      for (const [targetName, targetConfig] of Object.entries(targetsConfig)) {
        if (targetName === 'build') {
          const buildTarget = targetConfig as {
            configurations?: Record<string, unknown>;
          };
          const buildConfigs = buildTarget.configurations ?? {};

          for (const [configName, buildConfig] of Object.entries(
            buildConfigs
          )) {
            PerformanceBudgetTypesConstants.hasBudgetConfiguration(
              buildConfig as BuildConfiguration,
              projectName,
              configName,
              projects
            );
          }
        }
      }
    } catch {
      // Invalid JSON or missing fields, skip
    }
  }
}
