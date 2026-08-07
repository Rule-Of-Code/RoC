import type { RuleOfCodeConfig } from '../../../config/types';
import { ANGULAR_CONSTANTS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularCleanupConfiguration } from './angular-cleanup-configuration';
import { AngularCleanupValidationPatterns } from './angular-cleanup-validation-patterns';

/**
 * Angular Cleanup Patterns Analyzer
 * Specialized utility for analyzing Angular cleanup patterns and memory leak prevention
 * Meta-dogfooding: Uses centralized validation patterns and configuration utilities
 */
export class AngularCleanupPatternsAnalyzer extends AngularSignalAnalyzerBase {
  /**
   * Check for proper cleanup patterns
   * Meta-dogfooding: Uses centralized configuration and validation patterns
   */
  static checkCleanupPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return new AngularCleanupPatternsAnalyzer().commonCheck(
      projectRoot,
      config
    );
  }

  protected getFileExtensions(): string[] {
    return [...AngularCleanupConfiguration.ANGULAR_FILE_EXTENSIONS];
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzeCleanupFile(filePath, violations, suggestions);
  }

  /**
   * Analyze individual Angular file for cleanup patterns
   * Meta-dogfooding: Delegates to centralized validation patterns
   */
  private analyzeCleanupFile(
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(filePath, {
      encoding: ANGULAR_CONSTANTS.ENCODING_UTF8,
      fallbackToEmpty: true,
    });
    if (!content) return;

    const fileName = PathOperations.getFilename(filePath);

    AngularCleanupValidationPatterns.validateSubscriptionCleanup(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularCleanupValidationPatterns.validateTimerCleanup(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularCleanupValidationPatterns.validateEventListenerCleanup(
      content,
      fileName,
      suggestions
    );
    AngularCleanupValidationPatterns.validateSubjectCompletion(
      content,
      fileName,
      suggestions
    );
  }
}
