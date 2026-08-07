/**
 * Angular Form Validation Standards Law Implementation
 * Enforces proper form validation patterns and reactive forms
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularCustomValidatorsAnalyzer } from '../../utils/angular/angular-custom-validators';
import { AngularFormValidationPatternsAnalyzer } from '../../utils/angular/angular-form-validation';
import { AngularReactiveFormsUsageAnalyzer } from '../../utils/angular/angular-reactive-forms';

export class AngularFormValidationStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for reactive forms usage using specialized utility
    const reactiveFormsAnalysis =
      AngularReactiveFormsUsageAnalyzer.checkReactiveFormsUsage(
        context.projectRoot,
        context.config
      );
    violations.push(...reactiveFormsAnalysis.violations);
    suggestions.push(...reactiveFormsAnalysis.suggestions);

    // Check for form validation patterns using specialized utility
    const validationAnalysis =
      AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
        context.projectRoot,
        context.config
      );
    violations.push(...validationAnalysis.violations);
    suggestions.push(...validationAnalysis.suggestions);

    // Check for custom validators using specialized utility
    const customValidatorsAnalysis =
      AngularCustomValidatorsAnalyzer.checkCustomValidators(
        context.projectRoot,
        context.config
      );
    violations.push(...customValidatorsAnalysis.violations);
    suggestions.push(...customValidatorsAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Angular Form Validation Standards',
      message:
        violations.length === 0
          ? 'Angular Form Validation Standards compliance verified'
          : `${violations.length} Angular Form Validation violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
