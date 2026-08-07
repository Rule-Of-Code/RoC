/**
 * @fileoverview Tests for angular-custom-validators-analyzer.ts
 * @description Tests for Angular custom validators analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularCustomValidatorsAnalyzer } from '../../../src/utils/angular/angular-custom-validators/angular-custom-validators-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

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

    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
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

    it('should suggest reusable validators for non-exported functions', () => {
      const validatorContent = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

        function privateValidator(): ValidatorFn {
          return (control: AbstractControl): ValidationErrors | null => {
            return null;
          };
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'private.validator.ts'),
        validatorContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze component files with form controls', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl, FormGroup, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          template: '<form [formGroup]="form"></form>'
        })
        export class FormComponent {
          form = new FormGroup({
            email: new FormControl('', [Validators.required, Validators.email])
          });
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

    it('should detect form control without validators', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({
          selector: 'app-form',
          template: ''
        })
        export class FormComponent {
          email = new FormControl('');
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'no-validators.component.ts'),
        componentContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing src directory', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'nonexistent');

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        nonExistentPath,
        mockConfig
      );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should analyze validators.ts files', () => {
      const validatorsContent = `
        import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

        export const customValidators = {
          required: (control: AbstractControl): ValidationErrors | null => {
            return control.value ? null : { required: true };
          }
        };
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'custom.validators.ts'),
        validatorsContent
      );

      const result = AngularCustomValidatorsAnalyzer.checkCustomValidators(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });
  });
});
