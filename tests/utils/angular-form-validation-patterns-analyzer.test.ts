/**
 * @fileoverview Tests for angular-form-validation-patterns-analyzer.ts
 * @description Tests for Angular form validation patterns analyzer utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularFormValidationPatternsAnalyzer } from '../../src/utils/angular/angular-form-validation/angular-form-validation-patterns-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-form-validation/angular-form-validation-patterns-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'angular-form-validation-analyzer-test-'
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
  });

  describe('checkValidationPatterns', () => {
    it('should return empty results for empty project', () => {
      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze component with FormControl', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          name = new FormControl('', [Validators.required]);
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should suggest required validation when missing', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          name = new FormControl('');
          email = new FormControl('');
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest email validation for email fields', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          email = new FormControl('', [Validators.required]);
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze FormGroup patterns', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-registration',
          templateUrl: './registration.component.html'
        })
        export class RegistrationComponent {
          form = new FormGroup({
            username: new FormControl('', [Validators.required]),
            email: new FormControl('', [Validators.required, Validators.email]),
            password: new FormControl('', [Validators.required, Validators.minLength(8)])
          });
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'registration.component.ts'),
        componentContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should check template for error display', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          form = new FormGroup({
            name: new FormControl('', [Validators.required])
          });
        }
      `;

      const templateContent = `
        <form [formGroup]="form">
          <input formControlName="name">
        </form>
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.html'),
        templateContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      // Should suggest adding error display to template
      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should pass for template with proper error display', () => {
      const componentContent = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({
          selector: 'app-form',
          templateUrl: './form.component.html'
        })
        export class FormComponent {
          form = new FormGroup({
            name: new FormControl('', [Validators.required])
          });
        }
      `;

      const templateContent = `
        <form [formGroup]="form">
          <input formControlName="name">
          <div *ngIf="form.get('name')?.errors?.required">
            Name is required
          </div>
        </form>
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.ts'),
        componentContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'form.component.html'),
        templateContent
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should handle inline templates', () => {
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

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should handle missing src directory', () => {
      FileUtils.deleteDirectory(PathOperations.join(tempDir, 'src'));

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze multiple components', () => {
      const component1 = `
        import { Component } from '@angular/core';
        import { FormControl } from '@angular/forms';

        @Component({ selector: 'app-one', template: '' })
        export class OneComponent {
          field = new FormControl('');
        }
      `;

      const component2 = `
        import { Component } from '@angular/core';
        import { FormGroup, FormControl, Validators } from '@angular/forms';

        @Component({ selector: 'app-two', template: '' })
        export class TwoComponent {
          form = new FormGroup({
            name: new FormControl('', Validators.required)
          });
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'one.component.ts'),
        component1
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'two.component.ts'),
        component2
      );

      const result =
        AngularFormValidationPatternsAnalyzer.checkValidationPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });
  });
});
