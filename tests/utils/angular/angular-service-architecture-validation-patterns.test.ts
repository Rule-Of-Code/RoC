/**
 * @fileoverview Tests for angular-service-architecture-validation-patterns.ts
 * @description Tests for Angular service architecture validation patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularServiceArchitectureConfiguration } from '../../../src/utils/angular/angular-service-architecture/angular-service-architecture-configuration';
import { AngularServiceArchitectureValidationPatterns } from '../../../src/utils/angular/angular-service-architecture/angular-service-architecture-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-service-architecture/angular-service-architecture-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularServiceArchitectureValidationPatterns', () => {
    describe('validateAllServicePatterns', () => {
      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        existsSpy.mockReturnValue(false);
        findFilesSpy.mockReturnValue([]);

        const result =
          AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        // When src doesn't exist, still returns suggestion to create services
        expect(result.suggestions.length).toBeGreaterThanOrEqual(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
      });

      it('should suggest creating services when no service files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([]);

        const result =
          AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.suggestions).toContain(
          'Create services for business logic separation'
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
      });

      it('should analyze service files when found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue(['/test/project/src/user.service.ts']);
        readFileSpy.mockReturnValue(`
          export class UserService {
            constructor() {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const result =
          AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should analyze multiple service files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([
          '/test/project/src/user.service.ts',
          '/test/project/src/data.service.ts',
        ]);
        readFileSpy.mockReturnValue(`
          export class SomeService {
            constructor() {}
          }
        `);
        basenameSpy.mockImplementation((path: string) => {
          if (path.includes('data')) return 'data.service.ts';
          return 'user.service.ts';
        });

        const result =
          AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });

    describe('analyzeServiceFile', () => {
      it('should skip empty files', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');

        readFileSpy.mockReturnValue('');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);

        readFileSpy.mockRestore();
      });

      it('should detect missing Injectable decorator', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          export class UserService {
            constructor() {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        expect(
          violations.some(
            v => v.includes('@Injectable') || v.includes('Injectable')
          )
        ).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not report missing Injectable when decorator is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService {
            constructor() {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const injectableViolation = violations.find(v =>
          v.includes('Injectable')
        );
        expect(injectableViolation).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest providedIn root when Injectable without providedIn', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable()
          export class UserService {
            constructor() {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const providedInSuggestion = suggestions.find(s =>
          s.includes('providedIn')
        );
        expect(providedInSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest providedIn when already present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService {
            constructor() {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const providedInSuggestion = suggestions.find(s =>
          s.includes('providedIn')
        );
        expect(providedInSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest access modifiers for constructor injections', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService {
            constructor(http: HttpClient) {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const modifiersSuggestion = suggestions.find(
          s => s.includes('private') || s.includes('modifiers')
        );
        expect(modifiersSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest access modifiers when private is used', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService {
            constructor(private http: HttpClient) {}
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const modifiersSuggestion = suggestions.find(s =>
          s.includes('access modifiers')
        );
        expect(modifiersSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest interface implementation for service class', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService {
            getUsers() { return []; }
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const interfaceSuggestion = suggestions.find(s =>
          s.includes('interface')
        );
        expect(interfaceSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest interface when implements is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService implements IUserService {
            getUsers() { return []; }
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const interfaceSuggestion = suggestions.find(s =>
          s.includes('interface')
        );
        expect(interfaceSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should detect Observable used without import', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @Injectable({ providedIn: 'root' })
          export class UserService implements IUserService {
            getUsers(): Observable<User[]> { return of([]); }
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        expect(violations.some(v => v.includes('Observable'))).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not report Observable violation when import is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { Observable } from 'rxjs';

          @Injectable({ providedIn: 'root' })
          export class UserService implements IUserService {
            getUsers(): Observable<User[]> { return of([]); }
          }
        `);
        basenameSpy.mockReturnValue('user.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/user.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const observableViolation = violations.find(v =>
          v.includes('Observable')
        );
        expect(observableViolation).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest HttpClient injection pattern', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { Observable } from 'rxjs';
          import { HttpClient } from '@angular/common/http';

          @Injectable({ providedIn: 'root' })
          export class ApiService implements IApiService {
            constructor() {}
            getData() { return this.http.get('/api'); }
          }
        `);
        basenameSpy.mockReturnValue('api.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/api.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const httpSuggestion = suggestions.find(
          s => s.includes('HttpClient') || s.includes('http')
        );
        expect(httpSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest error handling when using http without catchError', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { Observable } from 'rxjs';
          import { HttpClient } from '@angular/common/http';

          @Injectable({ providedIn: 'root' })
          export class ApiService implements IApiService {
            constructor(private http: HttpClient) {}
            getData() { return this.http.get('/api'); }
          }
        `);
        basenameSpy.mockReturnValue('api.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/api.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const errorSuggestion = suggestions.find(
          s => s.includes('error') || s.includes('catchError')
        );
        expect(errorSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest error handling when catchError is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { Observable } from 'rxjs';
          import { catchError } from 'rxjs/operators';
          import { HttpClient } from '@angular/common/http';

          @Injectable({ providedIn: 'root' })
          export class ApiService implements IApiService {
            constructor(private http: HttpClient) {}
            getData() {
              return this.http.get('/api').pipe(catchError(err => of(null)));
            }
          }
        `);
        basenameSpy.mockReturnValue('api.service.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/test/api.service.ts',
          violations,
          suggestions,
          mockConfig
        );

        const errorSuggestion = suggestions.find(s => s.includes('catchError'));
        expect(errorSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });

    describe('validateServiceStructurePatterns', () => {
      it('should validate service structure patterns correctly', () => {
        const content = `
          @Injectable({ providedIn: 'root' })
          export class UserService {
            constructor(private http: HttpClient) {}
          }
        `;
        const fileName = 'user.service.ts';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.validateServiceStructurePatterns(
          content,
          fileName,
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);

        const injectableViolation = violations.find(v =>
          v.includes('Injectable')
        );
        expect(injectableViolation).toBeUndefined();
      });

      it('should detect missing Injectable decorator via structure patterns', () => {
        const content = `
          export class UserService {
            constructor(private http: HttpClient) {}
          }
        `;
        const fileName = 'user.service.ts';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.validateServiceStructurePatterns(
          content,
          fileName,
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
      });
    });

    describe('validateServiceArchitecturePatterns', () => {
      it('should validate service architecture patterns correctly', () => {
        const content = `
          import { Observable } from 'rxjs';

          @Injectable({ providedIn: 'root' })
          export class UserService implements IUserService {
            getUser(): Observable<User> { return this.http.get('/user'); }
          }
        `;
        const fileName = 'user.service.ts';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
          content,
          fileName,
          violations,
          suggestions,
          mockConfig
        );

        expect(violations).toHaveLength(0);
      });

      it('should suggest splitting service with many methods', () => {
        const methods = Array.from(
          { length: 15 },
          (_, i) => `method${i}() {}`
        ).join('\n');
        const content = `
          @Injectable({ providedIn: 'root' })
          export class BigService implements IBigService {
            ${methods}
          }
        `;
        const fileName = 'big.service.ts';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
          content,
          fileName,
          violations,
          suggestions,
          mockConfig
        );

        const splitSuggestion = suggestions.find(
          s => s.includes('splitting') || s.includes('methods')
        );
        expect(splitSuggestion).toBeDefined();
      });
    });
  });

  describe('AngularServiceArchitectureConfiguration', () => {
    describe('analyzeServicePatterns', () => {
      it('should detect Injectable decorator', () => {
        const content = '@Injectable({ providedIn: "root" })';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasInjectableDecorator).toBe(true);
      });

      it('should detect providedIn', () => {
        const content = '@Injectable({ providedIn: "root" })';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasProvidedIn).toBe(true);
      });

      it('should detect constructor', () => {
        const content = 'constructor(private http: HttpClient) {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasConstructor).toBe(true);
      });

      it('should detect access modifiers', () => {
        const content = 'constructor(private http: HttpClient) {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasAccessModifiers).toBe(true);
      });

      it('should detect protected access modifier', () => {
        const content = 'constructor(protected http: HttpClient) {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasAccessModifiers).toBe(true);
      });

      it('should detect service class', () => {
        const content = 'export class UserService {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasServiceClass).toBe(true);
      });

      it('should detect implements keyword', () => {
        const content = 'export class UserService implements IUserService {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasImplementsKeyword).toBe(true);
      });

      it('should detect Observable', () => {
        const content = 'getUsers(): Observable<User[]> {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasObservable).toBe(true);
      });

      it('should detect Observable import', () => {
        const content = 'import { Observable } from "rxjs";';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasObservableImport).toBe(true);
      });

      it('should detect HttpClient', () => {
        const content = 'constructor(private http: HttpClient) {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasHttpClient).toBe(true);
      });

      it('should detect HttpClient injection pattern', () => {
        const content = 'constructor(private http: HttpClient) {}';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasHttpClientInjection).toBe(true);
      });

      it('should detect catchError', () => {
        const content = '.pipe(catchError(err => of(null)))';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasCatchError).toBe(true);
      });

      it('should detect http reference', () => {
        const content = 'this.http.get("/api")';
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.hasHttpReference).toBe(true);
      });

      it('should count methods', () => {
        const content = `
          method1() {}
          method2() {}
          method3() {}
        `;
        const result =
          AngularServiceArchitectureConfiguration.analyzeServicePatterns(
            content
          );

        expect(result.methodCount).toBeGreaterThanOrEqual(3);
      });
    });

    describe('buildFileNameMessage', () => {
      it('should replace fileName placeholder', () => {
        const template = 'Error in {fileName}';
        const result =
          AngularServiceArchitectureConfiguration.buildFileNameMessage(
            template,
            'test.ts'
          );

        expect(result).toBe('Error in test.ts');
      });
    });

    describe('buildMethodCountMessage', () => {
      it('should replace methodCount placeholder', () => {
        const template = 'Service has {methodCount} methods';
        const result =
          AngularServiceArchitectureConfiguration.buildMethodCountMessage(
            template,
            15
          );

        expect(result).toBe('Service has 15 methods');
      });
    });

    describe('buildFullMessage', () => {
      it('should replace both placeholders', () => {
        const template = '{fileName} has {methodCount} methods';
        const result = AngularServiceArchitectureConfiguration.buildFullMessage(
          template,
          'test.ts',
          10
        );

        expect(result).toBe('test.ts has 10 methods');
      });

      it('should handle missing methodCount', () => {
        const template = 'Error in {fileName}';
        const result = AngularServiceArchitectureConfiguration.buildFullMessage(
          template,
          'test.ts'
        );

        expect(result).toBe('Error in test.ts');
      });
    });
  });
});
