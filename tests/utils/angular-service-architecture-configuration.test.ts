/**
 * @fileoverview Tests for angular-service-architecture-configuration.ts
 * @description Tests for Angular service architecture configuration utilities
 */

import { AngularServiceArchitectureConfiguration } from '../../src/utils/angular/angular-service-architecture/angular-service-architecture-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-service-architecture/angular-service-architecture-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-service-arch-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('SERVICE_PATTERNS', () => {
    it('should have INJECTABLE_DECORATOR', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .INJECTABLE_DECORATOR
      ).toBe('@Injectable');
    });

    it('should have PROVIDED_IN_ROOT', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .PROVIDED_IN_ROOT
      ).toBe('providedIn');
    });

    it('should have CONSTRUCTOR_KEYWORD', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .CONSTRUCTOR_KEYWORD
      ).toBe('constructor');
    });

    it('should have ACCESS_MODIFIERS', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .ACCESS_MODIFIERS
      ).toContain('private');
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .ACCESS_MODIFIERS
      ).toContain('protected');
    });

    it('should have SERVICE_CLASS', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS.SERVICE_CLASS
      ).toBe('export class');
    });

    it('should have IMPLEMENTS_KEYWORD', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .IMPLEMENTS_KEYWORD
      ).toBe('implements');
    });

    it('should have OBSERVABLE_CLASS', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .OBSERVABLE_CLASS
      ).toBe('Observable');
    });

    it('should have OBSERVABLE_IMPORT', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .OBSERVABLE_IMPORT
      ).toBe('import { Observable }');
    });

    it('should have HTTP_CLIENT', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS.HTTP_CLIENT
      ).toBe('HttpClient');
    });

    it('should have HTTP_CLIENT_INJECTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .HTTP_CLIENT_INJECTION
      ).toBe('private http: HttpClient');
    });

    it('should have CATCH_ERROR_OPERATOR', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .CATCH_ERROR_OPERATOR
      ).toBe('catchError');
    });

    it('should have HTTP_THIS_REFERENCE', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS
          .HTTP_THIS_REFERENCE
      ).toBe('this.http');
    });

    it('should have METHOD_PATTERN as regex', () => {
      expect(
        AngularServiceArchitectureConfiguration.SERVICE_PATTERNS.METHOD_PATTERN
      ).toBeInstanceOf(RegExp);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have NO_SERVICES_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .NO_SERVICES_SUGGESTION
      ).toContain('services');
    });

    it('should have MISSING_INJECTABLE_VIOLATION with placeholder', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .MISSING_INJECTABLE_VIOLATION
      ).toContain('{fileName}');
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .MISSING_INJECTABLE_VIOLATION
      ).toContain('@Injectable');
    });

    it('should have MISSING_INJECTABLE_SUGGESTION with placeholder', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .MISSING_INJECTABLE_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have PROVIDED_IN_ROOT_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .PROVIDED_IN_ROOT_SUGGESTION
      ).toContain('providedIn');
    });

    it('should have ACCESS_MODIFIERS_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .ACCESS_MODIFIERS_SUGGESTION
      ).toContain('private');
    });

    it('should have INTERFACE_IMPLEMENTATION_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .INTERFACE_IMPLEMENTATION_SUGGESTION
      ).toContain('interface');
    });

    it('should have SINGLE_RESPONSIBILITY_SUGGESTION with placeholders', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .SINGLE_RESPONSIBILITY_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .SINGLE_RESPONSIBILITY_SUGGESTION
      ).toContain('{methodCount}');
    });

    it('should have OBSERVABLE_IMPORT_VIOLATION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .OBSERVABLE_IMPORT_VIOLATION
      ).toContain('Observable');
    });

    it('should have HTTP_CLIENT_INJECTION_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .HTTP_CLIENT_INJECTION_SUGGESTION
      ).toContain('HttpClient');
    });

    it('should have ERROR_HANDLING_SUGGESTION', () => {
      expect(
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES
          .ERROR_HANDLING_SUGGESTION
      ).toContain('catchError');
    });
  });

  describe('getThresholds', () => {
    it('should have MAX_METHODS_PER_SERVICE', () => {
      expect(
        AngularServiceArchitectureConfiguration.getThresholds({})
          .MAX_METHODS_PER_SERVICE
      ).toBe(10);
    });
  });

  describe('buildFileNameMessage', () => {
    it('should replace {fileName} placeholder', () => {
      const result =
        AngularServiceArchitectureConfiguration.buildFileNameMessage(
          'Error in {fileName}',
          'user.service.ts'
        );

      expect(result).toBe('Error in user.service.ts');
    });

    it('should handle message without placeholder', () => {
      const result =
        AngularServiceArchitectureConfiguration.buildFileNameMessage(
          'Generic error',
          'test.ts'
        );

      expect(result).toBe('Generic error');
    });
  });

  describe('buildMethodCountMessage', () => {
    it('should replace {methodCount} placeholder', () => {
      const result =
        AngularServiceArchitectureConfiguration.buildMethodCountMessage(
          'Service has {methodCount} methods',
          15
        );

      expect(result).toBe('Service has 15 methods');
    });

    it('should handle zero method count', () => {
      const result =
        AngularServiceArchitectureConfiguration.buildMethodCountMessage(
          'Methods: {methodCount}',
          0
        );

      expect(result).toBe('Methods: 0');
    });
  });

  describe('buildFullMessage', () => {
    it('should replace both fileName and methodCount placeholders', () => {
      const result = AngularServiceArchitectureConfiguration.buildFullMessage(
        'Service {fileName} has {methodCount} methods',
        'user.service.ts',
        15
      );

      expect(result).toBe('Service user.service.ts has 15 methods');
    });

    it('should handle only fileName placeholder', () => {
      const result = AngularServiceArchitectureConfiguration.buildFullMessage(
        'Error in {fileName}',
        'user.service.ts'
      );

      expect(result).toBe('Error in user.service.ts');
    });

    it('should handle undefined methodCount', () => {
      const result = AngularServiceArchitectureConfiguration.buildFullMessage(
        'Error in {fileName}',
        'user.service.ts',
        undefined
      );

      expect(result).toBe('Error in user.service.ts');
    });
  });

  describe('analyzeServicePatterns', () => {
    it('should detect @Injectable decorator', () => {
      const content = `
        @Injectable({ providedIn: 'root' })
        export class UserService {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasInjectableDecorator).toBe(true);
    });

    it('should detect providedIn configuration', () => {
      const content = `
        @Injectable({ providedIn: 'root' })
        export class UserService {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasProvidedIn).toBe(true);
    });

    it('should detect constructor', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasConstructor).toBe(true);
    });

    it('should detect access modifiers', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasAccessModifiers).toBe(true);
    });

    it('should detect service class', () => {
      const content = `
        export class UserService {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasServiceClass).toBe(true);
    });

    it('should detect implements keyword', () => {
      const content = `
        export class UserService implements UserApi {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasImplementsKeyword).toBe(true);
    });

    it('should detect Observable usage', () => {
      const content = `
        getUsers(): Observable<User[]> {
          return this.http.get<User[]>('/api/users');
        }
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasObservable).toBe(true);
    });

    it('should detect Observable import', () => {
      const content = `
        import { Observable } from 'rxjs';
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasObservableImport).toBe(true);
    });

    it('should detect HttpClient', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasHttpClient).toBe(true);
    });

    it('should detect proper HttpClient injection', () => {
      const content = `
        constructor(private http: HttpClient) {}
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasHttpClientInjection).toBe(true);
    });

    it('should detect catchError operator', () => {
      const content = `
        getUsers() {
          return this.http.get('/api/users').pipe(
            catchError(this.handleError)
          );
        }
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasCatchError).toBe(true);
    });

    it('should detect this.http reference', () => {
      const content = `
        return this.http.get('/api/users');
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasHttpReference).toBe(true);
    });

    it('should count methods', () => {
      const content = `
        export class UserService {
          getUsers() {}
          getUserById(id: number) {}
          createUser(user: User) {}
          updateUser(id: number, user: User) {}
          deleteUser(id: number) {}
        }
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.methodCount).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns('');

      expect(result.hasInjectableDecorator).toBe(false);
      expect(result.hasServiceClass).toBe(false);
      expect(result.methodCount).toBe(0);
    });

    it('should analyze complete service', () => {
      const content = `
        import { Injectable } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
        import { Observable } from 'rxjs';
        import { catchError } from 'rxjs/operators';

        @Injectable({ providedIn: 'root' })
        export class UserService implements UserApi {
          constructor(private http: HttpClient) {}

          getUsers(): Observable<User[]> {
            return this.http.get<User[]>('/api/users').pipe(
              catchError(this.handleError)
            );
          }

          private handleError(error: any) {
            console.error(error);
            throw error;
          }
        }
      `;
      const result =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(content);

      expect(result.hasInjectableDecorator).toBe(true);
      expect(result.hasProvidedIn).toBe(true);
      expect(result.hasConstructor).toBe(true);
      expect(result.hasAccessModifiers).toBe(true);
      expect(result.hasServiceClass).toBe(true);
      expect(result.hasImplementsKeyword).toBe(true);
      expect(result.hasObservable).toBe(true);
      expect(result.hasObservableImport).toBe(true);
      expect(result.hasHttpClient).toBe(true);
      expect(result.hasHttpClientInjection).toBe(true);
      expect(result.hasCatchError).toBe(true);
      expect(result.hasHttpReference).toBe(true);
    });
  });
});
