/**
 * @fileoverview Tests for angular-form-validation-configuration.ts
 * @description Tests for Angular form validation configuration utilities
 */

import { AngularFormValidationConfiguration } from '../../src/utils/angular/angular-form-validation/angular-form-validation-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-form-validation/angular-form-validation-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-form-validation-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should contain component.ts extension', () => {
      expect(
        AngularFormValidationConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });
  });

  describe('DIRECTORIES', () => {
    it('should have SRC directory defined', () => {
      expect(AngularFormValidationConfiguration.DIRECTORIES.SRC).toBe('src');
    });
  });

  describe('FORM_PATTERNS', () => {
    it('should have FORM_CONTROL pattern', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.FORM_CONTROL
      ).toBe('FormControl');
    });

    it('should have FORM_GROUP pattern', () => {
      expect(AngularFormValidationConfiguration.FORM_PATTERNS.FORM_GROUP).toBe(
        'FormGroup'
      );
    });

    it('should have VALIDATORS_REQUIRED pattern', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.VALIDATORS_REQUIRED
      ).toBe('Validators.required');
    });

    it('should have REQUIRED pattern', () => {
      expect(AngularFormValidationConfiguration.FORM_PATTERNS.REQUIRED).toBe(
        'required'
      );
    });

    it('should have EMAIL pattern', () => {
      expect(AngularFormValidationConfiguration.FORM_PATTERNS.EMAIL).toBe(
        'email'
      );
    });

    it('should have VALIDATORS_EMAIL pattern', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.VALIDATORS_EMAIL
      ).toBe('Validators.email');
    });

    it('should have ERRORS pattern', () => {
      expect(AngularFormValidationConfiguration.FORM_PATTERNS.ERRORS).toBe(
        'errors'
      );
    });

    it('should have INVALID pattern', () => {
      expect(AngularFormValidationConfiguration.FORM_PATTERNS.INVALID).toBe(
        'invalid'
      );
    });

    it('should have COMPONENT_TS pattern', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.COMPONENT_TS
      ).toBe('.component.ts');
    });

    it('should have COMPONENT_HTML pattern', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.COMPONENT_HTML
      ).toBe('.component.html');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have REQUIRED_VALIDATION message', () => {
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES
          .REQUIRED_VALIDATION
      ).toBeDefined();
    });

    it('should have EMAIL_VALIDATION message', () => {
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES.EMAIL_VALIDATION
      ).toBeDefined();
    });

    it('should have TEMPLATE_ERROR_DISPLAY message', () => {
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES
          .TEMPLATE_ERROR_DISPLAY
      ).toBeDefined();
    });

    it('should have TEMPLATE_ERRORS_MISSING message', () => {
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES
          .TEMPLATE_ERRORS_MISSING
      ).toBeDefined();
    });
  });

  describe('FILE_CONFIG', () => {
    it('should have ENCODING set to utf8', () => {
      expect(AngularFormValidationConfiguration.FILE_CONFIG.ENCODING).toBe(
        'utf8'
      );
    });

    it('should have FALLBACK_TO_EMPTY set to true', () => {
      expect(
        AngularFormValidationConfiguration.FILE_CONFIG.FALLBACK_TO_EMPTY
      ).toBe(true);
    });
  });

  describe('analyzeFormValidationPatterns', () => {
    it('should detect FormControl usage', () => {
      const content = `
        this.nameControl = new FormControl('');
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasFormControls).toBe(true);
    });

    it('should detect FormGroup usage', () => {
      const content = `
        this.form = new FormGroup({
          name: new FormControl('')
        });
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasFormControls).toBe(true);
      expect(result.hasFormGroup).toBe(true);
    });

    it('should detect Validators.required', () => {
      const content = `
        this.form = new FormGroup({
          name: new FormControl('', Validators.required)
        });
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasValidatorsRequired).toBe(true);
    });

    it('should detect required pattern', () => {
      const content = `
        <input required />
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasRequired).toBe(true);
    });

    it('should detect email field', () => {
      const content = `
        this.emailControl = new FormControl('', [Validators.required, Validators.email]);
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasEmail).toBe(true);
    });

    it('should detect Validators.email', () => {
      const content = `
        new FormControl('', Validators.email)
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasValidatorsEmail).toBe(true);
    });

    it('should detect errors property', () => {
      const content = `
        if (this.form.get('name').errors) {
          // handle errors
        }
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasErrors).toBe(true);
    });

    it('should detect invalid property', () => {
      const content = `
        if (this.form.invalid) {
          return;
        }
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          '/path/to/user.component.ts'
        );

      expect(result.hasInvalid).toBe(true);
    });

    it('should extract fileName from path', () => {
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          '/path/to/user-form.component.ts'
        );

      expect(result.fileName).toBe('user-form.component.ts');
    });

    it('should handle empty content', () => {
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          'empty.component.ts'
        );

      expect(result.hasFormControls).toBe(false);
      expect(result.hasFormGroup).toBe(false);
      expect(result.hasValidatorsRequired).toBe(false);
    });

    it('should analyze complete form component', () => {
      const content = `
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({...})
        export class UserFormComponent {
          form = new FormGroup({
            name: new FormControl('', Validators.required),
            email: new FormControl('', [Validators.required, Validators.email])
          });

          onSubmit() {
            if (this.form.invalid) {
              return;
            }
            if (this.form.get('email').errors) {
              console.log('Email has errors');
            }
          }
        }
      `;
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'user-form.component.ts'
        );

      expect(result.hasFormControls).toBe(true);
      expect(result.hasFormGroup).toBe(true);
      expect(result.hasValidatorsRequired).toBe(true);
      expect(result.hasEmail).toBe(true);
      expect(result.hasValidatorsEmail).toBe(true);
      expect(result.hasErrors).toBe(true);
      expect(result.hasInvalid).toBe(true);
    });
  });

  describe('getTemplatePath', () => {
    it('should convert component.ts to component.html', () => {
      const result = AngularFormValidationConfiguration.getTemplatePath(
        '/path/to/user.component.ts'
      );

      expect(result).toBe('/path/to/user.component.html');
    });

    it('should handle nested paths', () => {
      const result = AngularFormValidationConfiguration.getTemplatePath(
        '/src/app/features/user/user-form.component.ts'
      );

      expect(result).toBe('/src/app/features/user/user-form.component.html');
    });
  });

  describe('analyzeTemplateValidationPatterns', () => {
    it('should detect errors in template', () => {
      const content = `
        <div *ngIf="form.get('name').errors">
          Name is required
        </div>
      `;
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          content,
          '/path/to/user.component.html'
        );

      expect(result.hasErrors).toBe(true);
    });

    it('should detect invalid in template', () => {
      const content = `
        <button [disabled]="form.invalid">Submit</button>
      `;
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          content,
          '/path/to/user.component.html'
        );

      expect(result.hasInvalid).toBe(true);
    });

    it('should detect error display', () => {
      const content = `
        <div *ngIf="form.get('name').errors?.required">
          Name is required
        </div>
      `;
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          content,
          '/path/to/user.component.html'
        );

      expect(result.hasErrorDisplay).toBe(true);
    });

    it('should return templatePath', () => {
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '',
          '/path/to/user.component.html'
        );

      expect(result.templatePath).toBe('/path/to/user.component.html');
    });

    it('should handle empty template', () => {
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '',
          'empty.component.html'
        );

      expect(result.hasErrors).toBe(false);
      expect(result.hasInvalid).toBe(false);
      expect(result.hasErrorDisplay).toBe(false);
    });

    it('should analyze complete template with validation', () => {
      const content = `
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <input formControlName="name" />
          <div *ngIf="form.get('name').errors?.required">
            Name is required
          </div>

          <input formControlName="email" />
          <div *ngIf="form.get('email').invalid && form.get('email').touched">
            Please enter a valid email
          </div>

          <button [disabled]="form.invalid">Submit</button>
        </form>
      `;
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          content,
          'user-form.component.html'
        );

      expect(result.hasErrors).toBe(true);
      expect(result.hasInvalid).toBe(true);
      expect(result.hasErrorDisplay).toBe(true);
    });
  });

  describe('buildValidationSuggestions', () => {
    it('should suggest required validation when missing', () => {
      const patterns = {
        fileName: 'user.component.ts',
        hasFormControls: true,
        hasFormGroup: true,
        hasValidatorsRequired: false,
        hasRequired: false,
        hasEmail: false,
        hasValidatorsEmail: false,
        hasErrors: false,
        hasInvalid: false,
      };

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.condition).toBe(true);
    });

    it('should not suggest required when already present', () => {
      const patterns = {
        fileName: 'user.component.ts',
        hasFormControls: true,
        hasFormGroup: true,
        hasValidatorsRequired: true,
        hasRequired: false,
        hasEmail: false,
        hasValidatorsEmail: false,
        hasErrors: false,
        hasInvalid: false,
      };

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      expect(suggestions[0]?.condition).toBe(false);
    });

    it('should suggest email validation when email field exists without validator', () => {
      const patterns = {
        fileName: 'user.component.ts',
        hasFormControls: true,
        hasFormGroup: true,
        hasValidatorsRequired: true,
        hasRequired: false,
        hasEmail: true,
        hasValidatorsEmail: false,
        hasErrors: false,
        hasInvalid: false,
      };

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      const emailSuggestion = suggestions.find(
        s => s.condition && s.suggestionMessage.includes('email')
      );
      expect(emailSuggestion).toBeDefined();
    });
  });

  describe('buildTemplateValidationSuggestions', () => {
    it('should suggest error display when not present', () => {
      const templatePatterns = {
        templatePath: 'user.component.html',
        hasErrors: false,
        hasInvalid: false,
        hasErrorDisplay: false,
      };

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.condition).toBe(true);
    });

    it('should not suggest when error display present', () => {
      const templatePatterns = {
        templatePath: 'user.component.html',
        hasErrors: true,
        hasInvalid: true,
        hasErrorDisplay: true,
      };

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions[0]?.condition).toBe(false);
    });
  });
});
