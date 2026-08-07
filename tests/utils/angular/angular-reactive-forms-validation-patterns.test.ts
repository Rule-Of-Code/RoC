/**
 * @fileoverview Tests for angular-reactive-forms-validation-patterns.ts
 * @description Tests for Angular reactive forms validation patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularReactiveFormsConfiguration } from '../../../src/utils/angular/angular-reactive-forms/angular-reactive-forms-configuration';
import { AngularReactiveFormsValidationPatterns } from '../../../src/utils/angular/angular-reactive-forms/angular-reactive-forms-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-reactive-forms/angular-reactive-forms-validation-patterns', () => {
  describe('AngularReactiveFormsValidationPatterns', () => {
    describe('analyzeAngularFile', () => {
      it('should detect template-driven forms violation', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { Component } from '@angular/core';
          @Component({ template: '<input [(ngModel)]="name">' })
          export class TestComponent { name = ''; }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('Template-driven');
        expect(suggestions.length).toBeGreaterThan(0);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should add suggestions for reactive forms without best practices', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        // FormGroup usage but missing best practices (no lifecycle, no submission, no validation)
        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class TestComponent {
            form = new FormGroup({});
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        // Should have suggestions for missing best practices
        expect(suggestions.length).toBeGreaterThan(0);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest FormBuilder when using new FormGroup', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class TestComponent {
            form = new FormGroup({});
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        const formBuilderSuggestion = suggestions.find(s =>
          s.includes('FormBuilder')
        );
        expect(formBuilderSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest ngOnInit for form initialization', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class TestComponent {
            form = new FormGroup({});
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        const lifecycleSuggestion = suggestions.find(s =>
          s.includes('ngOnInit')
        );
        expect(lifecycleSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest form submission handling', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class TestComponent {
            form = new FormGroup({});
            ngOnInit() {}
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        const submissionSuggestion = suggestions.find(s =>
          s.includes('submission')
        );
        expect(submissionSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest validation check before submission', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class TestComponent {
            form = new FormGroup({});
            ngOnInit() {}
            onSubmit() {}
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        const validationSuggestion = suggestions.find(s =>
          s.includes('validation')
        );
        expect(validationSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not add violations when all best practices followed', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormBuilder, FormGroup, Validators } from '@angular/forms';
          export class TestComponent {
            form: FormGroup;
            constructor(private fb: FormBuilder) {}
            ngOnInit() {
              this.form = this.fb.group({ name: ['', Validators.required] });
            }
            onSubmit() {
              if (this.form.valid) { }
            }
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should skip empty files', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');

        readFileSpy.mockReturnValue('');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);

        readFileSpy.mockRestore();
      });

      it('should suggest getters for FormArray controls', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { FormGroup, FormArray } from '@angular/forms';
          export class TestComponent {
            form: FormGroup;
            ngOnInit() {
              this.form = new FormGroup({
                items: new FormArray([])
              });
            }
            onSubmit() { if (this.form.valid) {} }
          }
        `);
        basenameSpy.mockReturnValue('test.component.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularReactiveFormsValidationPatterns.analyzeAngularFile(
          '/test/test.component.ts',
          violations,
          suggestions
        );

        const nestedSuggestion = suggestions.find(s => s.includes('FormArray'));
        expect(nestedSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });

    describe('findAngularFiles', () => {
      it('should find component files in src directory', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([
          '/test/src/app.component.ts',
          '/test/src/user.component.ts',
        ]);

        const mockConfig = {
          projectRoot: '/test',
          verbose: false,
          excludePatterns: [],
          includePatterns: [],
        } as unknown as RuleOfCodeConfig;

        const result = AngularReactiveFormsValidationPatterns.findAngularFiles(
          '/test',
          mockConfig
        );

        expect(result).toHaveLength(2);
        expect(result).toContain('/test/src/app.component.ts');

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
      });

      it('should return empty array when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');

        existsSpy.mockReturnValue(false);

        const mockConfig = {
          projectRoot: '/test',
          verbose: false,
          excludePatterns: [],
          includePatterns: [],
        } as unknown as RuleOfCodeConfig;

        const result = AngularReactiveFormsValidationPatterns.findAngularFiles(
          '/test',
          mockConfig
        );

        expect(result).toHaveLength(0);

        existsSpy.mockRestore();
      });
    });

    describe('validateAllReactiveFormsPatterns', () => {
      it('should process all found component files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue(['/test/src/app.component.ts']);
        readFileSpy.mockReturnValue(`
          import { FormGroup } from '@angular/forms';
          export class AppComponent {}
        `);
        basenameSpy.mockReturnValue('app.component.ts');

        const mockConfig = {
          projectRoot: '/test',
          verbose: false,
          excludePatterns: [],
          includePatterns: [],
        } as unknown as RuleOfCodeConfig;

        const result =
          AngularReactiveFormsValidationPatterns.validateAllReactiveFormsPatterns(
            '/test',
            mockConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should return empty result when no files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([]);

        const mockConfig = {
          projectRoot: '/test',
          verbose: false,
          excludePatterns: [],
          includePatterns: [],
        } as unknown as RuleOfCodeConfig;

        const result =
          AngularReactiveFormsValidationPatterns.validateAllReactiveFormsPatterns(
            '/test',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
      });
    });
  });

  describe('AngularReactiveFormsConfiguration', () => {
    describe('analyzeReactiveFormsPatterns', () => {
      it('should detect template-driven forms', () => {
        const content = '<input [(ngModel)]="name">';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasTemplateDriven).toBe(true);
      });

      it('should detect reactive forms', () => {
        const content = 'new FormGroup({})';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasReactiveForms).toBe(true);
      });

      it('should detect FormBuilder usage', () => {
        const content = 'constructor(private fb: FormBuilder) {}';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasFormBuilder).toBe(true);
      });

      it('should detect ReactiveFormsModule import', () => {
        const content = "import { ReactiveFormsModule } from '@angular/forms';";
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasReactiveFormsImport).toBe(true);
      });

      it('should detect ngOnInit lifecycle hook', () => {
        const content = 'ngOnInit() { this.initForm(); }';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasLifecycleInit).toBe(true);
      });

      it('should detect form submission', () => {
        const content = 'onSubmit() { this.save(); }';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasFormSubmission).toBe(true);
      });

      it('should detect form validation', () => {
        const content = 'if (this.form.valid) {}';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasValidation).toBe(true);
      });

      it('should detect FormArray (nested forms)', () => {
        const content = 'new FormArray([])';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasNestedForms).toBe(true);
      });

      it('should detect form reset usage', () => {
        const content = 'this.form.reset()';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasFormReset).toBe(true);
      });

      it('should detect form getters', () => {
        const content = 'get items() { return this.form.controls; }';
        const result =
          AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(
            content
          );

        expect(result.hasFormGetters).toBe(true);
      });
    });

    describe('checkSpecificPatterns', () => {
      it('should detect new FormGroup usage', () => {
        const content = 'this.form = new FormGroup({});';
        const result =
          AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

        expect(result.hasNewFormGroup).toBe(true);
      });

      it('should detect reset method call', () => {
        const content = 'this.form.reset();';
        const result =
          AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

        expect(result.hasResetMethod).toBe(true);
      });

      it('should detect this reference', () => {
        const content = 'this.form = new FormGroup({});';
        const result =
          AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

        expect(result.hasThisReference).toBe(true);
      });

      it('should return false for patterns not present', () => {
        const content = 'const form = {};';
        const result =
          AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

        expect(result.hasNewFormGroup).toBe(false);
        expect(result.hasResetMethod).toBe(false);
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have template-driven violation message', () => {
        expect(
          AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
            .TEMPLATE_DRIVEN_VIOLATION
        ).toBeDefined();
      });

      it('should have missing imports violation message', () => {
        expect(
          AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
            .MISSING_IMPORTS_VIOLATION
        ).toBeDefined();
      });

      it('should have FormBuilder suggestion message', () => {
        expect(
          AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
            .FORM_BUILDER_SUGGESTION
        ).toBeDefined();
      });

      it('should have lifecycle suggestion message', () => {
        expect(
          AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
            .LIFECYCLE_SUGGESTION
        ).toBeDefined();
      });

      it('should have validation suggestion message', () => {
        expect(
          AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
            .VALIDATION_SUGGESTION
        ).toBeDefined();
      });
    });
  });
});
