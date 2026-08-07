import type { RuleOfCodeConfig } from '../../../../config/types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { BundleOptimizationResult } from '../constants/types';

export class BundleOptimizationAnalyzerService {
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): BundleOptimizationResult {
    const optimizations: string[] = [];

    // Check for lazy loading
    if (this.hasLazyLoadingRoutes(projectRoot, config)) {
      optimizations.push('Lazy loading routes detected');
    }

    // Check for build optimization
    if (this.hasBuildOptimization(projectRoot)) {
      optimizations.push('Build optimization enabled');
    }

    return {
      isOptimized: optimizations.length >= 1,
      optimizations,
    };
  }

  private static hasLazyLoadingRoutes(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): boolean {
    const routingFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['ts'],
      config
    ).filter(
      file =>
        file.includes('routing') &&
        (file.includes('.module') || file.includes('routing.ts'))
    );

    for (const file of routingFiles) {
      try {
        // file is already an absolute path from CheckerUtils.findFilesByExtension
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        if (
          content.includes(Checks.OPTIMIZATION_KEYWORDS.LAZY_LOADING) ||
          content.includes(Checks.OPTIMIZATION_KEYWORDS.DYNAMIC_IMPORT)
        ) {
          return true;
        }
      } catch {
        // Ignore file read errors
      }
    }

    return false;
  }

  private static hasBuildOptimization(projectRoot: string): boolean {
    // Read the workspace build config(s): root angular.json AND/OR Nx project.json files,
    // so build optimization is detected in both standard and Nx workspaces.
    const content = NxWorkspace.getBuildConfigContent(projectRoot);
    return content.includes(Checks.OPTIMIZATION_KEYWORDS.BUILD_OPTIMIZATION);
  }
}
