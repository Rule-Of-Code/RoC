/**
 * @fileoverview Tests for angular-service-architecture-validation-patterns.ts
 * @description Tests for Angular service architecture validation patterns utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularServiceArchitectureConfiguration } from '../../src/utils/angular/angular-service-architecture/angular-service-architecture-configuration';
import { AngularServiceArchitectureValidationPatterns } from '../../src/utils/angular/angular-service-architecture/angular-service-architecture-validation-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-service-architecture/angular-service-architecture-validation-patterns', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('service-arch-validation-test-');
    mockConfig = {
      extends: [],
      laws: {},
      plugins: [],
      ignorePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('analyzeServicePatterns', () => {
    it('should detect Injectable decorator', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable({
            providedIn: 'root'
          })
          export class DataService {}
        `
        );

      expect(patterns.hasInjectableDecorator).toBe(true);
    });

    it('should detect missing Injectable decorator', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          export class DataService {
            getData(): Observable<Data[]> {
              return of([]);
            }
          }
        `
        );

      expect(patterns.hasInjectableDecorator).toBe(false);
    });

    it('should detect providedIn configuration', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable({
            providedIn: 'root'
          })
          export class DataService {}
        `
        );

      expect(patterns.hasProvidedIn).toBe(true);
    });

    it('should detect missing providedIn', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class DataService {}
        `
        );

      expect(patterns.hasProvidedIn).toBe(false);
    });

    it('should detect constructor with access modifiers', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable({
            providedIn: 'root'
          })
          export class DataService {
            constructor(private http: HttpClient) {}
          }
        `
        );

      expect(patterns.hasConstructor).toBe(true);
      expect(patterns.hasAccessModifiers).toBe(true);
    });

    it('should detect constructor without access modifiers', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable({
            providedIn: 'root'
          })
          export class DataService {
            constructor(http: HttpClient) {
              this.http = http;
            }
          }
        `
        );

      expect(patterns.hasConstructor).toBe(true);
      expect(patterns.hasAccessModifiers).toBe(false);
    });

    it('should detect service class export', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class DataService {}
        `
        );

      expect(patterns.hasServiceClass).toBe(true);
    });

    it('should detect implements keyword', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class DataService implements IDataService {
            getData(): Observable<Data[]> {
              return of([]);
            }
          }
        `
        );

      expect(patterns.hasImplementsKeyword).toBe(true);
    });

    it('should detect Observable usage', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class DataService {
            getData(): Observable<Data[]> {
              return of([]);
            }
          }
        `
        );

      expect(patterns.hasObservable).toBe(true);
    });

    it('should detect Observable import', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          import { Observable } from 'rxjs';

          @Injectable()
          export class DataService {
            getData(): Observable<Data[]> {}
          }
        `
        );

      expect(patterns.hasObservableImport).toBe(true);
    });

    it('should detect HttpClient usage', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class ApiService {
            constructor(private http: HttpClient) {}

            getData(): Observable<Data[]> {
              return this.http.get<Data[]>('/api/data');
            }
          }
        `
        );

      expect(patterns.hasHttpClient).toBe(true);
      expect(patterns.hasHttpReference).toBe(true);
    });

    it('should detect catchError usage', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class ApiService {
            getData(): Observable<Data[]> {
              return this.http.get<Data[]>('/api/data').pipe(
                catchError(err => throwError(() => err))
              );
            }
          }
        `
        );

      expect(patterns.hasCatchError).toBe(true);
    });

    it('should count methods in service', () => {
      const patterns =
        AngularServiceArchitectureConfiguration.analyzeServicePatterns(
          `
          @Injectable()
          export class DataService {
            getData() {}
            getById() {}
            create() {}
            update() {}
            delete() {}
          }
        `
        );

      expect(patterns.methodCount).toBeGreaterThan(0);
    });
  });

  describe('validateServiceStructurePatterns', () => {
    it('should add violation for missing Injectable decorator', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceStructurePatterns(
        `export class DataService {}`,
        'data.service.ts',
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('@Injectable');
    });

    it('should suggest providedIn root for services', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceStructurePatterns(
        `
          @Injectable()
          export class DataService {}
        `,
        'data.service.ts',
        violations,
        suggestions
      );

      expect(suggestions.some(s => s.includes('providedIn'))).toBe(true);
    });

    it('should not add violation for proper service', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceStructurePatterns(
        `
          @Injectable({
            providedIn: 'root'
          })
          export class DataService {
            constructor(private http: HttpClient) {}
          }
        `,
        'data.service.ts',
        violations,
        suggestions
      );

      expect(violations.length).toBe(0);
    });
  });

  describe('validateServiceArchitecturePatterns', () => {
    it('should suggest interface implementation', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
        `
          @Injectable()
          export class DataService {
            getData(): Observable<Data[]> {
              return of([]);
            }
          }
        `,
        'data.service.ts',
        violations,
        suggestions,
        { thresholds: {} } as unknown as RuleOfCodeConfig
      );

      expect(suggestions.some(s => s.includes('interface'))).toBe(true);
    });

    it('should add violation for Observable without import', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
        `
          @Injectable()
          export class DataService {
            getData(): Observable<Data[]> {
              return of([]);
            }
          }
        `,
        'data.service.ts',
        violations,
        suggestions,
        { thresholds: {} } as unknown as RuleOfCodeConfig
      );

      expect(violations.some(v => v.includes('Observable'))).toBe(true);
    });

    it('should suggest error handling for HTTP services', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
        `
          import { Observable } from 'rxjs';

          @Injectable()
          export class ApiService {
            constructor(private http: HttpClient) {}

            getData(): Observable<Data[]> {
              return this.http.get<Data[]>('/api/data');
            }
          }
        `,
        'api.service.ts',
        violations,
        suggestions,
        { thresholds: {} } as unknown as RuleOfCodeConfig
      );

      expect(
        suggestions.some(s => s.includes('catchError') || s.includes('error'))
      ).toBe(true);
    });

    it('should suggest splitting for services with many methods', () => {
      const methodsContent = Array.from(
        { length: 15 },
        (_, i) => `method${i}() { return of(null); }`
      ).join('\n            ');

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularServiceArchitectureValidationPatterns.validateServiceArchitecturePatterns(
        `
          @Injectable()
          export class DataService implements IDataService {
            ${methodsContent}
          }
        `,
        'data.service.ts',
        violations,
        suggestions,
        { thresholds: {} } as unknown as RuleOfCodeConfig
      );

      expect(
        suggestions.some(
          s => s.includes('many methods') || s.includes('splitting')
        )
      ).toBe(true);
    });
  });

  describe('validateAllServicePatterns', () => {
    it('should return suggestion when no services found', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const result =
        AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should analyze service files in project', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'data.service.ts'),
        `
          import { Injectable } from '@angular/core';
          import { Observable } from 'rxjs';

          @Injectable({
            providedIn: 'root'
          })
          export class DataService {
            constructor(private http: HttpClient) {}

            getData(): Observable<Data[]> {
              return this.http.get<Data[]>('/api/data');
            }
          }
        `
      );

      const result =
        AngularServiceArchitectureValidationPatterns.validateAllServicePatterns(
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });
  });

  describe('analyzeServiceFile', () => {
    it('should handle empty file gracefully', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      expect(() => {
        AngularServiceArchitectureValidationPatterns.analyzeServiceFile(
          '/non/existent/file.ts',
          violations,
          suggestions,
          { thresholds: {} } as unknown as RuleOfCodeConfig
        );
      }).not.toThrow();
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have all required validation messages', () => {
      const messages =
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES;

      expect(messages.NO_SERVICES_SUGGESTION).toBeDefined();
      expect(messages.MISSING_INJECTABLE_VIOLATION).toBeDefined();
      expect(messages.MISSING_INJECTABLE_SUGGESTION).toBeDefined();
      expect(messages.PROVIDED_IN_ROOT_SUGGESTION).toBeDefined();
      expect(messages.ACCESS_MODIFIERS_SUGGESTION).toBeDefined();
      expect(messages.INTERFACE_IMPLEMENTATION_SUGGESTION).toBeDefined();
      expect(messages.SINGLE_RESPONSIBILITY_SUGGESTION).toBeDefined();
      expect(messages.OBSERVABLE_IMPORT_VIOLATION).toBeDefined();
      expect(messages.ERROR_HANDLING_SUGGESTION).toBeDefined();
    });

    it('should contain fileName placeholder in messages', () => {
      const messages =
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES;

      expect(messages.MISSING_INJECTABLE_VIOLATION).toContain('{fileName}');
      expect(messages.PROVIDED_IN_ROOT_SUGGESTION).toContain('{fileName}');
    });

    it('should contain methodCount placeholder in single responsibility message', () => {
      const messages =
        AngularServiceArchitectureConfiguration.VALIDATION_MESSAGES;

      expect(messages.SINGLE_RESPONSIBILITY_SUGGESTION).toContain(
        '{methodCount}'
      );
    });
  });

  describe('getThresholds', () => {
    it('should have max methods threshold defined', () => {
      const thresholds =
        AngularServiceArchitectureConfiguration.getThresholds({});

      expect(thresholds.MAX_METHODS_PER_SERVICE).toBeDefined();
      expect(thresholds.MAX_METHODS_PER_SERVICE).toBeGreaterThan(0);
    });
  });

  describe('SERVICE_PATTERNS', () => {
    it('should have all required patterns', () => {
      const patterns = AngularServiceArchitectureConfiguration.SERVICE_PATTERNS;

      expect(patterns.INJECTABLE_DECORATOR).toBe('@Injectable');
      expect(patterns.PROVIDED_IN_ROOT).toBe('providedIn');
      expect(patterns.CONSTRUCTOR_KEYWORD).toBe('constructor');
      expect(patterns.OBSERVABLE_CLASS).toBe('Observable');
      expect(patterns.HTTP_CLIENT).toBe('HttpClient');
      expect(patterns.CATCH_ERROR_OPERATOR).toBe('catchError');
    });

    it('should have access modifiers array', () => {
      const patterns = AngularServiceArchitectureConfiguration.SERVICE_PATTERNS;

      expect(patterns.ACCESS_MODIFIERS).toContain('private');
      expect(patterns.ACCESS_MODIFIERS).toContain('protected');
    });
  });
});
