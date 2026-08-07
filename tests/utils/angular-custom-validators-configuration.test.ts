/**
 * @fileoverview Tests for angular-custom-validators-configuration.ts
 * @description Tests for Angular custom validators configuration utilities
 */

import { AngularCustomValidatorsConfiguration } from '../../src/utils/angular/angular-custom-validators/angular-custom-validators-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-custom-validators/angular-custom-validators-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-custom-validators-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('VALIDATOR_FILE_EXTENSIONS', () => {
    it('should contain .validator.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS
      ).toContain('.validator.ts');
    });

    it('should contain .validators.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.VALIDATOR_FILE_EXTENSIONS
      ).toContain('.validators.ts');
    });
  });

  describe('COMPONENT_FILE_EXTENSIONS', () => {
    it('should contain .component.ts extension', () => {
      expect(
        AngularCustomValidatorsConfiguration.COMPONENT_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    describe('INVALID_VALIDATOR_RETURN_TYPE', () => {
      it('should return violation and suggestion messages', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.INVALID_VALIDATOR_RETURN_TYPE(
            'email.validator.ts'
          );

        expect(result.violationMessage).toContain('email.validator.ts');
        expect(result.violationMessage).toContain('ValidationErrors');
        expect(result.suggestionMessage).toContain('email.validator.ts');
      });
    });

    describe('INVALID_ASYNC_VALIDATOR_RETURN', () => {
      it('should return violation and suggestion messages', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.INVALID_ASYNC_VALIDATOR_RETURN(
            'async.validator.ts'
          );

        expect(result.violationMessage).toContain('async.validator.ts');
        expect(result.violationMessage).toMatch(/Observable|Promise/);
        expect(result.suggestionMessage).toContain('async.validator.ts');
      });
    });

    describe('SUGGEST_REUSABLE_VALIDATORS', () => {
      it('should return suggestion message', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_REUSABLE_VALIDATORS(
            'form.component.ts'
          );

        expect(result.suggestionMessage).toContain('validator');
      });
    });

    describe('SUGGEST_ADD_VALIDATORS_TO_CONTROL', () => {
      it('should return suggestion message', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_ADD_VALIDATORS_TO_CONTROL(
            'user.component.ts'
          );

        expect(result.suggestionMessage).toContain('validator');
      });
    });

    describe('SUGGEST_PASSWORD_MATCHING', () => {
      it('should return suggestion message', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_PASSWORD_MATCHING(
            'register.component.ts'
          );

        expect(result.suggestionMessage).toContain('register.component.ts');
      });
    });

    describe('SUGGEST_ADD_ERROR_HANDLING', () => {
      it('should return suggestion message', () => {
        const result =
          AngularCustomValidatorsConfiguration.VALIDATION_MESSAGES.SUGGEST_ADD_ERROR_HANDLING(
            'form.component.ts'
          );

        expect(result.suggestionMessage).toContain('error');
      });
    });
  });

  describe('PATTERN_DETECTORS', () => {
    describe('HAS_VALIDATOR_FUNCTION', () => {
      it('should detect ValidatorFn', () => {
        const content = `export const myValidator: ValidatorFn = (control) => null;`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect AbstractControl', () => {
        const content = `export function myValidator(control: AbstractControl) {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for non-validator content', () => {
        const content = `export class UserService {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_FUNCTION(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_PROPER_VALIDATOR_RETURN_TYPE', () => {
      it('should detect proper return type', () => {
        const content = `
          export function myValidator(control: AbstractControl): ValidationErrors | null {
            return null;
          }
        `;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PROPER_VALIDATOR_RETURN_TYPE(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for missing return type', () => {
        const content = `export function myValidator(control: AbstractControl) {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PROPER_VALIDATOR_RETURN_TYPE(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_ASYNC_VALIDATOR', () => {
      it('should detect AsyncValidatorFn', () => {
        const content = `export const asyncValidator: AsyncValidatorFn = (control) => of(null);`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_VALIDATOR(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for sync validator', () => {
        const content = `export const syncValidator: ValidatorFn = (control) => null;`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_VALIDATOR(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_ASYNC_RETURN_TYPE', () => {
      it('should detect Observable return type', () => {
        const content = `return this.http.get('/check').pipe(map(() => null)) as Observable<ValidationErrors | null>;`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect Promise return type', () => {
        const content = `return new Promise((resolve) => resolve(null));`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for sync return', () => {
        const content = `return null;`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ASYNC_RETURN_TYPE(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_VALIDATOR_EXPORT', () => {
      it('should detect exported function', () => {
        const content = `export function myValidator() {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect exported const', () => {
        const content = `export const myValidator = () => {};`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for non-exported', () => {
        const content = `function myValidator() {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATOR_EXPORT(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_FORM_CONTROL', () => {
      it('should detect FormControl', () => {
        const content = `this.form = new FormControl('');`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no FormControl', () => {
        const content = `this.data = '';`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_FORM_CONTROL(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_VALIDATORS_USAGE', () => {
      it('should detect Validators.', () => {
        const content = `new FormControl('', Validators.required);`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATORS_USAGE(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect array validators', () => {
        const content = `new FormControl('', [required, email]);`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_VALIDATORS_USAGE(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_FORM_GROUP', () => {
      it('should detect FormGroup', () => {
        const content = `this.form = new FormGroup({});`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_FORM_GROUP(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_PASSWORD_FIELDS', () => {
      it('should detect password and confirm fields', () => {
        const content = `
          password: new FormControl(''),
          confirmPassword: new FormControl('')
        `;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PASSWORD_FIELDS(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false for no password fields', () => {
        const content = `email: new FormControl('');`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_PASSWORD_FIELDS(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('HAS_MATCH_VALIDATOR', () => {
      it('should detect match validator', () => {
        const content = `validators: [matchValidator('password', 'confirmPassword')]`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_MATCH_VALIDATOR(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('HAS_ERROR_HANDLING', () => {
      it('should detect hasError', () => {
        const content = `<div *ngIf="form.hasError('required', 'name')">`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ERROR_HANDLING(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect .errors', () => {
        const content = `if (control.errors) {}`;

        const result =
          AngularCustomValidatorsConfiguration.PATTERN_DETECTORS.HAS_ERROR_HANDLING(
            content
          );

        expect(result).toBe(true);
      });
    });
  });

  describe('analyzeValidatorPatterns', () => {
    it('should detect validator function', () => {
      const content = `
        export function emailValidator(control: AbstractControl): ValidationErrors | null {
          return null;
        }
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/email.validator.ts'
        );

      expect(result.hasValidatorFunction).toBe(true);
    });

    it('should detect proper return type', () => {
      const content = `
        export function emailValidator(control: AbstractControl): ValidationErrors | null {
          return null;
        }
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/email.validator.ts'
        );

      expect(result.hasProperReturnType).toBe(true);
    });

    it('should detect async validator', () => {
      const content = `
        export const uniqueEmailValidator: AsyncValidatorFn = (control) => {
          return of(null);
        };
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/email.validator.ts'
        );

      expect(result.hasAsyncValidator).toBe(true);
    });

    it('should detect async return type', () => {
      const content = `
        export const uniqueEmailValidator = (http: HttpClient) => {
          return (control: AbstractControl): Observable<ValidationErrors | null> => {
            return http.get('/check').pipe(map(() => null));
          };
        };
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/email.validator.ts'
        );

      expect(result.hasAsyncReturnType).toBe(true);
    });

    it('should detect validator export', () => {
      const content = `
        export const myValidator = (control: AbstractControl) => null;
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          '/path/to/my.validator.ts'
        );

      expect(result.hasValidatorExport).toBe(true);
    });

    it('should extract fileName from path', () => {
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          '',
          '/path/to/email.validator.ts'
        );

      expect(result.fileName).toBe('email.validator.ts');
      expect(result.filePath).toBe('/path/to/email.validator.ts');
    });

    it('should handle empty content', () => {
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          '',
          'empty.validator.ts'
        );

      expect(result.hasValidatorFunction).toBe(false);
      expect(result.hasProperReturnType).toBe(false);
      expect(result.hasAsyncValidator).toBe(false);
    });

    it('should analyze complete validator file', () => {
      const content = `
        import { AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
        import { Observable, of } from 'rxjs';

        export function requiredValidator(control: AbstractControl): ValidationErrors | null {
          return control.value ? null : { required: true };
        }

        export const uniqueEmailValidator: AsyncValidatorFn = (control: AbstractControl): Observable<ValidationErrors | null> => {
          return of(null);
        };
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeValidatorPatterns(
          content,
          'validators.ts'
        );

      expect(result.hasValidatorFunction).toBe(true);
      expect(result.hasProperReturnType).toBe(true);
      expect(result.hasAsyncValidator).toBe(true);
      expect(result.hasAsyncReturnType).toBe(true);
      expect(result.hasValidatorExport).toBe(true);
    });
  });

  describe('analyzeComponentPatterns', () => {
    it('should detect FormControl usage', () => {
      const content = `
        this.emailControl = new FormControl('');
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasFormControl).toBe(true);
    });

    it('should detect validators usage', () => {
      const content = `
        new FormControl('', [Validators.required, customValidator]);
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasValidatorsUsage).toBe(true);
    });

    it('should detect FormGroup', () => {
      const content = `
        this.form = new FormGroup({});
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasFormGroup).toBe(true);
    });

    it('should detect password fields', () => {
      const content = `
        password: new FormControl(''),
        confirmPassword: new FormControl('')
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/register.component.ts'
        );

      expect(result.hasPasswordFields).toBe(true);
    });

    it('should detect match validator', () => {
      const content = `
        validators: [matchValidator('password', 'confirmPassword')]
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/register.component.ts'
        );

      expect(result.hasMatchValidator).toBe(true);
    });

    it('should detect error handling', () => {
      const content = `
        if (this.form.hasError('required', 'name')) {
          // show error
        }
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasErrorHandling).toBe(true);
    });

    it('should extract fileName from path', () => {
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          '',
          '/path/to/user-form.component.ts'
        );

      expect(result.fileName).toBe('user-form.component.ts');
      expect(result.filePath).toBe('/path/to/user-form.component.ts');
    });

    it('should analyze complete component with validators', () => {
      const content = `
        import { FormGroup, FormControl, Validators } from '@angular/forms';
        import { matchValidator } from './validators';

        @Component({...})
        export class RegisterComponent {
          form = new FormGroup({
            email: new FormControl('', [Validators.required, Validators.email]),
            password: new FormControl('', Validators.required),
            confirmPassword: new FormControl('')
          }, { validators: [matchValidator('password', 'confirmPassword')] });

          get emailErrors() {
            return this.form.hasError('required', 'email');
          }
        }
      `;
      const result =
        AngularCustomValidatorsConfiguration.analyzeComponentPatterns(
          content,
          'register.component.ts'
        );

      expect(result.hasFormControl).toBe(true);
      expect(result.hasFormGroup).toBe(true);
      expect(result.hasValidatorsUsage).toBe(true);
      expect(result.hasPasswordFields).toBe(true);
      expect(result.hasMatchValidator).toBe(true);
      expect(result.hasErrorHandling).toBe(true);
    });
  });
});
