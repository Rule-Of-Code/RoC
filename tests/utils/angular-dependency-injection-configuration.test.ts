/**
 * @fileoverview Tests for angular-dependency-injection-configuration.ts
 * @description Tests for Angular dependency injection configuration utilities
 */

import { AngularDependencyInjectionConfiguration } from '../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-dependency-injection/angular-dependency-injection-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-di-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should contain component.ts extension', () => {
      expect(
        AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.component.ts');
    });

    it('should contain service.ts extension', () => {
      expect(
        AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toContain('.service.ts');
    });

    it('should contain directive.ts extension', () => {
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
      it('should have MISSING_MODIFIER message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.ACCESS_MODIFIERS.MISSING_MODIFIER(
            'test.component.ts'
          );
        expect(result).toContain('test.component.ts');
      });
    });

    describe('SERVICE_COUNT', () => {
      it('should have TOO_MANY_DEPENDENCIES message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.SERVICE_COUNT.TOO_MANY_DEPENDENCIES(
            10,
            'test.component.ts'
          );
        expect(result).toContain('10');
        expect(result).toContain('test.component.ts');
      });

      it('should handle various counts', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.SERVICE_COUNT.TOO_MANY_DEPENDENCIES(
            5,
            'service.ts'
          );
        expect(result).toContain('5');
      });
    });

    describe('INJECTABLE', () => {
      it('should have MISSING_DECORATOR message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.INJECTABLE.MISSING_DECORATOR(
            'user.service.ts'
          );
        expect(result).toContain('user.service.ts');
      });

      it('should have SUGGEST_PROVIDED_IN message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.INJECTABLE.SUGGEST_PROVIDED_IN(
            'user.service.ts'
          );
        expect(result).toContain('user.service.ts');
      });
    });

    describe('PROVIDERS', () => {
      it('should have COMPONENT_LEVEL message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.PROVIDERS.COMPONENT_LEVEL(
            'user.component.ts'
          );
        expect(result).toContain('user.component.ts');
      });

      it('should have SUGGEST_FOR_ROOT message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.PROVIDERS.SUGGEST_FOR_ROOT(
            'app.module.ts'
          );
        expect(result).toContain('app.module.ts');
      });
    });

    describe('CIRCULAR_DEPS', () => {
      it('should have HIGH_IMPORTS message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.CIRCULAR_DEPS.HIGH_IMPORTS(
            'complex.service.ts'
          );
        expect(result).toContain('complex.service.ts');
      });
    });

    describe('OPTIONAL_DEPS', () => {
      it('should have GOOD_USAGE message', () => {
        const result =
          AngularDependencyInjectionConfiguration.VALIDATION_MESSAGES.OPTIONAL_DEPS.GOOD_USAGE(
            'feature.service.ts'
          );
        expect(result).toContain('feature.service.ts');
      });
    });
  });

  describe('PATTERNS', () => {
    it('should have CONSTRUCTOR pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.CONSTRUCTOR).toBe(
        'constructor('
      );
    });

    it('should have CONSTRUCTOR_REGEX as regex', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.CONSTRUCTOR_REGEX
      ).toBeInstanceOf(RegExp);
    });

    it('should have THIS pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.THIS).toBe(
        'this.'
      );
    });

    it('should have PRIVATE pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PRIVATE).toBe(
        'private'
      );
    });

    it('should have PUBLIC pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PUBLIC).toBe(
        'public'
      );
    });

    it('should have COLON pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.COLON).toBe(':');
    });

    it('should have EXPORT_CLASS pattern', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.EXPORT_CLASS
      ).toBe('export class');
    });

    it('should have INJECTABLE pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.INJECTABLE).toBe(
        '@Injectable'
      );
    });

    it('should have PROVIDED_IN pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PROVIDED_IN).toBe(
        'providedIn'
      );
    });

    it('should have PROVIDED_IN_ROOT pattern', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.PROVIDED_IN_ROOT
      ).toContain('root');
    });

    it('should have COMPONENT_DECORATOR pattern', () => {
      expect(
        AngularDependencyInjectionConfiguration.PATTERNS.COMPONENT_DECORATOR
      ).toBe('@Component');
    });

    it('should have PROVIDERS pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.PROVIDERS).toBe(
        'providers:'
      );
    });

    it('should have IMPORT pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.IMPORT).toBe(
        'import'
      );
    });

    it('should have FROM pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.FROM).toBe(
        'from'
      );
    });

    it('should have OPTIONAL pattern', () => {
      expect(AngularDependencyInjectionConfiguration.PATTERNS.OPTIONAL).toBe(
        '@Optional()'
      );
    });

    it('should have MAX_DEPENDENCIES threshold', () => {
      expect(
        typeof AngularDependencyInjectionConfiguration.PATTERNS.MAX_DEPENDENCIES
      ).toBe('number');
    });

    it('should have HIGH_IMPORT_COUNT threshold', () => {
      expect(
        typeof AngularDependencyInjectionConfiguration.PATTERNS
          .HIGH_IMPORT_COUNT
      ).toBe('number');
    });
  });

  describe('analyzeDependencyPatterns', () => {
    it('should detect constructor', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'test.service.ts'
        );

      expect(result.hasConstructor).toBe(true);
    });

    it('should return fileName', () => {
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          '',
          'user.service.ts'
        );

      expect(result.fileName).toBe('user.service.ts');
    });

    it('should extract fileName from path', () => {
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          '',
          '/path/to/user.service.ts'
        );

      expect(result.fileName).toBe('user.service.ts');
    });

    it('should detect access modifiers in constructor', () => {
      const content = `
        constructor(private http: HttpClient, public logger: Logger) {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'test.service.ts'
        );

      expect(result.hasAccessModifiers).toBe(true);
    });

    it('should detect service class with export', () => {
      const content = `
        export class UserService {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasServiceClass).toBe(true);
    });

    it('should detect @Injectable decorator', () => {
      const content = `
        @Injectable({ providedIn: 'root' })
        export class UserService {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasInjectableDecorator).toBe(true);
    });

    it('should detect providedIn configuration', () => {
      const content = `
        @Injectable({ providedIn: 'root' })
        export class UserService {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasProvidedIn).toBe(true);
    });

    it('should detect @Component decorator', () => {
      const content = `
        @Component({ selector: 'app-user' })
        export class UserComponent {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.component.ts'
        );

      expect(result.hasComponentDecorator).toBe(true);
    });

    it('should detect @NgModule decorator', () => {
      const content = `
        @NgModule({ declarations: [] })
        export class AppModule {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'app.module.ts'
        );

      expect(result.hasModuleDecorator).toBe(true);
    });

    it('should detect providers array', () => {
      const content = `
        @Component({
          selector: 'app-user',
          providers: [UserService]
        })
        export class UserComponent {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.component.ts'
        );

      expect(result.hasProviders).toBe(true);
    });

    it('should detect imports', () => {
      const content = `
        import { Injectable } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasImports).toBe(true);
    });

    it('should detect @Optional decorator', () => {
      const content = `
        constructor(@Optional() private logger: Logger) {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasOptionalDeps).toBe(true);
    });

    it('should count imports', () => {
      const content = `
        import { Injectable } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
        import { Observable } from 'rxjs';
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.importCount).toBeGreaterThan(0);
    });

    it('should extract constructor block', () => {
      const content = `
        constructor(private http: HttpClient, private logger: Logger) {}
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.constructorBlock).toBeDefined();
    });

    it('should count dependencies in constructor', () => {
      const content = `
        constructor(private http: HttpClient, private logger: Logger) {
          // initialization
        }
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.dependencyCount).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          '',
          'empty.service.ts'
        );

      expect(result.fileName).toBe('empty.service.ts');
      expect(result.hasConstructor).toBe(false);
      expect(result.hasInjectableDecorator).toBe(false);
      expect(result.dependencyCount).toBe(0);
    });

    it('should analyze complete service with DI', () => {
      const content = `
        import { Injectable, Optional } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
        import { Observable } from 'rxjs';

        @Injectable({ providedIn: 'root' })
        export class UserService {
          constructor(private http: HttpClient, private logger: Logger) { this.init(); }

          getUsers(): Observable<User[]> {
            return this.http.get<User[]>('/api/users');
          }
        }
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.service.ts'
        );

      expect(result.hasInjectableDecorator).toBe(true);
      expect(result.hasProvidedIn).toBe(true);
      expect(result.hasConstructor).toBe(true);
      expect(result.hasAccessModifiers).toBe(true);
      expect(result.hasServiceClass).toBe(true);
      expect(result.hasImports).toBe(true);
      // Check optional deps separately - the content doesn't have @Optional() in constructor
      expect(result.dependencyCount).toBeGreaterThan(0);
    });

    it('should detect optional dependencies', () => {
      const content = `
        import { Injectable, Optional } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class LogService {
          // @Optional() and @Host decorators are used for optional DI
        }
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'log.service.ts'
        );
      expect(result.hasOptionalDeps).toBe(true);
    });

    it('should handle component with providers', () => {
      const content = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-user',
          templateUrl: './user.component.html',
          providers: [UserService]
        })
        export class UserComponent {
          constructor(private userService: UserService) {}
        }
      `;
      const result =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          'user.component.ts'
        );

      expect(result.hasComponentDecorator).toBe(true);
      expect(result.hasProviders).toBe(true);
      expect(result.hasConstructor).toBe(true);
    });
  });
});
