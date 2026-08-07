/**
 * @fileoverview Tests for ngrx-module-validator.ts
 * @description Tests for NgRx Module Validator utility
 */

import { NgRxModuleValidationPatterns } from '../../../src/utils/angular/ngrx-module/ngrx-module-validation-patterns';
import { NgRxModuleValidator } from '../../../src/utils/angular/ngrx-module/ngrx-module-validator';
import { ANGULAR_CONSTANTS } from '../../../src/utils/constants';

describe('utils/angular/ngrx-module/ngrx-module-validator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxModuleValidator', () => {
    describe('MODULE_VALIDATION_PATTERNS', () => {
      it('should contain ngModule pattern', () => {
        expect(NgRxModuleValidator.MODULE_VALIDATION_PATTERNS.ngModule).toBe(
          ANGULAR_CONSTANTS.NG_MODULE_DECORATOR
        );
      });

      it('should contain declarations pattern', () => {
        expect(
          NgRxModuleValidator.MODULE_VALIDATION_PATTERNS.declarations
        ).toBe(ANGULAR_CONSTANTS.DECLARATIONS_PROPERTY);
      });

      it('should contain imports pattern', () => {
        expect(NgRxModuleValidator.MODULE_VALIDATION_PATTERNS.imports).toBe(
          ANGULAR_CONSTANTS.IMPORTS_PROPERTY
        );
      });

      it('should contain providers pattern', () => {
        expect(NgRxModuleValidator.MODULE_VALIDATION_PATTERNS.providers).toBe(
          ANGULAR_CONSTANTS.PROVIDERS_PROPERTY
        );
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have MODULE_MISSING_DECORATOR message template', () => {
        expect(
          NgRxModuleValidator.VALIDATION_MESSAGES.MODULE_MISSING_DECORATOR
        ).toContain('@NgModule');
      });

      it('should have MODULE_INCOMPLETE_STRUCTURE message template', () => {
        expect(
          NgRxModuleValidator.VALIDATION_MESSAGES.MODULE_INCOMPLETE_STRUCTURE
        ).toContain('incomplete');
      });

      it('should contain placeholder in messages', () => {
        expect(
          NgRxModuleValidator.VALIDATION_MESSAGES.MODULE_MISSING_DECORATOR
        ).toContain('{0}');
        expect(
          NgRxModuleValidator.VALIDATION_MESSAGES.MODULE_INCOMPLETE_STRUCTURE
        ).toContain('{0}');
      });
    });

    describe('checkModuleStandards', () => {
      it('should add violation when NgModule decorator is missing', () => {
        const content = `
          export class AppModule {}
        `;
        const violations: string[] = [];

        NgRxModuleValidator.checkModuleStandards(
          content,
          'app.module.ts',
          violations
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('@NgModule');
        expect(violations[0]).toContain('app.module.ts');
      });

      it('should not add violation when NgModule decorator is present with imports', () => {
        const content = `
          @NgModule({
            imports: [CommonModule],
            declarations: [AppComponent],
            providers: [MyService]
          })
          export class AppModule {}
        `;
        const violations: string[] = [];

        NgRxModuleValidator.checkModuleStandards(
          content,
          'app.module.ts',
          violations
        );

        expect(violations).toHaveLength(0);
      });

      it('should add violation when module structure is incomplete', () => {
        const content = `
          @NgModule({})
          export class AppModule {}
        `;
        const violations: string[] = [];

        NgRxModuleValidator.checkModuleStandards(
          content,
          'app.module.ts',
          violations
        );

        expect(violations.length).toBeGreaterThan(0);
      });

      it('should call validateModuleStructure from NgRxModuleValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          NgRxModuleValidationPatterns,
          'validateModuleStructure'
        );
        validateSpy.mockReturnValue({
          hasNgModuleDecorator: true,
          hasImportsProperty: true,
          hasProvidersProperty: false,
        });

        const violations: string[] = [];
        NgRxModuleValidator.checkModuleStandards(
          'test content',
          'test.module.ts',
          violations
        );

        expect(validateSpy).toHaveBeenCalledWith('test content');
      });

      it('should handle module with only imports property', () => {
        const validateSpy = jest.spyOn(
          NgRxModuleValidationPatterns,
          'validateModuleStructure'
        );
        validateSpy.mockReturnValue({
          hasNgModuleDecorator: true,
          hasImportsProperty: true,
          hasProvidersProperty: false,
        });

        const violations: string[] = [];
        NgRxModuleValidator.checkModuleStandards(
          'test content',
          'test.module.ts',
          violations
        );

        expect(violations).toHaveLength(0);
      });

      it('should handle module with only providers property', () => {
        const validateSpy = jest.spyOn(
          NgRxModuleValidationPatterns,
          'validateModuleStructure'
        );
        validateSpy.mockReturnValue({
          hasNgModuleDecorator: true,
          hasImportsProperty: false,
          hasProvidersProperty: true,
        });

        const violations: string[] = [];
        NgRxModuleValidator.checkModuleStandards(
          'test content',
          'test.module.ts',
          violations
        );

        expect(violations).toHaveLength(0);
      });

      it('should return early when NgModule decorator is missing', () => {
        const validateSpy = jest.spyOn(
          NgRxModuleValidationPatterns,
          'validateModuleStructure'
        );
        validateSpy.mockReturnValue({
          hasNgModuleDecorator: false,
          hasImportsProperty: true,
          hasProvidersProperty: true,
        });

        const violations: string[] = [];
        NgRxModuleValidator.checkModuleStandards(
          'test content',
          'test.module.ts',
          violations
        );

        expect(violations).toHaveLength(1);
        expect(violations[0]).toContain('Module missing @NgModule decorator');
      });

      it('should include file path in violation messages', () => {
        const content = `
          export class TestModule {}
        `;
        const violations: string[] = [];

        NgRxModuleValidator.checkModuleStandards(
          content,
          'custom/path/my.module.ts',
          violations
        );

        expect(violations[0]).toContain('custom/path/my.module.ts');
      });

      it('should not add duplicate violations', () => {
        const validateSpy = jest.spyOn(
          NgRxModuleValidationPatterns,
          'validateModuleStructure'
        );
        validateSpy.mockReturnValue({
          hasNgModuleDecorator: false,
          hasImportsProperty: false,
          hasProvidersProperty: false,
        });

        const violations: string[] = [];
        NgRxModuleValidator.checkModuleStandards(
          'test content',
          'test.module.ts',
          violations
        );

        // Should only have one violation due to early return
        expect(violations).toHaveLength(1);
      });
    });
  });
});
