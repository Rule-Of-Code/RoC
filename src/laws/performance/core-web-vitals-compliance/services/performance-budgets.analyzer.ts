import { FileSystemOperations } from '../../../../utils';
import { FileUtils } from '../../../../utils/file-utils';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { CoreWebVitalsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type {
  AngularBuildConfig,
  PerformanceBudgetsResult,
} from '../constants/types';

export class PerformanceBudgetsAnalyzerService {
  static analyze(projectRoot: string): PerformanceBudgetsResult {
    const budgetFiles: string[] = [];

    // Check angular.json
    const angularJsonPath = FileDiscovery.getAngularJsonPath(projectRoot);
    if (FileUtils.exists(angularJsonPath)) {
      if (this.hasAngularBudgets(angularJsonPath)) {
        budgetFiles.push('angular.json');
      }
    }

    // Nx keeps per-project configuration in `apps/<name>/project.json` and has no
    // root angular.json at all, so budgets that genuinely fail the build were
    // reported as missing. Read the whole workspace's build configuration.
    if (budgetFiles.length === 0) {
      const buildConfig = NxWorkspace.getBuildConfigContent(projectRoot);
      if (buildConfig.includes('"budgets"')) {
        budgetFiles.push('project.json');
      }
    }

    // Check webpack.config.js
    const webpackPath = FileDiscovery.getWebpackConfigPath(projectRoot);
    if (FileUtils.exists(webpackPath)) {
      if (this.hasWebpackBudgets(webpackPath)) {
        budgetFiles.push('webpack.config.js');
      }
    }

    return {
      hasBudgets: budgetFiles.length > 0,
      budgetFiles,
    };
  }

  private static hasAngularBudgets(angularJsonPath: string): boolean {
    try {
      const angularJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          angularJsonPath
        );
      const projects = angularJson.projects as
        | Record<string, unknown>
        | undefined;
      if (!projects) return false;

      for (const projectConfig of Object.values(projects)) {
        const proj = projectConfig as AngularBuildConfig;
        const buildConfig = proj.architect?.build?.configurations?.production;
        if (buildConfig && (buildConfig as Record<string, unknown>).budgets) {
          return true;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return false;
  }

  private static hasWebpackBudgets(webpackPath: string): boolean {
    try {
      const content = FileUtils.readFile(webpackPath, { encoding: 'utf8' });
      return (
        content.includes('performance') && content.includes('maxAssetSize')
      );
    } catch {
      return false;
    }
  }
}
