import { ANGULAR_CONSTANTS } from '../../constants';
import { StringTemplateUtils } from '../../string-template-utils';
import { NgRxModuleValidationPatterns } from './ngrx-module-validation-patterns';

/**
 * NgRx Module Validator
 * SRP: Responsible only for validating Angular module structure
 * RULE 1 & RULE 2: Optimized with centralized utilities and helper methods
 */
export class NgRxModuleValidator {
  /**
   * Module validation patterns - RULE 2: Direct constant references
   */
  static readonly MODULE_VALIDATION_PATTERNS = {
    ngModule: ANGULAR_CONSTANTS.NG_MODULE_DECORATOR,
    declarations: ANGULAR_CONSTANTS.DECLARATIONS_PROPERTY,
    imports: ANGULAR_CONSTANTS.IMPORTS_PROPERTY,
    providers: ANGULAR_CONSTANTS.PROVIDERS_PROPERTY,
  } as const;

  /**
   * Validation messages
   */
  static readonly VALIDATION_MESSAGES = {
    MODULE_MISSING_DECORATOR: 'Module missing @NgModule decorator in {0}',
    MODULE_INCOMPLETE_STRUCTURE: 'Module configuration incomplete in {0}',
  } as const;

  /**
   * RULE 2: Helper for validating module structure requirements
   * Eliminates repeated pattern checking logic
   */
  private static hasRequiredStructure(
    moduleStructure: ReturnType<
      typeof NgRxModuleValidationPatterns.validateModuleStructure
    >
  ): boolean {
    const { hasImportsProperty, hasProvidersProperty } = moduleStructure;
    // Note: declarations are only relevant for non-standalone modules
    return hasImportsProperty || hasProvidersProperty;
  }

  /**
   * Check module standards and return violations
   * Validates @NgModule decorator and proper configuration
   * RULE 1 & RULE 2: Optimized with existing utilities and helper methods
   */
  static checkModuleStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    // RULE 1: Use existing NgRxModuleValidationPatterns utility instead of duplicate logic
    const moduleStructure =
      NgRxModuleValidationPatterns.validateModuleStructure(content);

    // Check for NgModule decorator
    if (!moduleStructure.hasNgModuleDecorator) {
      violations.push(
        // RULE 1: Use centralized StringTemplateUtils instead of duplicate applyPlaceholders
        StringTemplateUtils.formatTemplate(
          this.VALIDATION_MESSAGES.MODULE_MISSING_DECORATOR,
          filePath
        )
      );
      return;
    }

    // RULE 2: Use helper method to reduce cognitive complexity
    if (!this.hasRequiredStructure(moduleStructure)) {
      violations.push(
        // RULE 1: Use centralized StringTemplateUtils
        StringTemplateUtils.formatTemplate(
          this.VALIDATION_MESSAGES.MODULE_INCOMPLETE_STRUCTURE,
          filePath
        )
      );
    }
  }
}
