import type { RuleOfCodeConfig } from '../../../config/types';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularFormValidationConfiguration } from './angular-form-validation-configuration';
import { AngularFormValidationValidationPatterns } from './angular-form-validation-validation-patterns';
/**
 * Angular Form Validation Patterns Analyzer
 * Analyzes Angular form validation patterns and practices
 */
export class AngularFormValidationPatternsAnalyzer extends AngularSignalAnalyzerBase {
  /**
   * Check for form validation patterns
   * Meta-dogfooding: Uses centralized configuration and delegated processing
   */
  static checkValidationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return new AngularFormValidationPatternsAnalyzer().commonCheck(
      projectRoot,
      config
    );
  }

  protected getFileExtensions(): string[] {
    return AngularFormValidationConfiguration.ANGULAR_FILE_EXTENSIONS;
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    AngularFormValidationValidationPatterns.processComponentFile(
      filePath,
      violations,
      suggestions
    );
  }
}
