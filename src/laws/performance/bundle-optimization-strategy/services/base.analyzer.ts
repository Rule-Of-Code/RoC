/**
 * Base class for bundle optimization analyzers
 * Consolidates common analysis patterns for CSS, minification, and vendor chunk optimization
 */

import { FileUtils, PathOperations } from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../../../utils/file-system-operations';
import { BundleOptimizationStrategyCheckConstants } from '../constants';

/**
 * Base analyzer for bundle optimization techniques
 * Provides common framework for analyzing bundle optimization features
 */
export class BundleOptimizationBaseAnalyzer {
  /**
   * Perform standard analysis pattern for bundle optimization
   * Checks angular.json or Nx project.json files for specific patterns
   *
   * @param projectRoot - The root directory of the project
   * @param patterns - Patterns to check for in angular.json (RegExp or string)
   * @param successMessage - Message to add if patterns found
   * @returns Result with configuration status and messages
   */
  static analyzeAngularConfiguration(
    projectRoot: string,
    patterns: Array<RegExp | string>,
    successMessage: string
  ): {
    messages: string[];
  } {
    const messages: string[] = [];

    // Try angular.json first (standard Angular CLI)
    const angularJsonPath = PathOperations.join(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.ANGULAR_JSON_FILE
    );

    if (this.fileMatchesPatterns(angularJsonPath, patterns)) {
      messages.push(successMessage);
      return { messages };
    }

    // Fallback: Check Nx project.json files in apps directory
    const appsDir = PathOperations.join(projectRoot, 'apps');
    if (FileUtils.exists(appsDir) && FileUtils.isDirectory(appsDir)) {
      try {
        const entries = FileSystemOperations.readDirectory(appsDir);
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const projectJsonPath = PathOperations.join(
              appsDir,
              entry.name,
              'project.json'
            );
            if (this.fileMatchesPatterns(projectJsonPath, patterns)) {
              messages.push(successMessage);
              return { messages };
            }
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }

    return { messages };
  }

  /**
   * Check if a config file exists and its content matches any of the patterns
   */
  private static fileMatchesPatterns(
    filePath: string,
    patterns: Array<RegExp | string>
  ): boolean {
    if (FileUtils.exists(filePath)) {
      try {
        const content = FileUtils.readFile(filePath, {
          encoding: 'utf8',
        });

        if (this.hasPattern(content, patterns)) {
          return true;
        }
      } catch {
        // Ignore read errors
      }
    }
    return false;
  }

  /**
   * Analyze bundle optimization with dependency check fallback
   *
   * @param projectRoot - The root directory of the project
   * @param patterns - Patterns to check for in angular.json
   * @param successMessage - Message if patterns found
   * @param dependenciesToCheck - Optional dependencies to check for
   * @param depMessage - Message if dependencies found
   * @returns Result with messages and configuration status
   */
  static analyzeWithDependencyFallback(
    projectRoot: string,
    patterns: Array<RegExp | string>,
    successMessage: string,
    dependenciesToCheck?: string[],
    depMessage?: string
  ): {
    messages: string[];
  } {
    // First check angular.json
    const result = this.analyzeAngularConfiguration(
      projectRoot,
      patterns,
      successMessage
    );

    // If not found and dependencies provided, check package.json
    if (!result.messages.length && dependenciesToCheck && depMessage) {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      if (dependenciesToCheck.some(pkg => allDeps[pkg])) {
        result.messages.push(depMessage);
      }
    }

    return result;
  }

  /**
   * Check if content matches any of the given patterns
   */
  private static hasPattern(
    content: string,
    patterns: Array<RegExp | string>
  ): boolean {
    return patterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return content.includes(pattern);
    });
  }
}
