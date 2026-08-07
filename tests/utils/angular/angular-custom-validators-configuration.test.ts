/**
 * @fileoverview Tests for angular-custom-validators-configuration.ts
 * @description Tests for Angular custom validators configuration utility
 */

import { AngularCustomValidatorsConfiguration } from '../../../src/utils/angular/angular-custom-validators/angular-custom-validators-configuration';

describe('utils/angular/angular-custom-validators/angular-custom-validators-configuration', () => {
  describe('VALIDATOR_FILE_EXTENSIONS', () => {
    it('should include validator.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS
      ).toContain('.validator.ts');
    });

    it('should include validators.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS
      ).toContain('.validators.ts');
    });
  });

  describe('COMPONENT_FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.COMPONENT_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should return INVALID_VALIDATOR_RETURN_TYPE message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.INVALID_VALIDATOR_RETURN_TYPE(
          'test.validator.ts'
        );

      expect(message.violationMessage).toContain('test.validator.ts');
      expect(message.violationMessage).toContain('ValidationErrors');
      expect(message.suggestionMessage).toContain('test.validator.ts');
    });

    it('should return INVALID_ASYNC_VALIDATOR_RETURN message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.INVALID_ASYNC_VALIDATOR_RETURN(
          'async.validator.ts'
        );

      expect(message.violationMessage).toContain('async.validator.ts');
      expect(message.violationMessage).toContain('Observable');
      expect(message.suggestionMessage).toContain('Observable');
    });

    it('should return SUGGEST_REUSABLE_VALIDATORS message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_REUSABLE_VALIDATORS(
          'private.validator.ts'
        );

      expect(message.suggestionMessage).toBeDefined();
      expect(typeof message.suggestionMessage).toBe('string');
    });

    it('should return SUGGEST_ADD_VALIDATORS_TO_CONTROL message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_ADD_VALIDATORS_TO_CONTROL(
          'form.component.ts'
        );

      expect(message.suggestionMessage).toBeDefined();
      expect(typeof message.suggestionMessage).toBe('string');
    });

    it('should return SUGGEST_PASSWORD_MATCHING message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_PASSWORD_MATCHING(
          'password.component.ts'
        );

      expect(message.suggestionMessage).toContain('password.component.ts');
    });

    it('should return SUGGEST_ADD_ERROR_HANDLING message with fileName', () => {
      const message =
        AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_ADD_ERROR_HANDLING(
          'input.component.ts'
        );

      expect(message.suggestionMessage).toBeDefined();
      expect(typeof message.suggestionMessage).toBe('string');
    });
  });

  describe('PATTERN_DETECTORS', () => {
    it('should detect ValidatorFn pattern', () => {
      const content = 'export function myValidator(): ValidatorFn {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(
          content
        )
      ).toBe(true);
    });

    it('should detect AbstractControl pattern', () => {
      const content = 'return (control: AbstractControl) => { return null; };';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(
          content
        )
      ).toBe(true);
    });

    it('should detect proper validator return type', () => {
      const content = '): ValidationErrors | null => {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PROPER_VALIDATOR_RETURN_TYPE(
          content
        )
      ).toBe(true);
    });

    it('should not detect proper return type without null', () => {
      const content = '): ValidationErrors => {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PROPER_VALIDATOR_RETURN_TYPE(
          content
        )
      ).toBe(false);
    });

    it('should detect AsyncValidatorFn pattern', () => {
      const content = 'export function asyncValidator(): AsyncValidatorFn {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_VALIDATOR(
          content
        )
      ).toBe(true);
    });

    it('should detect Observable return type', () => {
      const content = '): Observable<ValidationErrors | null> => {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(
          content
        )
      ).toBe(true);
    });

    it('should detect Promise return type', () => {
      const content = '): Promise<ValidationErrors | null> => {';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(
          content
        )
      ).toBe(true);
    });

    it('should detect validator export with function', () => {
      const content = 'export function myValidator()';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(
          content
        )
      ).toBe(true);
    });

    it('should detect validator export with const', () => {
      const content = 'export const myValidator = ';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(
          content
        )
      ).toBe(true);
    });

    it('should detect FormControl usage', () => {
      const content = "new FormControl('', Validators.required)";

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
          content
        )
      ).toBe(true);
    });

    it('should detect Validators. usage', () => {
      const content = 'Validators.required, Validators.email';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATORS_USAGE(
          content
        )
      ).toBe(true);
    });

    it('should detect FormGroup usage', () => {
      const content = 'new FormGroup({})';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_FORM_GROUP(
          content
        )
      ).toBe(true);
    });

    it('should detect password fields', () => {
      const content = "password: new FormControl(''); confirmPassword:";

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PASSWORD_FIELDS(
          content
        )
      ).toBe(true);
    });

    it('should detect matchValidator usage', () => {
      const content = 'matchValidator, passwordMatch';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_MATCH_VALIDATOR(
          content
        )
      ).toBe(true);
    });

    it('should detect hasError usage', () => {
      const content = "form.hasError('required')";

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ERROR_HANDLING(
          content
        )
      ).toBe(true);
    });

    it('should detect errors property usage', () => {
      const content = 'control.errors?.required';

      expect(
        AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ERROR_HANDLING(
          content
        )
      ).toBe(true);
    });
  });

  describe('analyzeValidatorPatterns', () => {
    it('should return complete pattern analysis for validator file', () => {
      const content = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

        export function myValidator(): ValidatorFn {
          return (control: AbstractControl): ValidationErrors | null => {
            return null;
          };
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/my.validator.ts'
        );

      expect(result.hasValidatorFunction).toBe(true);
      expect(result.hasProperReturnType).toBe(true);
      expect(result.hasAsyncValidator).toBe(false);
      expect(result.hasValidatorExport).toBe(true);
      expect(result.fileName).toBe('my.validator.ts');
      expect(result.filePath).toBe('/path/to/my.validator.ts');
    });

    it('should detect async validator patterns', () => {
      const content = `
        import { AsyncValidatorFn } from '@angular/forms';
        import { Observable } from 'rxjs';

        export function asyncValidator(): AsyncValidatorFn {
          return (control): Observable<ValidationErrors | null> => {
            return of(null);
          };
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/async.validator.ts'
        );

      expect(result.hasAsyncValidator).toBe(true);
      expect(result.hasAsyncReturnType).toBe(true);
    });

    it('should handle file with no validator patterns', () => {
      const content = `
        export function helperFunction() {
          return 'hello';
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/helper.ts'
        );

      expect(result.hasValidatorFunction).toBe(false);
      expect(result.hasProperReturnType).toBe(false);
      expect(result.hasValidatorExport).toBe(true);
    });
  });

  describe('analyzeComponentPatterns', () => {
    it('should return complete pattern analysis for component file', () => {
      const content = `
        import { Component } from '@angular/core';
        import { FormControl, FormGroup, Validators } from '@angular/forms';

        @Component({ selector: 'app-form' })
        export class FormComponent {
          form = new FormGroup({
            email: new FormControl('', Validators.required)
          });

          get emailErrors() {
            return this.form.get('email')?.errors;
          }
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/form.component.ts'
        );

      expect(result.hasFormControl).toBe(true);
      expect(result.hasValidatorsUsage).toBe(true);
      expect(result.hasFormGroup).toBe(true);
      expect(result.hasErrorHandling).toBe(true);
      expect(result.fileName).toBe('form.component.ts');
    });

    it('should detect password fields in component', () => {
      const content = `
        import { FormGroup, FormControl } from '@angular/forms';

        export class RegisterComponent {
          form = new FormGroup({
            password: new FormControl(''),
            confirmPassword: new FormControl('')
          });
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/register.component.ts'
        );

      expect(result.hasFormGroup).toBe(true);
      expect(result.hasPasswordFields).toBe(true);
    });

    it('should detect matchValidator usage', () => {
      const content = `
        import { FormGroup, FormControl } from '@angular/forms';
        import { matchValidator } from './validators';

        export class RegisterComponent {
          form = new FormGroup({
            password: new FormControl(''),
            confirmPassword: new FormControl('')
          }, { validators: matchValidator('password', 'confirmPassword') });
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/register.component.ts'
        );

      expect(result.hasMatchValidator).toBe(true);
    });

    it('should handle component with no form patterns', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({ selector: 'app-simple' })
        export class SimpleComponent {
          title = 'Hello World';
        }
      `;

      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/simple.component.ts'
        );

      expect(result.hasFormControl).toBe(false);
      expect(result.hasFormGroup).toBe(false);
      expect(result.hasValidatorsUsage).toBe(false);
    });
  });
});
