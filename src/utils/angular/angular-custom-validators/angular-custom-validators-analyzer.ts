import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { AngularCustomValidatorsConfiguration } from './angular-custom-validators-configuration';
import { AngularCustomValidatorsValidationPatterns } from './angular-custom-validators-validation-patterns';

/**
 * Angular Custom Validators Analyzer
 * Specialized utility for analyzing custom validator implementation patterns
 * Meta-dogfooding: Uses centralized validation patterns and configuration utilities
 */
export class AngularCustomValidatorsAnalyzer extends AngularConfigurationBase {
  /**
   * Check for custom validators implementation
   * Meta-dogfooding: Uses centralized configuration and validation patterns
   */
  static checkCustomValidators(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } =
      AngularCustomValidatorsAnalyzer.initializeAnalysis(
        projectRoot,
        [
          ...AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS,
          ...AngularCustomValidatorsConfiguration.COMPONENT_FILE_EXTENSIONS,
        ],
        config
      );

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions };
    }

    const validatorFiles = CheckerUtils.findFilesByExtension(
      srcPath,
      [...AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS],
      config
    );
    const componentFiles = CheckerUtils.findFilesByExtension(
      srcPath,
      [...AngularCustomValidatorsConfiguration.COMPONENT_FILE_EXTENSIONS],
      config
    );

    validatorFiles.forEach(validatorFile => {
      AngularCustomValidatorsAnalyzer.analyzeValidatorFile(
        validatorFile,
        violations,
        suggestions
      );
    });
    componentFiles.forEach(componentFile => {
      AngularCustomValidatorsAnalyzer.analyzeComponentFile(
        componentFile,
        violations,
        suggestions
      );
    });

    return { violations, suggestions };
  }

  protected static getFileExtensions(): string[] {
    return [];
  }

  protected static analyzeFile(
    _filePath: string,
    _projectRoot: string,
    _violations: string[],
    _suggestions: string[]
  ): void {
    // Not used - this class uses custom logic in checkCustomValidators
  }

  /**
   * Analyze validator file for custom validator patterns
   * Meta-dogfooding: Delegates to centralized validation patterns
   */
  private static analyzeValidatorFile(
    validatorFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(validatorFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const patterns =
      AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
        content,
        validatorFile
      );

    if (patterns.hasValidatorFunction) {
      AngularCustomValidatorsValidationPatterns.validateAllValidatorPatterns(
        patterns,
        violations,
        suggestions
      );
    }
  }

  /**
   * Analyze component file for validation usage patterns
   * Meta-dogfooding: Delegates to centralized validation patterns
   */
  private static analyzeComponentFile(
    componentFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(componentFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const patterns =
      AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
        content,
        componentFile
      );

    AngularCustomValidatorsValidationPatterns.validateAllComponentPatterns(
      patterns,
      suggestions
    );
  }
}
