/**
 * Base class for database query optimization analyzers
 * Consolidates common analysis patterns between query-batching, query-caching, and pagination analyzers
 */

import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { DatabaseQueryOptimizationFileDiscoveryService } from './file-discovery.service';

/**
 * Generic analysis result type
 */
export interface QueryOptimizationAnalysisResult {
  implemented: boolean;
}

/**
 * Base analyzer for database query optimization techniques
 * Provides common framework for analyzing specific query patterns
 */
export class DatabaseQueryOptimizationBaseAnalyzer {
  /**
   * Perform standard analysis pattern for database query techniques
   * Checks service files for specific patterns defined in the checker function
   *
   * @param projectRoot - The root directory of the project
   * @param config - RuleOfCode configuration
   * @param checker - Function to check if specific pattern is implemented in content
   * @returns Result indicating if pattern is implemented
   */
  static analyzePattern(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checker: (content: string) => boolean
  ): QueryOptimizationAnalysisResult {
    const serviceFiles =
      DatabaseQueryOptimizationFileDiscoveryService.findServiceFiles(
        projectRoot,
        config
      );

    for (const serviceFile of serviceFiles) {
      const content =
        DatabaseQueryOptimizationFileDiscoveryService.readServiceFileContent(
          serviceFile
        );
      if (checker(content)) {
        return { implemented: true };
      }
    }

    return { implemented: false };
  }

  /**
   * Perform standard analysis pattern with library fallback
   * Checks service files for patterns and falls back to checking for specific libraries
   *
   * @param projectRoot - The root directory of the project
   * @param config - RuleOfCode configuration
   * @param contentChecker - Function to check if pattern is in content
   * @param libraryChecker - Optional function to check for relevant libraries
   * @returns Result indicating if pattern or libraries are found
   */
  static analyzePatternWithFallback(
    projectRoot: string,
    config: RuleOfCodeConfig,
    contentChecker: (content: string) => boolean,
    libraryChecker?: (projectRoot: string) => boolean
  ): QueryOptimizationAnalysisResult {
    // First check service files
    const result = this.analyzePattern(projectRoot, config, contentChecker);
    if (result.implemented) {
      return result;
    }

    // Fall back to library check if provided
    if (libraryChecker?.(projectRoot)) {
      return { implemented: true };
    }

    return { implemented: false };
  }
}
