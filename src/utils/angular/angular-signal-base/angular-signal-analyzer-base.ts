import type { RuleOfCodeConfig } from '../../../config/types';
import { AngularConfigurationBase } from '../angular-configuration-base';

/**
 * Angular Analyzer Base Class
 * Consolidates common initialization and file discovery patterns
 * Used by signal-patterns, signal-usage, signal-imports, lifecycle, cleanup, and other analyzers
 */
export abstract class AngularSignalAnalyzerBase extends AngularConfigurationBase {
  /**
   * Get the file extensions to search for
   * Must be implemented by subclasses
   */
  protected abstract getFileExtensions(): string[];

  /**
   * Analyze a single file
   * Must be implemented by subclasses
   */
  protected abstract analyzeFile(
    filePath: string,
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void;

  /**
   * Common check implementation for all Angular analyzers
   * Handles directory setup and file discovery
   */
  protected commonCheck(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions, files } =
      AngularSignalAnalyzerBase.initializeAnalysis(
        projectRoot,
        this.getFileExtensions(),
        config
      );
    if (files.length === 0) {
      return { violations, suggestions };
    }

    for (const file of files) {
      this.analyzeFile(file, projectRoot, violations, suggestions);
    }

    return { violations, suggestions };
  }
}
