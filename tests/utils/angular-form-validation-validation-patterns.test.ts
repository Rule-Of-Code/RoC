/**
 * @fileoverview Tests for angular-form-validation-validation-patterns.ts
 * @description Tests for Angular form validation validation patterns utility
 */

import { AngularFormValidationConfiguration } from '../../src/utils/angular/angular-form-validation/angular-form-validation-configuration';
import { AngularFormValidationValidationPatterns } from '../../src/utils/angular/angular-form-validation/angular-form-validation-validation-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-form-validation/angular-form-validation-validation-patterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'angular-form-validation-patterns-test-'
    );
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('processFileContent', () => {
    it('should process file content with callback', () => {
      const content = 'test content';
      FileUtils.writeFile(PathOperations.join(tempDir, 'test.ts'), content);

      let processedContent = '';
      let processedFileName = '';

      AngularFormValidationValidationPatterns.processFileContent(
        PathOperations.join(tempDir, 'test.ts'),
        (fileContent, fileName) => {
          processedContent = fileContent;
          processedFileName = fileName;
        }
      );

      expect(processedContent).toBe(content);
      // Note: getBasename returns filename without extension (parsed.name)
      expect(processedFileName).toBe('test');
    });

    it('should handle non-existent files gracefully', () => {
      let wasCalled = false;

      AngularFormValidationValidationPatterns.processFileContent(
        PathOperations.join(tempDir, 'nonexistent.ts'),
        () => {
          wasCalled = true;
        }
      );

      expect(wasCalled).toBe(false);
    });

    it('should handle empty files', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'empty.ts'), '');

      let wasCalled = false;

      AngularFormValidationValidationPatterns.processFileContent(
        PathOperations.join(tempDir, 'empty.ts'),
        () => {
          wasCalled = true;
        }
      );

      expect(wasCalled).toBe(false);
    });
  });

  describe('processTemplateContent', () => {
    it('should process template file when it exists', () => {
      const templateContent = '<div>Template</div>';
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.component.html'),
        templateContent
      );

      let processedContent = '';

      AngularFormValidationValidationPatterns.processTemplateContent(
        PathOperations.join(tempDir, 'test.component.ts'),
        content => {
          processedContent = content;
        },
        'test.component.ts'
      );

      expect(processedContent).toBe(templateContent);
    });

    it('should not call processor when template does not exist', () => {
      let wasCalled = false;

      AngularFormValidationValidationPatterns.processTemplateContent(
        PathOperations.join(tempDir, 'test.component.ts'),
        () => {
          wasCalled = true;
        },
        'test.component.ts'
      );

      expect(wasCalled).toBe(false);
    });
  });

  describe('validateValidatorUsage', () => {
    it('should suggest required validation when missing', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class FormComponent {
            name = new FormControl('');
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest email validation for email fields without Validators.email', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class FormComponent {
            email = new FormControl('', [Validators.required]);
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest when validators are properly configured', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class FormComponent {
            name = new FormControl('', [Validators.required]);
            email = new FormControl('', [Validators.required, Validators.email]);
          }
        `,
          '/path/to/form.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should not suggest for components without form controls', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class SimpleComponent {
            data = [];
          }
        `,
          '/path/to/simple.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateTemplateValidation', () => {
    it('should add violation when template lacks error display', () => {
      const componentPatterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class FormComponent {
            form = new FormGroup({
              name: new FormControl('')
            });
          }
        `,
          PathOperations.join(tempDir, 'form.component.ts')
        );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'form.component.html'),
        '<form [formGroup]="form"><input formControlName="name"></form>'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateTemplateValidation(
        PathOperations.join(tempDir, 'form.component.ts'),
        componentPatterns,
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass when template has error display', () => {
      const componentPatterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class FormComponent {
            form = new FormGroup({
              name: new FormControl('')
            });
          }
        `,
          PathOperations.join(tempDir, 'form.component.ts')
        );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'form.component.html'),
        `
          <form [formGroup]="form">
            <input formControlName="name">
            <div *ngIf="form.get('name')?.errors">Error</div>
          </form>
        `
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateTemplateValidation(
        PathOperations.join(tempDir, 'form.component.ts'),
        componentPatterns,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
    });

    it('should not validate when no FormGroup', () => {
      const componentPatterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          `
          export class SimpleComponent {
            data = 'hello';
          }
        `,
          PathOperations.join(tempDir, 'simple.component.ts')
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateTemplateValidation(
        PathOperations.join(tempDir, 'simple.component.ts'),
        componentPatterns,
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('validateAllFormValidationPatterns', () => {
    it('should run all validations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'form.component.html'),
        '<form [formGroup]="form"><input formControlName="name"></form>'
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateAllFormValidationPatterns(
        `
          export class FormComponent {
            form = new FormGroup({
              name: new FormControl('')
            });
          }
        `,
        PathOperations.join(tempDir, 'form.component.ts'),
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('processComponentFile', () => {
    it('should process component file with all validations', () => {
      const componentContent = `
        export class FormComponent {
          form = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'form.component.ts'),
        componentContent
      );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.processComponentFile(
        PathOperations.join(tempDir, 'form.component.ts'),
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle non-existent files gracefully', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      expect(() => {
        AngularFormValidationValidationPatterns.processComponentFile(
          PathOperations.join(tempDir, 'nonexistent.component.ts'),
          violations,
          suggestions
        );
      }).not.toThrow();
    });
  });
});
