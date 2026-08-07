import type { RuleOfCodeConfig } from '../../../config/types';
import { ANGULAR_CONSTANTS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularLifecycleConfiguration } from './angular-lifecycle-configuration';
import { AngularLifecycleValidationPatterns } from './angular-lifecycle-validation-patterns';

/**
 * Angular Lifecycle Hooks Analyzer
 * Specialized utility for analyzing Angular lifecycle hook implementation
 * Meta-dogfooding: Uses centralized lifecycle validation utilities
 */
export class AngularLifecycleHooksAnalyzer extends AngularSignalAnalyzerBase {
  /**
   * Check lifecycle hook implementation
   * Meta-dogfooding: Uses centralized file finding and validation patterns
   */
  static checkLifecycleHooks(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return new AngularLifecycleHooksAnalyzer().commonCheck(projectRoot, config);
  }

  protected getFileExtensions(): string[] {
    return [...AngularLifecycleConfiguration.ANGULAR_FILE_EXTENSIONS];
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
   * Analyze a single Angular file for lifecycle hook violations
   * Meta-dogfooding: Uses centralized validation patterns and file reading
   */
  private analyzeAngularFile(
    angularFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(angularFile, {
      encoding: ANGULAR_CONSTANTS.ENCODING_UTF8,
      fallbackToEmpty: true,
    });

    if (!content) return;

    const fileName = PathOperations.getBasename(angularFile);

    // Use centralized validation patterns
    AngularLifecycleValidationPatterns.validateInterfaceImplementation(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularLifecycleValidationPatterns.validateOnInitUsage(
      content,
      fileName,
      violations,
      suggestions
    );
    AngularLifecycleValidationPatterns.validateOnChangesImplementation(
      content,
      fileName,
      violations,
      suggestions
    );
  }
}
