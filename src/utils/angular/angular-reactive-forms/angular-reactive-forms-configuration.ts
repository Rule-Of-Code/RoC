/**
 * Angular Reactive Forms Configuration
 * Centralized configuration for reactive forms analysis patterns and validation messages
 * Meta-dogfooding: Centralizes hardcoded constants and reactive forms patterns
 */
import { SignalConfigurationBase } from '../signal-configuration-base';

export class AngularReactiveFormsConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularReactiveFormsConfiguration;

  /**
   * Reactive forms detection patterns
   */
  static readonly REACTIVE_FORMS_PATTERNS = {
    TEMPLATE_DRIVEN_INDICATORS: ['ngModel', '[(ngModel)]'],
    REACTIVE_FORMS_INDICATORS: ['FormGroup', 'FormBuilder', 'FormControl'],
    REACTIVE_IMPORTS: [
      'ReactiveFormsModule',
      'FormBuilder',
      'FormGroup',
      '@angular/forms',
    ],
    FORM_LIFECYCLE: ['ngOnInit'],
    FORM_ACTIONS: ['onSubmit'],
    FORM_STATES: ['valid', 'invalid'],
    FORM_CONTROLS: ['reset', 'controls'],
    FORM_STRUCTURES: ['FormArray'],
    FORM_GETTERS: ['get ', 'controls'],
  } as const;

  /**
   * Validation messages for reactive forms analysis
   */
  static readonly VALIDATION_MESSAGES = {
    TEMPLATE_DRIVEN_VIOLATION:
      'Template-driven forms found in {fileName}, consider using reactive forms',
    TEMPLATE_DRIVEN_SUGGESTION:
      'Migrate to reactive forms for better validation and testing in {fileName}',
    MISSING_IMPORTS_VIOLATION:
      'Reactive forms used but proper imports missing in {fileName}',
    MISSING_IMPORTS_SUGGESTION:
      'Import ReactiveFormsModule and required classes in {fileName}',
    FORM_BUILDER_SUGGESTION:
      'Consider using FormBuilder for cleaner form creation in {fileName}',
    LIFECYCLE_SUGGESTION:
      'Initialize forms in ngOnInit lifecycle hook in {fileName}',
    SUBMISSION_SUGGESTION: 'Add proper form submission handling in {fileName}',
    VALIDATION_SUGGESTION:
      'Check form validation status before submission in {fileName}',
    RESET_SUGGESTION: 'Use proper form reset method in {fileName}',
    NESTED_FORMS_SUGGESTION:
      'Add getter methods for FormArray controls in {fileName}',
  } as const;

  /**
   * Build validation message with fileName placeholder
   * RULE 2: Eliminates repeated message.replace() calls throughout the codebase
   */
  static buildMessage(messageTemplate: string, fileName: string): string {
    return this.applyFileNamePlaceholder(messageTemplate, fileName);
  }

  /**
   * Analyze reactive forms patterns in content
   * RULE 2: Optimized to eliminate duplicate pattern checks
   */
  static analyzeReactiveFormsPatterns(content: string): {
    hasTemplateDriven: boolean;
    hasReactiveForms: boolean;
    hasReactiveFormsImport: boolean;
    hasFormBuilder: boolean;
    hasLifecycleInit: boolean;
    hasFormSubmission: boolean;
    hasValidation: boolean;
    hasFormReset: boolean;
    hasNestedForms: boolean;
    hasFormGetters: boolean;
  } {
    // Cache pattern arrays for reuse
    const templateDrivenIndicators =
      this.REACTIVE_FORMS_PATTERNS.TEMPLATE_DRIVEN_INDICATORS;
    const reactiveIndicators =
      this.REACTIVE_FORMS_PATTERNS.REACTIVE_FORMS_INDICATORS;
    const reactiveImports = this.REACTIVE_FORMS_PATTERNS.REACTIVE_IMPORTS;
    const formLifecycle = this.REACTIVE_FORMS_PATTERNS.FORM_LIFECYCLE;
    const formActions = this.REACTIVE_FORMS_PATTERNS.FORM_ACTIONS;
    const formStates = this.REACTIVE_FORMS_PATTERNS.FORM_STATES;
    const formControls = this.REACTIVE_FORMS_PATTERNS.FORM_CONTROLS;
    const formStructures = this.REACTIVE_FORMS_PATTERNS.FORM_STRUCTURES;
    const formGetters = this.REACTIVE_FORMS_PATTERNS.FORM_GETTERS;

    return {
      hasTemplateDriven: templateDrivenIndicators.some(indicator =>
        content.includes(indicator)
      ),
      hasReactiveForms: reactiveIndicators.some(indicator =>
        content.includes(indicator)
      ),
      hasReactiveFormsImport: reactiveImports.some(importItem =>
        content.includes(importItem)
      ),
      hasFormBuilder: content.includes('FormBuilder'),
      hasLifecycleInit: formLifecycle.some(lifecycle =>
        content.includes(lifecycle)
      ),
      hasFormSubmission: formActions.some(action => content.includes(action)),
      hasValidation: formStates.some(state => content.includes(state)),
      hasFormReset: formControls.some(control => content.includes(control)),
      hasNestedForms: formStructures.some(structure =>
        content.includes(structure)
      ),
      hasFormGetters: formGetters.some(getter => content.includes(getter)),
    };
  }

  /**
   * Check for specific reactive forms patterns with detailed analysis
   * RULE 2: Private helper for focused pattern detection
   */
  static checkSpecificPatterns(content: string): {
    hasNewFormGroup: boolean;
    hasResetMethod: boolean;
    hasThisReference: boolean;
  } {
    return {
      hasNewFormGroup: content.includes('new FormGroup'),
      hasResetMethod: content.includes('.reset()'),
      hasThisReference: content.includes('this.'),
    };
  }
}
