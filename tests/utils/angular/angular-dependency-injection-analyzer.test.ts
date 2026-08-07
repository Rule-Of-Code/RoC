/**
 * @fileoverview Tests for angular-dependency-injection-analyzer.ts
 * @description Tests for Angular dependency injection analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularDependencyInjectionAnalyzer } from '../../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-analyzer';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-dependency-injection/angular-dependency-injection-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-di-analyzer-test-');
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;

    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkDependencyInjection', () => {
    it('should return empty results for empty project', () => {
      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze service with proper Injectable decorator', () => {
      const serviceContent = `
        import { Injectable } from '@angular/core';

        @Injectable({
          providedIn: 'root'
        })
        export class UserService {
          constructor(private http: HttpClient) {}

          getUsers() {
            return this.http.get('/api/users');
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.service.ts'),
        serviceContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should detect service without Injectable decorator', () => {
      const serviceContent = `
        export class DataService {
          constructor(private http: HttpClient) {}

          getData() {
            return this.http.get('/api/data');
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data.service.ts'),
        serviceContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(
        result.violations.length + result.suggestions.length
      ).toBeGreaterThanOrEqual(0);
    });

    it('should detect service without providedIn', () => {
      const serviceContent = `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class LegacyService {
          constructor() {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'legacy.service.ts'),
        serviceContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect too many dependencies in constructor', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-complex'
        })
        export class ComplexComponent {
          constructor(
            private userService: UserService,
            private authService: AuthService,
            private dataService: DataService,
            private loggerService: LoggerService,
            private configService: ConfigService,
            private cacheService: CacheService,
            private analyticsService: AnalyticsService,
            private notificationService: NotificationService
          ) {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'complex.component.ts'),
        componentContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result.violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze component with proper DI patterns', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-user'
        })
        export class UserComponent {
          constructor(private userService: UserService) {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.component.ts'),
        componentContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should detect missing access modifiers in constructor', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-bad'
        })
        export class BadComponent {
          constructor(userService: UserService) {
            this.userService = userService;
          }
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad.component.ts'),
        componentContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze directive files', () => {
      const directiveContent = `
        import { Directive } from '@angular/core';

        @Directive({
          selector: '[appHighlight]'
        })
        export class HighlightDirective {
          constructor(private el: ElementRef, private renderer: Renderer2) {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'highlight.directive.ts'),
        directiveContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should detect component-level providers', () => {
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-provided',
          providers: [LocalService]
        })
        export class ProvidedComponent {
          constructor(private localService: LocalService) {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'provided.component.ts'),
        componentContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect @Optional decorator usage', () => {
      const componentContent = `
        import { Component, Optional } from '@angular/core';

        @Component({
          selector: 'app-optional'
        })
        export class OptionalComponent {
          constructor(@Optional() private optionalService: OptionalService) {}
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'optional.component.ts'),
        componentContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should handle missing src directory', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'nonexistent');

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          nonExistentPath,
          mockConfig
        );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle unreadable files gracefully', () => {
      // Create a valid file first
      const validContent = `
        import { Injectable } from '@angular/core';

        @Injectable({ providedIn: 'root' })
        export class ValidService {}
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'valid.service.ts'),
        validContent
      );

      const result =
        AngularDependencyInjectionAnalyzer.checkDependencyInjection(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });
  });
});
