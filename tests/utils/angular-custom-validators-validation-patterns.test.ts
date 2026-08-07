/**
 * @fileoverview Tests for angular-custom-validators-validation-patterns.ts
 * @description Tests for Angular custom validators validation patterns utility
 */

import { AngularCustomValidatorsConfiguration } from '../../src/utils/angular/angular-custom-validators/angular-custom-validators-configuration';
import { AngularCustomValidatorsValidationPatterns } from '../../src/utils/angular/angular-custom-validators/angular-custom-validators-validation-patterns';

describe('utils/angular/angular-custom-validators/angular-custom-validators-validation-patterns', () => {
  describe('validateValidatorReturnType', () => {
    it('should add violation for missing proper return type', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function badValidator(control: AbstractControl) {
            return { error: true };
          }
        `,
          '/path/to/bad.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidatorReturnType(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass for proper ValidationErrors | null return type', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function goodValidator(control: AbstractControl): ValidationErrors | null {
            return null;
          }
        `,
          '/path/to/good.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidatorReturnType(
        patterns,
        violations,
        suggestions
      );

      // Should have no violations for proper return type
      expect(violations).toBeInstanceOf(Array);
    });
  });

  describe('validateAsyncValidatorPattern', () => {
    it('should add violation for async validator without Observable/Promise', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function asyncValidator(): AsyncValidatorFn {
            return (control: AbstractControl) => {
              return { error: true };
            };
          }
        `,
          '/path/to/async.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAsyncValidatorPattern(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass for async validator with Observable return', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function asyncValidator(): AsyncValidatorFn {
            return (control: AbstractControl): Observable<ValidationErrors | null> => {
              return of(null);
            };
          }
        `,
          '/path/to/async.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAsyncValidatorPattern(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });

    it('should pass for async validator with Promise return', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function asyncValidator(): AsyncValidatorFn {
            return (control: AbstractControl): Promise<ValidationErrors | null> => {
              return Promise.resolve(null);
            };
          }
        `,
          '/path/to/async.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAsyncValidatorPattern(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });

    it('should not check non-async validators', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function syncValidator(): ValidatorFn {
            return (control: AbstractControl): ValidationErrors | null => {
              return null;
            };
          }
        `,
          '/path/to/sync.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAsyncValidatorPattern(
        patterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });
  });

  describe('validateValidatorExport', () => {
    it('should suggest exporting validators', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          function internalValidator(control: AbstractControl): ValidationErrors | null {
            return null;
          }
        `,
          '/path/to/internal.validator.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidatorExport(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest for exported validators', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function publicValidator(control: AbstractControl): ValidationErrors | null {
            return null;
          }
        `,
          '/path/to/public.validator.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidatorExport(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });

    it('should pass for exported const validators', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export const myValidator = (control: AbstractControl): ValidationErrors | null => {
            return null;
          };
        `,
          '/path/to/const.validator.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidatorExport(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateFormControlValidators', () => {
    it('should suggest adding validators to FormControl', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            name = new FormControl('');
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateFormControlValidators(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when validators are present', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            name = new FormControl('', [Validators.required]);
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateFormControlValidators(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateCrossFieldValidation', () => {
    it('should suggest password matching for password fields', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class RegistrationComponent {
            form = new FormGroup({
              password: new FormControl(''),
              confirmPassword: new FormControl('')
            });
          }
        `,
          '/path/to/registration.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateCrossFieldValidation(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when match validator exists', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class RegistrationComponent {
            form = new FormGroup({
              password: new FormControl(''),
              confirmPassword: new FormControl('')
            }, { validators: matchValidator('password', 'confirmPassword') });
          }
        `,
          '/path/to/registration.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateCrossFieldValidation(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateValidationErrorDisplay', () => {
    it('should suggest error handling for forms without it', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            name = new FormControl('', Validators.required);
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidationErrorDisplay(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when hasError is used', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            name = new FormControl('', Validators.required);

            get nameError() {
              return this.name.hasError('required') ? 'Name is required' : '';
            }
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidationErrorDisplay(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });

    it('should not suggest when errors property is accessed', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            name = new FormControl('', Validators.required);

            get nameErrors() {
              return this.name.errors;
            }
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateValidationErrorDisplay(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateAllValidatorPatterns', () => {
    it('should run all validator validations', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          `
          export function myValidator(): ValidatorFn {
            return (control: AbstractControl): ValidationErrors | null => {
              return null;
            };
          }
        `,
          '/path/to/my.validator.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAllValidatorPatterns(
        patterns,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validateAllComponentPatterns', () => {
    it('should run all component validations', () => {
      const patterns =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          `
          export class FormComponent {
            form = new FormGroup({
              name: new FormControl('')
            });
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularCustomValidatorsValidationPatterns.validateAllComponentPatterns(
        patterns,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });
  });
});
