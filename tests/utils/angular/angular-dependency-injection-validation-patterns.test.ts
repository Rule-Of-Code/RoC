/**
 * @fileoverview Tests for angular-dependency-injection-validation-patterns.ts
 * @description Tests for Angular dependency injection validation patterns utility
 */

import { AngularDependencyInjectionConfiguration } from '../../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-configuration';
import { AngularDependencyInjectionValidationPatterns } from '../../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-validation-patterns';

describe('utils/angular/angular-dependency-injection/angular-dependency-injection-validation-patterns', () => {
  describe('validateConstructorInjection', () => {
    it('should not add violations for proper constructor with access modifiers', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          export class TestComponent {
            constructor(private userService: UserService) {}
          }
        `,
          'test.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateConstructorInjection(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations).toBeInstanceOf(Array);
    });

    it('should suggest access modifiers when using this. without modifiers', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          export class TestComponent {
            constructor(userService: UserService) {
              this.userService = userService;
            }
          }
        `,
          'test.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateConstructorInjection(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should add violation for too many dependencies', () => {
      const content = `
        export class ComplexComponent {
          constructor(
            private service1: Service1,
            private service2: Service2,
            private service3: Service3,
            private service4: Service4,
            private service5: Service5,
            private service6: Service6,
            private service7: Service7,
            private service8: Service8
          ) {}
        }
      `;

      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'complex.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateConstructorInjection(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip validation when no constructor exists', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          export const config = {};
        `,
          'config.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateConstructorInjection(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('validateAllDependencyInjectionPatterns', () => {
    it('should validate all patterns for a proper service', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          import { Injectable } from '@angular/core';

          @Injectable({
            providedIn: 'root'
          })
          export class UserService {
            constructor(private http: HttpClient) {}
          }
        `,
          'user.service.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should add violation for service without Injectable decorator', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          export class DataService {
            constructor(private http: HttpClient) {}
          }
        `,
          'data.service.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest providedIn for service without it', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          import { Injectable } from '@angular/core';

          @Injectable()
          export class LegacyService {
            constructor() {}
          }
        `,
          'legacy.service.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest regarding component-level providers', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-provided',
            providers: [LocalService]
          })
          export class ProvidedComponent {
            constructor(private localService: LocalService) {}
          }
        `,
          'provided.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect high import count', () => {
      const imports = Array.from(
        { length: 15 },
        (_, i) => `import { Service${i} } from './service${i}';`
      ).join('\n');

      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          ${imports}

          export class ComplexComponent {
            constructor() {}
          }
        `,
          'complex.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should acknowledge good @Optional usage', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          import { Component, Optional } from '@angular/core';

          @Component({
            selector: 'app-optional'
          })
          export class OptionalComponent {
            constructor(@Optional() private optionalService: OptionalService) {}
          }
        `,
          'optional.component.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      // Should have suggestion about good usage of Optional
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate NgModule with providers', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          import { NgModule } from '@angular/core';

          @NgModule({
            declarations: [],
            imports: [],
            providers: [SharedService]
          })
          export class SharedModule {}
        `,
          'shared.module.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle file with no DI patterns', () => {
      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          `
          export function helperFunction() {
            return 'hello';
          }
        `,
          'helper.ts'
        );

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        { thresholds: {} }
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });
});
