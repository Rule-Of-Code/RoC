/**
 * @fileoverview Tests for angular-dependency-injection-configuration.ts
 * @description Tests for Angular dependency injection configuration utility
 */

import { AngularDependencyInjectionConfiguration } from '../../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-configuration';

describe('utils/angular/angular-dependency-injection/angular-dependency-injection-configuration', () => {
  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should include component.ts extension', () => {
      expect(
        AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });

    it('should include service.ts extension', () => {
      expect(
        AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.service.ts');
    });

    it('should include directive.ts extension', () => {
      expect(
        AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.directive.ts');
    });
  });

  describe('DIRECTORIES', () => {
    it('should have SRC directory defined', () => {
      expect(AngularDependencyInjectionConfiguration.DIRECTORIES.SRC).toBe(
        'src'
      );
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    describe('ACCESS_MODIFIERS', () => {
      it('should return MISSING_MODIFIER message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.ACCESS_MODIFIERS.MISSING_MODIFIER(
            'test.component.ts'
          );

        expect(message).toContain('test.component.ts');
      });
    });

    describe('SERVICE_COUNT', () => {
      it('should return TOO_MANY_DEPENDENCIES message with count and fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.SERVICE_COUNT.TOO_MANY_DEPENDENCIES(
            8,
            'complex.component.ts'
          );

        expect(message).toContain('8');
        expect(message).toContain('complex.component.ts');
      });
    });

    describe('INJECTABLE', () => {
      it('should return MISSING_DECORATOR message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.INJECTABLE.MISSING_DECORATOR(
            'data.service.ts'
          );

        expect(message).toContain('data.service.ts');
      });

      it('should return SUGGEST_PROVIDED_IN message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.INJECTABLE.SUGGEST_PROVIDED_IN(
            'legacy.service.ts'
          );

        expect(message).toContain('legacy.service.ts');
      });
    });

    describe('PROVIDERS', () => {
      it('should return COMPONENT_LEVEL message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.PROVIDERS.COMPONENT_LEVEL(
            'provided.component.ts'
          );

        expect(message).toContain('provided.component.ts');
      });

      it('should return SUGGEST_FOR_ROOT message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.PROVIDERS.SUGGEST_FOR_ROOT(
            'app.module.ts'
          );

        expect(message).toContain('app.module.ts');
      });
    });

    describe('CIRCULAR_DEPS', () => {
      it('should return HIGH_IMPORTS message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.CIRCULAR_DEPS.HIGH_IMPORTS(
            'complex.component.ts'
          );

        expect(message).toContain('complex.component.ts');
      });
    });

    describe('OPTIONAL_DEPS', () => {
      it('should return GOOD_USAGE message with fileName', () => {
        const message =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.OPTIONAL_DEPS.GOOD_USAGE(
            'optional.component.ts'
          );

        expect(message).toContain('optional.component.ts');
      });
    });
  });

  describe('PATTERNS', () => {
    it('should have CONSTRUCTOR pattern defined', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.CONSTRUCTOR).toBe(
        'constructor('
      );
    });

    it('should have CONSTRUCTOR_REGEX pattern defined', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.CONSTRUCTOR_REGEX
      ).toBeInstanceOf(RegExp);
    });

    it('should have access modifier patterns defined', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PRIVATE).toBe(
        'private'
      );
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PUBLIC).toBe(
        'public'
      );
    });

    it('should have THIS pattern defined', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.THIS).toBe(
        'this.'
      );
    });

    it('should have Injectable patterns defined', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.INJECTABLE).toBe(
        '@Injectable'
      );
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PROVIDED_IN).toBe(
        'providedIn'
      );
    });

    it('should have decorator patterns defined', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.COMPONENT_DECORATOR
      ).toBe('@Component');
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.NG_MODULE_DECORATOR
      ).toBe('@NgModule');
    });

    it('should have threshold values defined', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.MAX_DEPENDENCIES
      ).toBeGreaterThan(0);
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.HIGH_IMPORT_COUNT
      ).toBeGreaterThan(0);
    });
  });

  describe('analyzeDependencyPatterns', () => {
    it('should analyze service with Injectable decorator', () => {
      const content = `
        import { Injectable } from '@angular/core';

        @Injectable({
          providedIn: 'root'
        })
        export class UserService {
          constructor(private http: HttpClient) {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/user.service.ts'
        );

      expect(result.fileName).toBe('user.service.ts');
      expect(result.hasServiceClass).toBe(true);
      expect(result.hasInjectableDecorator).toBe(true);
      expect(result.hasProvidedIn).toBe(true);
      expect(result.hasConstructor).toBe(true);
      expect(result.hasAccessModifiers).toBe(true);
    });

    it('should detect service without providedIn', () => {
      const content = `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class LegacyService {
          constructor() {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/legacy.service.ts'
        );

      expect(result.hasInjectableDecorator).toBe(true);
      expect(result.hasProvidedIn).toBe(false);
    });

    it('should detect component with providers', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-provided',
          providers: [LocalService]
        })
        export class ProvidedComponent {
          constructor(private localService: LocalService) {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/provided.component.ts'
        );

      expect(result.hasComponentDecorator).toBe(true);
      expect(result.hasProviders).toBe(true);
    });

    it('should count dependencies in constructor', () => {
      const content = `
        export class MultiDependencyComponent {
          constructor(
            private service1: Service1,
            private service2: Service2,
            private service3: Service3
          ) {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/multi.component.ts'
        );

      expect(result.dependencyCount).toBeGreaterThanOrEqual(3);
    });

    it('should detect @Optional decorator usage', () => {
      const content = `
        import { Component, Optional } from '@angular/core';

        @Component({
          selector: 'app-optional'
        })
        export class OptionalComponent {
          constructor(@Optional() private optionalService: OptionalService) {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/optional.component.ts'
        );

      expect(result.hasOptionalDeps).toBe(true);
    });

    it('should detect @Host decorator usage', () => {
      const content = `
        import { Directive, Host } from '@angular/core';

        @Directive({
          selector: '[appChild]'
        })
        export class ChildDirective {
          constructor(@Host() private parent: ParentComponent) {}
        }
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/child.directive.ts'
        );

      expect(result.hasOptionalDeps).toBe(true);
    });

    it('should count imports correctly', () => {
      const content = `
        import { Component } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
        import { UserService } from './user.service';
        import { AuthService } from './auth.service';

        @Component({ selector: 'app-test' })
        export class TestComponent {}
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/test.component.ts'
        );

      expect(result.hasImports).toBe(true);
      expect(result.importCount).toBeGreaterThanOrEqual(4);
    });

    it('should detect NgModule decorator', () => {
      const content = `
        import { NgModule } from '@angular/core';

        @NgModule({
          declarations: [],
          imports: [],
          providers: [SharedService]
        })
        export class SharedModule {}
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/shared.module.ts'
        );

      expect(result.hasModuleDecorator).toBe(true);
      expect(result.hasProviders).toBe(true);
    });

    it('should handle file without constructor', () => {
      const content = `
        export const config = {
          apiUrl: 'https://api.example.com'
        };
      `;

      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          '/path/to/config.ts'
        );

      expect(result.hasConstructor).toBe(false);
      expect(result.constructorBlock).toBeUndefined();
      expect(result.dependencyCount).toBe(0);
    });
  });
});
