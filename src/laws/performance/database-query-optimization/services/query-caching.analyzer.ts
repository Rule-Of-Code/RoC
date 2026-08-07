import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { DatabaseQueryOptimizationCheckConstants } from '../constants';
import { DatabaseQueryOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * QueryCachingAnalyzerService
 *
 * Responsibility:
 * - Analyze query caching implementation
 * - Check for caching patterns and libraries
 */
export class QueryCachingAnalyzerService {
  /**
   * Analyze query caching implementation
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { implemented: boolean } {
    return DatabaseQueryOptimizationBaseAnalyzer.analyzePatternWithFallback(
      projectRoot,
      config,
      content => DatabaseQueryOptimizationCheckConstants.hasCaching(content),
      projectRoot => this.hasCachingLibraries(projectRoot)
    );
  }

  /**
   * Check if caching libraries are installed
   */
  private static hasCachingLibraries(projectRoot: string): boolean {
    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const cachingLibraries =
        DatabaseQueryOptimizationCheckConstants.CACHING_LIBRARIES;
      return cachingLibraries.some(lib => deps[lib]);
    } catch {
      // Ignore errors
    }

    return false;
  }
}
