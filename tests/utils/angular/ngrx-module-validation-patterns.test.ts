/**
 * @fileoverview Tests for ngrx-module-validation-patterns.ts
 * @description Tests for NgRx Module Validation Patterns utility
 */

import { NgRxModuleValidationPatterns } from '../../../src/utils/angular/ngrx-module/ngrx-module-validation-patterns';
import {
  ANGULAR_CONSTANTS,
  NGRX_KEYWORDS,
  NGRX_MESSAGES,
} from '../../../src/utils/constants';

describe('utils/angular/ngrx-module/ngrx-module-validation-patterns', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NgRxModuleValidationPatterns', () => {
    describe('MODULE_STRUCTURE_PATTERNS', () => {
      it('should contain ngModuleDecorator pattern', () => {
        const patterns = NgRxModuleValidationPatterns.MODULE_STRUCTURE_PATTERNS;
        expect(patterns.ngModuleDecorator).toBe(
          ANGULAR_CONSTANTS.NG_MODULE_DECORATOR
        );
      });

      it('should contain importsProperty pattern', () => {
        const patterns = NgRxModuleValidationPatterns.MODULE_STRUCTURE_PATTERNS;
        expect(patterns.importsProperty).toBe(
          ANGULAR_CONSTANTS.IMPORTS_PROPERTY
        );
      });

      it('should contain providersProperty pattern', () => {
        const patterns = NgRxModuleValidationPatterns.MODULE_STRUCTURE_PATTERNS;
        expect(patterns.providersProperty).toBe(
          ANGULAR_CONSTANTS.PROVIDERS_PROPERTY
        );
      });
    });

    describe('NGRX_MODULE_PATTERNS', () => {
      it('should contain storeModuleForRoot pattern', () => {
        const patterns = NgRxModuleValidationPatterns.NGRX_MODULE_PATTERNS;
        expect(patterns.storeModuleForRoot).toBe(
          NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT
        );
      });

      it('should contain effectsModuleForRoot pattern', () => {
        const patterns = NgRxModuleValidationPatterns.NGRX_MODULE_PATTERNS;
        expect(patterns.effectsModuleForRoot).toBe(
          NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT
        );
      });

      it('should contain storeDevtoolsModule pattern', () => {
        const patterns = NgRxModuleValidationPatterns.NGRX_MODULE_PATTERNS;
        expect(patterns.storeDevtoolsModule).toBe(
          NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE
        );
      });
    });

    describe('PATTERN_TYPES', () => {
      it('should contain storeModule type', () => {
        expect(NgRxModuleValidationPatterns.PATTERN_TYPES.storeModule).toBe(
          'storeModule'
        );
      });

      it('should contain effectsModule type', () => {
        expect(NgRxModuleValidationPatterns.PATTERN_TYPES.effectsModule).toBe(
          'effectsModule'
        );
      });

      it('should contain devtoolsModule type', () => {
        expect(NgRxModuleValidationPatterns.PATTERN_TYPES.devtoolsModule).toBe(
          'devtoolsModule'
        );
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have APP_MODULE_NOT_FOUND message', () => {
        expect(
          NgRxModuleValidationPatterns.VALIDATION_MESSAGES.APP_MODULE_NOT_FOUND
        ).toBe(NGRX_MESSAGES.APP_MODULE_NOT_FOUND);
      });

      it('should have MODULE_MISSING_DECORATOR message', () => {
        expect(
          NgRxModuleValidationPatterns.VALIDATION_MESSAGES
            .MODULE_MISSING_DECORATOR
        ).toContain('@NgModule');
      });

      it('should have MISSING_STORE_SETUP message', () => {
        expect(
          NgRxModuleValidationPatterns.VALIDATION_MESSAGES.MISSING_STORE_SETUP
        ).toContain('StoreModule.forRoot');
      });

      it('should have MISSING_EFFECTS_SETUP message', () => {
        expect(
          NgRxModuleValidationPatterns.VALIDATION_MESSAGES.MISSING_EFFECTS_SETUP
        ).toContain('EffectsModule.forRoot');
      });

      it('should have MISSING_DEVTOOLS_SETUP message', () => {
        expect(
          NgRxModuleValidationPatterns.VALIDATION_MESSAGES
            .MISSING_DEVTOOLS_SETUP
        ).toContain('StoreDevtoolsModule');
      });
    });

    describe('REQUIRED_IMPORTS', () => {
      it('should have storeModule import', () => {
        expect(NgRxModuleValidationPatterns.REQUIRED_IMPORTS.storeModule).toBe(
          '@ngrx/store'
        );
      });

      it('should have effectsModule import', () => {
        expect(
          NgRxModuleValidationPatterns.REQUIRED_IMPORTS.effectsModule
        ).toBe('@ngrx/effects');
      });

      it('should have devtoolsModule import', () => {
        expect(
          NgRxModuleValidationPatterns.REQUIRED_IMPORTS.devtoolsModule
        ).toBe('@ngrx/store-devtools');
      });
    });

    describe('SETUP_RECOMMENDATIONS', () => {
      it('should have STORE_MODULE recommendation', () => {
        expect(
          NgRxModuleValidationPatterns.SETUP_RECOMMENDATIONS.STORE_MODULE
        ).toContain('StoreModule.forRoot');
      });

      it('should have EFFECTS_MODULE recommendation', () => {
        expect(
          NgRxModuleValidationPatterns.SETUP_RECOMMENDATIONS.EFFECTS_MODULE
        ).toContain('EffectsModule.forRoot');
      });

      it('should have DEVTOOLS_MODULE recommendation', () => {
        expect(
          NgRxModuleValidationPatterns.SETUP_RECOMMENDATIONS.DEVTOOLS_MODULE
        ).toContain('StoreDevtoolsModule');
      });
    });

    describe('containsPattern', () => {
      it('should detect storeModule pattern in content', () => {
        const content = `
          import { StoreModule } from '@ngrx/store';

          @NgModule({
            imports: [StoreModule.forRoot(reducers)]
          })
        `;

        const result = NgRxModuleValidationPatterns.containsPattern(
          content,
          'storeModule'
        );
        expect(result).toBe(true);
      });

      it('should not detect storeModule when not present', () => {
        const content = `
          import { NgModule } from '@angular/core';

          @NgModule({
            imports: []
          })
        `;

        const result = NgRxModuleValidationPatterns.containsPattern(
          content,
          'storeModule'
        );
        expect(result).toBe(false);
      });

      it('should detect effectsModule pattern in content', () => {
        const content = `
          import { EffectsModule } from '@ngrx/effects';

          @NgModule({
            imports: [EffectsModule.forRoot([])]
          })
        `;

        const result = NgRxModuleValidationPatterns.containsPattern(
          content,
          'effectsModule'
        );
        expect(result).toBe(true);
      });

      it('should detect devtoolsModule pattern in content', () => {
        const content = `
          import { StoreDevtoolsModule } from '@ngrx/store-devtools';

          @NgModule({
            imports: [StoreDevtoolsModule.instrument()]
          })
        `;

        const result = NgRxModuleValidationPatterns.containsPattern(
          content,
          'devtoolsModule'
        );
        expect(result).toBe(true);
      });

      it('should return false for unknown pattern type', () => {
        const content = 'some content';
        const result = NgRxModuleValidationPatterns.containsPattern(
          content,
          'unknownPattern' as keyof typeof NgRxModuleValidationPatterns.PATTERN_TYPES
        );
        expect(result).toBe(false);
      });
    });

    describe('validateModuleStructure', () => {
      it('should detect NgModule decorator', () => {
        const content = `
          @NgModule({
            imports: [],
            declarations: []
          })
          export class AppModule {}
        `;

        const result =
          NgRxModuleValidationPatterns.validateModuleStructure(content);
        expect(result.hasNgModuleDecorator).toBe(true);
      });

      it('should not detect NgModule decorator when missing', () => {
        const content = `
          export class AppModule {}
        `;

        const result =
          NgRxModuleValidationPatterns.validateModuleStructure(content);
        expect(result.hasNgModuleDecorator).toBe(false);
      });

      it('should detect imports property', () => {
        const content = `
          @NgModule({
            imports: [CommonModule],
            declarations: []
          })
        `;

        const result =
          NgRxModuleValidationPatterns.validateModuleStructure(content);
        expect(result.hasImportsProperty).toBe(true);
      });

      it('should detect providers property', () => {
        const content = `
          @NgModule({
            imports: [],
            providers: [MyService]
          })
        `;

        const result =
          NgRxModuleValidationPatterns.validateModuleStructure(content);
        expect(result.hasProvidersProperty).toBe(true);
      });

      it('should return all false for empty content', () => {
        const result = NgRxModuleValidationPatterns.validateModuleStructure('');

        expect(result.hasNgModuleDecorator).toBe(false);
        expect(result.hasImportsProperty).toBe(false);
        expect(result.hasProvidersProperty).toBe(false);
      });

      it('should detect all module structure elements', () => {
        const content = `
          @NgModule({
            imports: [CommonModule],
            declarations: [AppComponent],
            providers: [MyService]
          })
          export class AppModule {}
        `;

        const result =
          NgRxModuleValidationPatterns.validateModuleStructure(content);
        expect(result.hasNgModuleDecorator).toBe(true);
        expect(result.hasImportsProperty).toBe(true);
        expect(result.hasProvidersProperty).toBe(true);
      });
    });
  });
});
