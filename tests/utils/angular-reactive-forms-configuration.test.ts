/**
 * @fileoverview Tests for angular-reactive-forms-configuration.ts
 * @description Tests for Angular reactive forms configuration utilities
 */

import { AngularReactiveFormsConfiguration } from '../../src/utils/angular/angular-reactive-forms/angular-reactive-forms-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-reactive-forms/angular-reactive-forms-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-reactive-forms-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('REACTIVE_FORMS_PATTERNS', () => {
    it('should have TEMPLATE_DRIVEN_INDICATORS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .TEMPLATE_DRIVEN_INDICATORS
      ).toContain('ngModel');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .TEMPLATE_DRIVEN_INDICATORS
      ).toContain('[(ngModel)]');
    });

    it('should have REACTIVE_FORMS_INDICATORS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .REACTIVE_FORMS_INDICATORS
      ).toContain('FormGroup');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .REACTIVE_FORMS_INDICATORS
      ).toContain('FormBuilder');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .REACTIVE_FORMS_INDICATORS
      ).toContain('FormControl');
    });

    it('should have REACTIVE_IMPORTS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .REACTIVE_IMPORTS
      ).toContain('ReactiveFormsModule');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .REACTIVE_IMPORTS
      ).toContain('@angular/forms');
    });

    it('should have FORM_LIFECYCLE', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_LIFECYCLE
      ).toContain('ngOnInit');
    });

    it('should have FORM_ACTIONS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_ACTIONS
      ).toContain('onSubmit');
    });

    it('should have FORM_STATES', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_STATES
      ).toContain('valid');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_STATES
      ).toContain('invalid');
    });

    it('should have FORM_CONTROLS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_CONTROLS
      ).toContain('reset');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_CONTROLS
      ).toContain('controls');
    });

    it('should have FORM_STRUCTURES', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS
          .FORM_STRUCTURES
      ).toContain('FormArray');
    });

    it('should have FORM_GETTERS', () => {
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_GETTERS
      ).toContain('get ');
      expect(
        AngularReactiveFormsConfiguration.REACTIVE_FORMS_PATTERNS.FORM_GETTERS
      ).toContain('controls');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have TEMPLATE_DRIVEN_VIOLATION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .TEMPLATE_DRIVEN_VIOLATION
      ).toContain('{fileName}');
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .TEMPLATE_DRIVEN_VIOLATION
      ).toContain('Template-driven');
    });

    it('should have TEMPLATE_DRIVEN_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .TEMPLATE_DRIVEN_SUGGESTION
      ).toContain('reactive forms');
    });

    it('should have MISSING_IMPORTS_VIOLATION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .MISSING_IMPORTS_VIOLATION
      ).toContain('imports');
    });

    it('should have MISSING_IMPORTS_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .MISSING_IMPORTS_SUGGESTION
      ).toContain('ReactiveFormsModule');
    });

    it('should have FORM_BUILDER_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .FORM_BUILDER_SUGGESTION
      ).toContain('FormBuilder');
    });

    it('should have LIFECYCLE_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .LIFECYCLE_SUGGESTION
      ).toContain('ngOnInit');
    });

    it('should have SUBMISSION_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .SUBMISSION_SUGGESTION
      ).toContain('submission');
    });

    it('should have VALIDATION_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .VALIDATION_SUGGESTION
      ).toContain('validation');
    });

    it('should have RESET_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES.RESET_SUGGESTION
      ).toContain('reset');
    });

    it('should have NESTED_FORMS_SUGGESTION', () => {
      expect(
        AngularReactiveFormsConfiguration.VALIDATION_MESSAGES
          .NESTED_FORMS_SUGGESTION
      ).toContain('FormArray');
    });
  });

  describe('buildMessage', () => {
    it('should replace {fileName} placeholder', () => {
      const result = AngularReactiveFormsConfiguration.buildMessage(
        'Error in {fileName}',
        'user-form.component.ts'
      );

      expect(result).toBe('Error in user-form.component.ts');
    });

    it('should handle message without placeholder', () => {
      const result = AngularReactiveFormsConfiguration.buildMessage(
        'Generic error',
        'test.ts'
      );

      expect(result).toBe('Generic error');
    });

    it('should handle empty file name', () => {
      const result = AngularReactiveFormsConfiguration.buildMessage(
        'Error in {fileName}',
        ''
      );

      expect(result).toBe('Error in ');
    });
  });

  describe('analyzeReactiveFormsPatterns', () => {
    it('should detect template-driven forms', () => {
      const content = `
        <input [(ngModel)]="name" />
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasTemplateDriven).toBe(true);
    });

    it('should detect reactive forms with FormGroup', () => {
      const content = `
        this.form = new FormGroup({
          name: new FormControl('')
        });
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasReactiveForms).toBe(true);
    });

    it('should detect FormBuilder usage', () => {
      const content = `
        constructor(private fb: FormBuilder) {
          this.form = this.fb.group({
            name: ['']
          });
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasFormBuilder).toBe(true);
      expect(result.hasReactiveForms).toBe(true);
    });

    it('should detect reactive forms import', () => {
      const content = `
        import { ReactiveFormsModule } from '@angular/forms';
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasReactiveFormsImport).toBe(true);
    });

    it('should detect lifecycle initialization', () => {
      const content = `
        ngOnInit() {
          this.initForm();
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasLifecycleInit).toBe(true);
    });

    it('should detect form submission', () => {
      const content = `
        onSubmit() {
          if (this.form.valid) {
            this.service.save(this.form.value);
          }
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasFormSubmission).toBe(true);
    });

    it('should detect validation checks', () => {
      const content = `
        if (this.form.valid) {
          // submit
        } else if (this.form.invalid) {
          // show errors
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasValidation).toBe(true);
    });

    it('should detect form reset', () => {
      const content = `
        this.form.reset();
        console.log(this.form.controls);
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasFormReset).toBe(true);
    });

    it('should detect nested forms with FormArray', () => {
      const content = `
        this.form = this.fb.group({
          items: this.fb.array([])
        });
        // Using FormArray for dynamic form fields
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasNestedForms).toBe(true);
    });

    it('should detect form getters', () => {
      const content = `
        get items() {
          return this.form.controls.items;
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasFormGetters).toBe(true);
    });

    it('should handle empty content', () => {
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns('');

      expect(result.hasTemplateDriven).toBe(false);
      expect(result.hasReactiveForms).toBe(false);
      expect(result.hasFormBuilder).toBe(false);
    });

    it('should analyze complete reactive form component', () => {
      const content = `
        import { FormBuilder, FormGroup, Validators } from '@angular/forms';
        import { ReactiveFormsModule } from '@angular/forms';

        @Component({...})
        export class UserFormComponent implements OnInit {
          form: FormGroup;

          constructor(private fb: FormBuilder) {}

          ngOnInit() {
            this.form = this.fb.group({
              name: ['', Validators.required],
              email: ['', [Validators.required, Validators.email]]
            });
          }

          get name() {
            return this.form.controls.name;
          }

          onSubmit() {
            if (this.form.valid) {
              this.save();
            }
          }

          reset() {
            this.form.reset();
          }
        }
      `;
      const result =
        AngularReactiveFormsConfiguration.analyzeReactiveFormsPatterns(content);

      expect(result.hasReactiveForms).toBe(true);
      expect(result.hasReactiveFormsImport).toBe(true);
      expect(result.hasFormBuilder).toBe(true);
      expect(result.hasLifecycleInit).toBe(true);
      expect(result.hasFormSubmission).toBe(true);
      expect(result.hasValidation).toBe(true);
      expect(result.hasFormReset).toBe(true);
      expect(result.hasFormGetters).toBe(true);
    });
  });

  describe('checkSpecificPatterns', () => {
    it('should detect new FormGroup usage', () => {
      const content = `this.form = new FormGroup({});`;
      const result =
        AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

      expect(result.hasNewFormGroup).toBe(true);
    });

    it('should detect reset method', () => {
      const content = `this.form.reset();`;
      const result =
        AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

      expect(result.hasResetMethod).toBe(true);
    });

    it('should detect this reference', () => {
      const content = `this.form = this.fb.group({});`;
      const result =
        AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

      expect(result.hasThisReference).toBe(true);
    });

    it('should return all false for simple content', () => {
      const content = `const x = 5;`;
      const result =
        AngularReactiveFormsConfiguration.checkSpecificPatterns(content);

      expect(result.hasNewFormGroup).toBe(false);
      expect(result.hasResetMethod).toBe(false);
      expect(result.hasThisReference).toBe(false);
    });
  });
});
