import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularSignalConfiguration } from './angular-signal-configuration';
import { AngularSignalValidationPatterns } from './angular-signal-validation-patterns';

/**
 * Angular Signal Patterns Analyzer
 * Specialized utility for analyzing Angular Signal implementation patterns
 * Meta-dogfooding: Uses centralized validation patterns and configuration utilities
 */
export class AngularSignalPatternsAnalyzer extends AngularSignalAnalyzerBase {
  private config?: RuleOfCodeConfig;

  /**
   * Check for proper Signal patterns
   * Meta-dogfooding: Uses centralized configuration and validation patterns
   */
  static checkSignalPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const analyzer = new AngularSignalPatternsAnalyzer();
    analyzer.config = config;
    return analyzer.commonCheck(projectRoot, config);
  }

  protected getFileExtensions(): string[] {
    return [...AngularSignalConfiguration.ANGULAR_FILE_EXTENSIONS];
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzeAngularFile(filePath, violations, suggestions);
  }

  /**
   * Analyze a single Angular file for signal patterns
   * Meta-dogfooding: Delegates to centralized validation patterns
   */
  private analyzeAngularFile(
    angularFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(angularFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const patterns = AngularSignalConfiguration.analyzePatterns(
      content,
      angularFile
    );

    AngularSignalValidationPatterns.validateAllPatterns(
      patterns,
      violations,
      suggestions,
      content,
      this.config || { thresholds: {} }
    );
  }
}
