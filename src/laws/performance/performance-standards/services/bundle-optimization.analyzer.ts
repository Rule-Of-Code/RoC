import { glob } from 'glob';
import { FileUtils, PathOperations } from '../../../../utils';
import { BundleOptimizationConstants } from '../constants';

/**
 * Bundle Optimization Analyzer
 *
 * Single Responsibility: Analyzing bundle optimization configuration
 */
export class BundleOptimizationAnalyzer {
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    // Check Angular configuration
    const angularJsonPath = PathOperations.join(projectRoot, 'angular.json');
    if (FileUtils.exists(angularJsonPath)) {
      try {
        const content = FileUtils.readFile(angularJsonPath, {
          encoding: 'utf8',
        });
        if (BundleOptimizationConstants.hasAngularOptimization(content)) {
          return violations;
        }
      } catch (_error) {
        // Continue
      }
    }

    // Check Nx project.json files (for Nx monorepos)
    const nxProjectFiles = glob.sync('**/project.json', {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    for (const projectFile of nxProjectFiles) {
      try {
        const content = FileUtils.readFile(projectFile, { encoding: 'utf8' });
        if (BundleOptimizationConstants.hasAngularOptimization(content)) {
          return violations;
        }
      } catch (_error) {
        // Continue
      }
    }

    // Check Webpack configuration
    const webpackConfigs = ['webpack.config.js', 'webpack.prod.js'];

    for (const webpackConfig of webpackConfigs) {
      const fullPath = PathOperations.join(projectRoot, webpackConfig);
      const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
      if (
        content &&
        BundleOptimizationConstants.hasWebpackOptimization(content)
      ) {
        return violations;
      }
    }

    violations.push('Bundle optimization not properly configured');
    return violations;
  }
}
