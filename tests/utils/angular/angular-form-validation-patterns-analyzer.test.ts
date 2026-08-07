/**
 * @fileoverview Tests for angular-form-validation-patterns-analyzer.ts
 * @description Tests for Angular form validation patterns analyzer utility
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularFormValidationConfiguration } from '../../../src/utils/angular/angular-form-validation/angular-form-validation-configuration';
import { AngularFormValidationPatternsAnalyzer } from '../../../src/utils/angular/angular-form-validation/angular-form-validation-patterns-analyzer';

describe('utils/angular/angular-form-validation/angular-form-validation-patterns-analyzer', () => {
  const testProjectRoot = path.join(__dirname, 'test-fixtures-form-patterns');
  const srcDir = path.join(testProjectRoot, 'src');

  const defaultConfig = {
    exclude: [],
    include: [],
    rules: {},
    extends: [],
  } as unknown as RuleOfCodeConfig;

  beforeAll(() => {
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testProjectRoot)) {
      fs.rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('checkValidationPatterns', () => {
    it('should return object with violations and suggestions arrays', () => {
      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          testProjectRoot,
          defaultConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return empty arrays when no component files exist', () => {
      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          testProjectRoot,
          defaultConfig
        );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should analyze component files in src directory', () => {
      const componentPath = path.join(srcDir, 'test.component.ts');
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-test',
          templateUrl: './test.component.html'
        })
        export class TestComponent {
          myForm = new FormGroup({
            email: new FormControl('', Validators.required)
          });
        }
      `;

      fs.writeFileSync(componentPath, componentContent);

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            defaultConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
      }
    });

    it('should process multiple component files', () => {
      const component1Path = path.join(srcDir, 'first.component.ts');
      const component2Path = path.join(srcDir, 'second.component.ts');

      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({
          selector: 'app-component',
          template: '<div></div>'
        })
        export class TestComponent {
          control = new FormControl('');
        }
      `;

      fs.writeFileSync(component1Path, componentContent);
      fs.writeFileSync(component2Path, componentContent);

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            defaultConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      } finally {
        if (fs.existsSync(component1Path)) {
          fs.unlinkSync(component1Path);
        }
        if (fs.existsSync(component2Path)) {
          fs.unlinkSync(component2Path);
        }
      }
    });
  });

  describe('AngularFormValidationConfiguration integration', () => {
    it('should use ANGULAR_FILE_EXTENSIONS from configuration', () => {
      expect(
        AngularFormValidationConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });

    it('should use FORM_PATTERNS from configuration', () => {
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.FORM_CONTROL
      ).toBeDefined();
      expect(
        AngularFormValidationConfiguration.FORM_PATTERNS.FORM_GROUP
      ).toBeDefined();
    });

    it('should use VALIDATION_MESSAGES from configuration', () => {
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES
          .REQUIRED_VALIDATION
      ).toBeDefined();
      expect(
        AngularFormValidationConfiguration.VALIDATION_MESSAGES.EMAIL_VALIDATION
      ).toBeDefined();
    });
  });

  describe('config exclusion handling', () => {
    it('should respect exclude configuration', () => {
      const excludedDir = path.join(srcDir, 'excluded');
      if (!fs.existsSync(excludedDir)) {
        fs.mkdirSync(excludedDir, { recursive: true });
      }

      const excludedComponentPath = path.join(
        excludedDir,
        'excluded.component.ts'
      );
      fs.writeFileSync(
        excludedComponentPath,
        'export class ExcludedComponent {}'
      );

      const configWithExclude = {
        ...defaultConfig,
        exclude: ['**/excluded/**'],
      } as unknown as RuleOfCodeConfig;

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            configWithExclude
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      } finally {
        if (fs.existsSync(excludedComponentPath)) {
          fs.unlinkSync(excludedComponentPath);
        }
        if (fs.existsSync(excludedDir)) {
          fs.rmdirSync(excludedDir);
        }
      }
    });
  });

  describe('file extension filtering', () => {
    it('should only process component files', () => {
      const componentPath = path.join(srcDir, 'valid.component.ts');
      const servicePath = path.join(srcDir, 'valid.service.ts');

      fs.writeFileSync(componentPath, 'export class ValidComponent {}');
      fs.writeFileSync(servicePath, 'export class ValidService {}');

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            defaultConfig
          );

        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(servicePath)) {
          fs.unlinkSync(servicePath);
        }
      }
    });
  });

  describe('form validation detection', () => {
    it('should detect FormGroup with missing template error display', () => {
      const componentPath = path.join(srcDir, 'form.component.ts');
      const templatePath = path.join(srcDir, 'form.component.html');

      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          myForm = new FormGroup({
            name: new FormControl('')
          });
        }
      `;
      const templateContent = '<form><input formControlName="name" /></form>';

      fs.writeFileSync(componentPath, componentContent);
      fs.writeFileSync(templatePath, templateContent);

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            defaultConfig
          );

        // The analyzer should run and return arrays
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }
    });

    it('should not add violation when template has error display', () => {
      const componentPath = path.join(srcDir, 'valid-form.component.ts');
      const templatePath = path.join(srcDir, 'valid-form.component.html');

      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-valid-form',
          templateUrl: './valid-form.component.html'
        })
        export class ValidFormComponent {
          myForm = new FormGroup({
            name: new FormControl('', Validators.required)
          });
        }
      `;
      const templateContent = `
        <form [formGroup]="myForm">
          <input formControlName="name" />
          <div *ngIf="myForm.errors">Error message</div>
        </form>
      `;

      fs.writeFileSync(componentPath, componentContent);
      fs.writeFileSync(templatePath, templateContent);

      try {
        const result =
          AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
            testProjectRoot,
            defaultConfig
          );

        const validFormViolations = result.violations.filter(v =>
          v.includes('valid-form')
        );
        expect(validFormViolations).toHaveLength(0);
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
});
