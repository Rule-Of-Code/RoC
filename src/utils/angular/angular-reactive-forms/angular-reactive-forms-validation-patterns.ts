import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { ANGULAR_CONSTANTS, DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularReactiveFormsConfiguration } from './angular-reactive-forms-configuration';

/**
 * Angular Reactive Forms Validation Patterns
 * Centralized validation methods for reactive forms analysis
 */
export class AngularReactiveFormsValidationPatterns {
  private static readonly Config = AngularReactiveFormsConfiguration;
  private static readonly FILE_NAME_PLACEHOLDER = '{fileName}';
  /**
   * Validate all reactive forms patterns in a project
   */
  static validateAllReactiveFormsPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const componentFiles = this.findAngularFiles(projectRoot, config);

    for (const componentFile of componentFiles) {
      this.analyzeAngularFile(componentFile, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze a single Angular file for reactive forms patterns
   * RULE 1: Cache patterns analysis to eliminate duplicate calls (100% internal coverage)
   * RULE 2: Delegates to private helpers for organized complexity management
   */
  static analyzeAngularFile(
    componentFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(componentFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    const fileName = PathOperations.getBasename(componentFile);
    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeReactiveFormsPatterns(content);
    const specificPatterns = this.Config.checkSpecificPatterns(content);

    // Delegate to private validation helpers with pre-computed patterns (RULE 2)
    this.checkFormsTypePatterns(patterns, fileName, violations, suggestions);
    this.checkFormBuilderPatterns(
      patterns,
      specificPatterns,
      fileName,
      suggestions
    );
    this.checkFormInitializationPatterns(patterns, fileName, suggestions);
    this.checkFormValidationPatterns(patterns, fileName, suggestions);
    this.checkFormResetPatterns(
      patterns,
      specificPatterns,
      fileName,
      suggestions
    );
    this.checkNestedFormPatterns(patterns, fileName, suggestions);
  }

  /**
   * Helper: Validate forms type patterns (template-driven vs reactive)
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkFormsTypePatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasTemplateDriven && !patterns.hasReactiveForms) {
      violations.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.TEMPLATE_DRIVEN_VIOLATION,
          fileName
        )
      );
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.TEMPLATE_DRIVEN_SUGGESTION,
          fileName
        )
      );
    }

    if (patterns.hasReactiveForms && !patterns.hasReactiveFormsImport) {
      violations.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.MISSING_IMPORTS_VIOLATION,
          fileName
        )
      );
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.MISSING_IMPORTS_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate FormBuilder usage patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkFormBuilderPatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    specificPatterns: ReturnType<typeof this.Config.checkSpecificPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (
      patterns.hasReactiveForms &&
      !patterns.hasFormBuilder &&
      specificPatterns.hasNewFormGroup
    ) {
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.FORM_BUILDER_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate form initialization and submission patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkFormInitializationPatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasReactiveForms && !patterns.hasLifecycleInit) {
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.LIFECYCLE_SUGGESTION,
          fileName
        )
      );
    }

    if (patterns.hasReactiveForms && !patterns.hasFormSubmission) {
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.SUBMISSION_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate form validation patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkFormValidationPatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasReactiveForms && !patterns.hasValidation) {
      suggestions.push(
        this.applyFileNamePlaceholder(
          this.Config.VALIDATION_MESSAGES.VALIDATION_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate form reset patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkFormResetPatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    specificPatterns: ReturnType<typeof this.Config.checkSpecificPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasReactiveForms && patterns.hasFormReset) {
      if (
        !specificPatterns.hasThisReference ||
        !specificPatterns.hasResetMethod
      ) {
        suggestions.push(
          this.applyFileNamePlaceholder(
            this.Config.VALIDATION_MESSAGES.RESET_SUGGESTION,
            fileName
          )
        );
      }
    }
  }

  /**
   * Helper: Validate nested form structure patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkNestedFormPatterns(
    patterns: ReturnType<typeof this.Config.analyzeReactiveFormsPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasReactiveForms && patterns.hasNestedForms) {
      if (!patterns.hasFormGetters) {
        suggestions.push(
          this.applyFileNamePlaceholder(
            this.Config.VALIDATION_MESSAGES.NESTED_FORMS_SUGGESTION,
            fileName
          )
        );
      }
    }
  }

  /**
   * Helper: Apply fileName placeholder to validation messages
   * RULE 2: Centralized message templating (eliminates duplicate .replace() calls)
   */
  private static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return message.replace(this.FILE_NAME_PLACEHOLDER, fileName);
  }

  /**
   * Find Angular component files in the project
   * Uses utility for consistent file discovery patterns
   */
  static findAngularFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return [];
    }

    return CheckerUtils.findFilesByExtension(
      srcPath,
      [ANGULAR_CONSTANTS.COMPONENT_TS],
      config
    );
  }
}
