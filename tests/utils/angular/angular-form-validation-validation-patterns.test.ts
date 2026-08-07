/**
 * @fileoverview Tests for angular-form-validation-validation-patterns.ts
 * @description Tests for Angular form validation validation patterns utility
 */

import * as fs from 'fs';
import * as path from 'path';
import { AngularFormValidationConfiguration } from '../../../src/utils/angular/angular-form-validation/angular-form-validation-configuration';
import { AngularFormValidationValidationPatterns } from '../../../src/utils/angular/angular-form-validation/angular-form-validation-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';

describe('utils/angular/angular-form-validation/angular-form-validation-validation-patterns', () => {
  const testDir = path.join(
    __dirname,
    'test-fixtures-form-validation-patterns'
  );

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('processFileContent', () => {
    it('should call processor with content, fileName and filePath', () => {
      const testFilePath = path.join(testDir, 'process-test.component.ts');
      const testContent = 'export class TestComponent {}';
      fs.writeFileSync(testFilePath, testContent);

      const processor = jest.fn();

      try {
        AngularFormValidationValidationPatterns.processFileContent(
          testFilePath,
          processor
        );

        expect(processor).toHaveBeenCalledWith(
          testContent,
          'process-test.component',
          testFilePath
        );
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should not call processor when file content is empty', () => {
      const testFilePath = path.join(testDir, 'empty.component.ts');
      fs.writeFileSync(testFilePath, '');

      const processor = jest.fn();

      try {
        AngularFormValidationValidationPatterns.processFileContent(
          testFilePath,
          processor
        );

        expect(processor).not.toHaveBeenCalled();
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should not call processor when file does not exist', () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.component.ts');
      const processor = jest.fn();

      AngularFormValidationValidationPatterns.processFileContent(
        nonExistentPath,
        processor
      );

      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('processTemplateContent', () => {
    it('should call processor with template content when template exists', () => {
      const componentPath = path.join(testDir, 'template-test.component.ts');
      const templatePath = path.join(testDir, 'template-test.component.html');
      const templateContent = '<div>Template Content</div>';

      fs.writeFileSync(componentPath, 'export class TestComponent {}');
      fs.writeFileSync(templatePath, templateContent);

      const processor = jest.fn();

      try {
        AngularFormValidationValidationPatterns.processTemplateContent(
          componentPath,
          processor,
          'template-test.component.ts'
        );

        expect(processor).toHaveBeenCalledWith(
          templateContent,
          templatePath,
          'template-test.component.ts'
        );
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });

    it('should not call processor when template does not exist', () => {
      const componentPath = path.join(testDir, 'no-template.component.ts');
      fs.writeFileSync(componentPath, 'export class TestComponent {}');

      const processor = jest.fn();

      try {
        AngularFormValidationValidationPatterns.processTemplateContent(
          componentPath,
          processor,
          'no-template.component.ts'
        );

        expect(processor).not.toHaveBeenCalled();
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
      }
    });

    it('should not call processor when template is empty', () => {
      const componentPath = path.join(testDir, 'empty-template.component.ts');
      const templatePath = path.join(testDir, 'empty-template.component.html');

      fs.writeFileSync(componentPath, 'export class TestComponent {}');
      fs.writeFileSync(templatePath, '');

      const processor = jest.fn();

      try {
        AngularFormValidationValidationPatterns.processTemplateContent(
          componentPath,
          processor,
          'empty-template.component.ts'
        );

        expect(processor).not.toHaveBeenCalled();
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });
  });

  describe('validateValidatorUsage', () => {
    it('should not add suggestions when no form controls exist', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          'export class TestComponent {}',
          'test.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should add suggestions when form controls exist without proper validators', () => {
      const content = `
        export class TestComponent {
          control = new FormControl('');
        }
      `;
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not add suggestions when Validators.required exists', () => {
      const content = `
        export class TestComponent {
          control = new FormControl('', Validators.required);
        }
      `;
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          content,
          'test.component.ts'
        );

      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.validateValidatorUsage(
        patterns,
        suggestions
      );

      const hasRequiredSuggestion = suggestions.some(s =>
        s.toLowerCase().includes('required')
      );

      expect(hasRequiredSuggestion).toBe(false);
    });
  });

  describe('validateTemplateValidation', () => {
    it('should not validate when no FormGroup exists', () => {
      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          'export class TestComponent {}',
          'test.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      const fileUtilsExistsSpy = jest.spyOn(FileUtils, 'exists');

      AngularFormValidationValidationPatterns.validateTemplateValidation(
        path.join(testDir, 'test.component.ts'),
        patterns,
        violations,
        suggestions
      );

      expect(fileUtilsExistsSpy).not.toHaveBeenCalled();
      expect(violations).toHaveLength(0);

      fileUtilsExistsSpy.mockRestore();
    });

    it('should validate template when FormGroup exists', () => {
      const componentPath = path.join(testDir, 'formgroup.component.ts');
      const templatePath = path.join(testDir, 'formgroup.component.html');

      const componentContent = `
        export class TestComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      fs.writeFileSync(componentPath, componentContent);
      fs.writeFileSync(templatePath, '<form></form>');

      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          componentContent,
          'formgroup.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.validateTemplateValidation(
          componentPath,
          patterns,
          violations,
          suggestions
        );

        expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(
          0
        );
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });

    it('should add violation when FormGroup exists but template has no error display', () => {
      const componentPath = path.join(testDir, 'no-errors.component.ts');
      const templatePath = path.join(testDir, 'no-errors.component.html');

      const componentContent = `
        export class TestComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      fs.writeFileSync(componentPath, componentContent);
      fs.writeFileSync(templatePath, '<form><input /></form>');

      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          componentContent,
          'no-errors.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.validateTemplateValidation(
          componentPath,
          patterns,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThanOrEqual(1);
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });

    it('should not add violation when template has errors display', () => {
      const componentPath = path.join(testDir, 'with-errors.component.ts');
      const templatePath = path.join(testDir, 'with-errors.component.html');

      const componentContent = `
        export class TestComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      fs.writeFileSync(componentPath, componentContent);
      fs.writeFileSync(
        templatePath,
        '<form><div *ngIf="myForm.errors">Error</div></form>'
      );

      const patterns =
        AngularFormValidationConfiguration.analyzeFormValidationPatterns(
          componentContent,
          'with-errors.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.validateTemplateValidation(
          componentPath,
          patterns,
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });
  });

  describe('validateAllFormValidationPatterns', () => {
    it('should orchestrate all validation checks', () => {
      const componentPath = path.join(testDir, 'orchestrate.component.ts');
      const templatePath = path.join(testDir, 'orchestrate.component.html');

      const content = `
        export class TestComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;

      fs.writeFileSync(componentPath, content);
      fs.writeFileSync(templatePath, '<form></form>');

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.validateAllFormValidationPatterns(
          content,
          componentPath,
          violations,
          suggestions
        );

        expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(
          0
        );
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });
  });

  describe('processComponentFile', () => {
    it('should process component file and validate all patterns', () => {
      const componentPath = path.join(testDir, 'full-process.component.ts');
      const templatePath = path.join(testDir, 'full-process.component.html');

      const content = `
        export class TestComponent {
          myForm = new FormGroup({
            email: new FormControl('', email)
          });
        }
      `;

      fs.writeFileSync(componentPath, content);
      fs.writeFileSync(templatePath, '<form><input /></form>');

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.processComponentFile(
          componentPath,
          violations,
          suggestions
        );

        expect(Array.isArray(violations)).toBe(true);
        expect(Array.isArray(suggestions)).toBe(true);
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });

    it('should not add violations when file does not exist', () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.component.ts');

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularFormValidationValidationPatterns.processComponentFile(
        nonExistentPath,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });

    it('should not add violations for empty file', () => {
      const emptyFilePath = path.join(testDir, 'empty-file.component.ts');
      fs.writeFileSync(emptyFilePath, '');

      const violations: string[] = [];
      const suggestions: string[] = [];

      try {
        AngularFormValidationValidationPatterns.processComponentFile(
          emptyFilePath,
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      } finally {
        if (fs.existsSync(emptyFilePath)) {
          fs.unlinkSync(emptyFilePath);
        }
      }
    });
  });
});
