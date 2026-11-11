import { glob } from 'glob';
import { FileUtils, PathOperations } from '../../../../utils';
import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import {
  type BundlerReport,
  WebBundlerConfig,
} from '../../../../utils/react/web-bundler-config';
import { unreadViolation } from '../../../../utils/react/react-performance-source';
import { BundleOptimizationConstants } from '../constants';

/**
 * Bundle Optimization Analyzer
 *
 * Single Responsibility: Analyzing bundle optimization configuration
 */
export class BundleOptimizationAnalyzer {
  static analyze(projectRoot: string, bundler?: BundlerReport): string[] {
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

    // A modern Angular project may declare neither `"optimization": true` nor a
    // webpack config, and be correct: the esbuild `application` builder
    // optimises production builds by default, and bundle SIZE is controlled by
    // the budgets array. Requiring the literal key made this law contradict
    // `bundle-optimization-strategy-policy` — same repository, same commit,
    // same audit run, opposite verdicts — and there was no configuration that
    // satisfied both while staying correct for the toolchain.
    if (AngularBundleConfig.hasModernBundleSetup(projectRoot)) {
      return violations;
    }

    return this.frameworkBuildViolations(projectRoot, bundler);
  }

  /**
   * A Next.js or Vite production build minifies and tree-shakes by default;
   * what is read from next.config.* / vite.config.* is whether the project
   * turned that OFF. Without this a Next app could only pass by adding an
   * unused webpack config.
   */
  private static frameworkBuildViolations(
    projectRoot: string,
    bundler?: BundlerReport
  ): string[] {
    const report = bundler ?? WebBundlerConfig.inspect(projectRoot);
    if (WebBundlerConfig.optimizingBuilds(report).length > 0) {
      return [];
    }
    const violations: string[] = [];
    if (report.unread.length > 0) {
      violations.push(unreadViolation(report.unread));
    }
    violations.push('Bundle optimization not properly configured');
    return violations;
  }
}
