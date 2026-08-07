/**
 * @fileoverview Tests for angular-form-validation-configuration.ts
 * @description Tests for Angular form validation configuration utility
 */

import { AngularFormValidationConfiguration } from '../../../src/utils/angular/angular-form-validation/angular-form-validation-configuration';

describe('utils/angular/angular-form-validation/angular-form-validation-configuration', () => {
  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(
        AngularFormValidationConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });

    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          AngularFormValidationConfiguration.ANGULAR_FILE_EXTENSIONS
        )
      ).toBe(true);
    });
  });

  describe('DIRECTORIES', () => {
    it('should have SRC directory defined', () => {
      expect(AngularFormValidationConfiguration.DIRECTORIES.SRC).toBe('src');
    });
  });

  describe('FORM_PATTERNS', () => {
    it('should have FORM_CONTROL pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.FORM_CONTROL
      ).toBeDefined();
    });

    it('should have FORM_GROUP pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.FORM_GROUP
      ).toBeDefined();
    });

    it('should have VALIDATORS_REQUIRED pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.VALIDATORS_REQUIRED
      ).toBeDefined();
    });

    it('should have EMAIL pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.EMAIL
      ).toBeDefined();
    });

    it('should have ERRORS pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.ERRORS
      ).toBeDefined();
    });

    it('should have INVALID pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.INVALID
      ).toBeDefined();
    });

    it('should have COMPONENT_TS pattern defined', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.COMPONENT_TS
      ).toBe('.component.ts');
    });

    it('should have COMPONENT_HTML pattern defined', () => {
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
    it('should return fileName from file path', () => {
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          '/path/to/test.component.ts'
        );

      expect(result.fileName).toBe('test.component.ts');
    });

    it('should detect FormControl pattern', () => {
      const content = `
        export class TestComponent {
          myControl = new FormControl('');
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasFormControls).toBe(true);
    });

    it('should detect FormGroup pattern', () => {
      const content = `
        export class TestComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasFormGroup).toBe(true);
      expect(result.hasFormControls).toBe(true);
    });

    it('should detect Validators.required pattern', () => {
      const content = `
        export class TestComponent {
          myControl = new FormControl('', Validators.required);
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasValidatorsRequired).toBe(true);
    });

    it('should detect required pattern', () => {
      const content = `
        export class TestComponent {
          myForm = this.fb.group({
            name: ['', [required]]
          });
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasRequired).toBe(true);
    });

    it('should detect email pattern', () => {
      const content = `
        export class TestComponent {
          emailControl = new FormControl('', [email]);
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasEmail).toBe(true);
    });

    it('should detect Validators.email pattern', () => {
      const content = `
        export class TestComponent {
          emailControl = new FormControl('', Validators.email);
        }
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasValidatorsEmail).toBe(true);
    });

    it('should detect errors pattern', () => {
      const content = `
        <div *ngIf="myControl.errors">Error message</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasErrors).toBe(true);
    });

    it('should detect invalid pattern', () => {
      const content = `
        <div *ngIf="myControl.invalid">Invalid message</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      expect(result.hasInvalid).toBe(true);
    });

    it('should return false for all patterns when content is empty', () => {
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          'test.component.ts'
        );

      expect(result.hasFormControls).toBe(false);
      expect(result.hasFormGroup).toBe(false);
      expect(result.hasValidatorsRequired).toBe(false);
      expect(result.hasRequired).toBe(false);
      expect(result.hasEmail).toBe(false);
      expect(result.hasValidatorsEmail).toBe(false);
      expect(result.hasErrors).toBe(false);
      expect(result.hasInvalid).toBe(false);
    });

    it('should handle file path without directory separators', () => {
      const result =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          'simple.component.ts'
        );

      expect(result.fileName).toBe('simple.component.ts');
    });
  });

  describe('getTemplatePath', () => {
    it('should convert component.ts to component.html', () => {
      const result = AngularFormValidationConfiguration.getTemplatePath(
        '/path/to/test.component.ts'
      );

      expect(result).toBe('/path/to/test.component.html');
    });

    it('should handle paths without directory separators', () => {
      const result =
        AngularFormValidationConfiguration.getTemplatePath('test.component.ts');

      expect(result).toBe('test.component.html');
    });
  });

  describe('analyzeTemplateValidationPatterns', () => {
    it('should return templatePath', () => {
      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '',
          '/path/to/test.component.html'
        );

      expect(result.templatePath).toBe('/path/to/test.component.html');
    });

    it('should detect errors pattern in template', () => {
      const templateContent = `
        <div *ngIf="form.errors">Errors exist</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          templateContent,
          'test.component.html'
        );

      expect(result.hasErrors).toBe(true);
      expect(result.hasErrorDisplay).toBe(true);
    });

    it('should detect invalid pattern in template', () => {
      const templateContent = `
        <div *ngIf="form.invalid">Form is invalid</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          templateContent,
          'test.component.html'
        );

      expect(result.hasInvalid).toBe(true);
      expect(result.hasErrorDisplay).toBe(true);
    });

    it('should set hasErrorDisplay true when both errors and invalid exist', () => {
      const templateContent = `
        <div *ngIf="form.errors">Errors</div>
        <div *ngIf="form.invalid">Invalid</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          templateContent,
          'test.component.html'
        );

      expect(result.hasErrors).toBe(true);
      expect(result.hasInvalid).toBe(true);
      expect(result.hasErrorDisplay).toBe(true);
    });

    it('should set hasErrorDisplay false when no error patterns exist', () => {
      const templateContent = `
        <div>Simple template</div>
      `;

      const result =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          templateContent,
          'test.component.html'
        );

      expect(result.hasErrors).toBe(false);
      expect(result.hasInvalid).toBe(false);
      expect(result.hasErrorDisplay).toBe(false);
    });
  });

  describe('buildValidationSuggestions', () => {
    it('should suggest required validation when neither Validators.required nor required exists', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          'const control = new FormControl();',
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.condition).toBe(true);
    });

    it('should not suggest required validation when Validators.required exists', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          "const control = new FormControl('', Validators.required);",
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      const requiredSuggestion = suggestions.find(s =>
        s.suggestionMessage.includes('required')
      );

      expect(requiredSuggestion?.condition).toBe(false);
    });

    it('should not suggest required validation when required exists', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          "const control = new FormControl('', required);",
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      const requiredSuggestion = suggestions.find(s =>
        s.suggestionMessage.includes('required')
      );

      expect(requiredSuggestion?.condition).toBe(false);
    });

    it('should suggest email validation when email exists but Validators.email does not', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          "const control = new FormControl('', email);",
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      const emailSuggestion = suggestions.find(s =>
        s.suggestionMessage.toLowerCase().includes('email')
      );

      expect(emailSuggestion?.condition).toBe(true);
    });

    it('should not suggest email validation when Validators.email exists', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          "const control = new FormControl('', Validators.email);",
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      const emailSuggestion = suggestions.find(s =>
        s.suggestionMessage.toLowerCase().includes('email')
      );

      expect(emailSuggestion?.condition).toBe(false);
    });

    it('should return array with exactly 2 suggestion configurations', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          '',
          'test.component.ts'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildValidationSuggestions(patterns);

      expect(suggestions).toHaveLength(2);
    });
  });

  describe('buildTemplateValidationSuggestions', () => {
    it('should suggest error display when no error patterns exist', () => {
      const templatePatterns =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '<div>Simple template without validation</div>',
          'test.component.html'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.condition).toBe(true);
    });

    it('should not suggest error display when errors pattern exists', () => {
      const templatePatterns =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '<div *ngIf="form.errors">Error</div>',
          'test.component.html'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions[0]?.condition).toBe(false);
    });

    it('should not suggest error display when invalid pattern exists', () => {
      const templatePatterns =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '<div *ngIf="form.invalid">Invalid</div>',
          'test.component.html'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions[0]?.condition).toBe(false);
    });

    it('should return array with exactly 1 suggestion configuration', () => {
      const templatePatterns =
        AngularFormValidationConfiguration.analyzeTemplateValidationPatterns(
          '',
          'test.component.html'
        );

      const suggestions =
        AngularFormValidationConfiguration.buildTemplateValidationSuggestions(
          templatePatterns
        );

      expect(suggestions).toHaveLength(1);
    });
  });
});
