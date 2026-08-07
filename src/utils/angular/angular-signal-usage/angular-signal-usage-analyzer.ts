import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularSignalUsageConfiguration } from './angular-signal-usage-configuration';
import { AngularSignalUsageValidationPatterns } from './angular-signal-usage-validation-patterns';

/**
 * Angular Signal Usage Analyzer
 * Specialized utility for analyzing Angular Signals usage patterns
 * Meta-dogfooding: Uses centralized validation patterns and configuration utilities
 */
export class AngularSignalUsageAnalyzer extends AngularSignalAnalyzerBase {
  /**
   * Check for Signal usage in Angular components
   * Meta-dogfooding: Uses centralized configuration and validation patterns
   */
  static checkSignalUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return new AngularSignalUsageAnalyzer().commonCheck(projectRoot, config);
  }

  protected getFileExtensions(): string[] {
    return [...AngularSignalUsageConfiguration.ANGULAR_FILE_EXTENSIONS];
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzeComponentFile(filePath, violations, suggestions);
  }

  /**
   * Analyze a single component file for signal usage opportunities
   * Meta-dogfooding: Delegates to centralized validation patterns
   */
  private analyzeComponentFile(
    componentFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(componentFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    // Read template file if exists
    const templateFile =
      AngularSignalUsageConfiguration.PATTERN_DETECTORS.GET_TEMPLATE_FILE_PATH(
        componentFile
      );
    const templateContent = FileUtils.exists(templateFile)
      ? FileUtils.readFile(templateFile, {
          encoding: 'utf8',
          fallbackToEmpty: true,
        })
      : undefined;

    const patterns = AngularSignalUsageConfiguration.analyzePatterns(
      content,
      componentFile,
      templateContent
    );

    AngularSignalUsageValidationPatterns.validateAllPatterns(
      patterns,
      suggestions
    );
  }
}
