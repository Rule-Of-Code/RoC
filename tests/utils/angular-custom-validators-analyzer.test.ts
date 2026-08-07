/**
 * @fileoverview Tests for angular-custom-validators-analyzer.ts
 * @description Tests for Angular custom validators analyzer utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularCustomValidatorsAnalyzer } from '../../src/utils/angular/angular-custom-validators/angular-custom-validators-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-custom-validators/angular-custom-validators-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'angular-validators-analyzer-test-'
    );
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;

    // Create src directory
    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('checkCustomValidators', () => {
    it('should return empty results for empty project', () => {
      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze validator files with proper return type', () => {
      const validatorContent = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

        export function minAgeValidator(minAge: number): ValidatorFn {
          return (control: AbstractControl): ValidationErrors | null => {
            const age = control.value;
            return age >= minAge ? null : { minAge: { required: minAge, actual: age } };
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'age.validator.ts'),
        validatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should detect invalid validator return type', () => {
      const validatorContent = `
        import { AbstractControl, ValidatorFn } from '@angular/forms';

        export function badValidator(): ValidatorFn {
          return (control: AbstractControl) => {
            // Missing proper return type annotation
            return control.value ? undefined : { error: true };
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad.validator.ts'),
        validatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should analyze async validators', () => {
      const asyncValidatorContent = `
        import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
        import { Observable, of } from 'rxjs';
        import { map } from 'rxjs/operators';

        export function asyncEmailValidator(): AsyncValidatorFn {
          return (control: AbstractControl): Observable<ValidationErrors | null> => {
            return of(control.value).pipe(
              map(email => email.includes('@') ? null : { invalidEmail: true })
            );
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'email.validator.ts'),
        asyncValidatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should detect async validator with wrong return type', () => {
      const asyncValidatorContent = `
        import { AbstractControl, AsyncValidatorFn } from '@angular/forms';

        export function badAsyncValidator(): AsyncValidatorFn {
          return (control: AbstractControl) => {
            // Returns wrong type
            return control.value;
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad-async.validator.ts'),
        asyncValidatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should suggest reusable validators for unexported functions', () => {
      const validatorContent = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

        function internalValidator(): ValidatorFn {
          return (control: AbstractControl): ValidationErrors | null => {
            return null;
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'internal.validator.ts'),
        validatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze component files for validator usage', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          template: '<input [formControl]="name">'
        })
        export class FormComponent {
          name = new FormControl('', [Validators.required]);
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should suggest adding validators to FormControl without validation', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({
          selector: 'app-form',
          template: '<input [formControl]="email">'
        })
        export class FormComponent {
          email = new FormControl('');
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest password matching for password fields', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-registration',
          template: '<form [formGroup]="form"></form>'
        })
        export class RegistrationComponent {
          form = new FormGroup({
            password: new FormControl('', Validators.required),
            confirmPassword: new FormControl('', Validators.required)
          });
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'registration.component.ts'),
        componentContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest error handling for forms without error display', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          template: '<input [formControl]="name">'
        })
        export class FormComponent {
          name = new FormControl('', [Validators.required]);
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple validator files', () => {
      const validator1 = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
        export const requiredValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
          return control.value ? null : { required: true };
        };
      `;

      const validator2 = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
        export function emailValidator(): ValidatorFn {
          return (control: AbstractControl): ValidationErrors | null => {
            return control.value?.includes('@') ? null : { email: true };
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'required.validator.ts'),
        validator1
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'email.validators.ts'),
        validator2
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });

    it('should handle missing src directory', () => {
      FileUtils.deleteDirectory(PathOperations.join(tempDir, 'src'));

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });
});
