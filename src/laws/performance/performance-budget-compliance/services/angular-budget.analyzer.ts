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
/** Budgets found, and the build configs that could not be read. */
export interface AngularBudgetAnalysis {
  configured: boolean;
  projects: string[];
  unreadable: string[];
}

export class AngularBudgetAnalyzerService {
  /**
   * Analyze Angular performance budgets
   */
  static analyze(projectRoot: string): AngularBudgetAnalysis {
    const projects: string[] = [];
    const unreadable: string[] = [];

    // Check traditional angular.json first
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (FileUtils.exists(angularJsonPath)) {
      this.analyzeAngularJson(angularJsonPath, projects, unreadable);
    }

    // Also check Nx monorepo project.json files
    this.analyzeNxProjects(projectRoot, projects, unreadable);

    return { configured: projects.length > 0, projects, unreadable };
  }

  /** "<file> could not be read: <reason>" — a file that holds budgets, not read (#423). */
  private static notRead(file: string, error: unknown): string {
    const reason = error instanceof Error ? error.message : String(error);
    return `${file} could not be read: ${reason}`;
  }

  /**
   * Analyze traditional angular.json file
   */
  private static analyzeAngularJson(
    angularJsonPath: string,
    projects: string[],
    unreadable: string[]
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
    } catch (error) {
      // Not "no budgets": the file that would declare them was not read.
      unreadable.push(this.notRead('angular.json', error));
    }
  }

  /**
   * Analyze Nx monorepo project.json files
   */
  private static analyzeNxProjects(
    projectRoot: string,
    projects: string[],
    unreadable: string[]
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
              this.analyzeProjectJson(
                projectJsonPath,
                `${dir}/${entry.name}/project.json`,
                entry.name,
                projects,
                unreadable
              );
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
    relPath: string,
    projectName: string,
    projects: string[],
    unreadable: string[]
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
    } catch (error) {
      unreadable.push(this.notRead(relPath, error));
    }
  }
}
