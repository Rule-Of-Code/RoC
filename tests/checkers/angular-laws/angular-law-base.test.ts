/**
 * @fileoverview Tests for AngularLawBase
 * @description Tests for Angular law base class functionality
 */

import { AngularLawBase } from '../../../src/checkers/angular-laws/angular-law-base';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/angular-law-base', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-law-base-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
          componentPrefix: 'app',
          type: 'generic',
        },
        ignores: { global: [], tests: [], build: [], design: [] },
        laws: { paretoMode: false, severity: {} },
        hooks: { preCommit: false, prePush: false, commitMsg: false },
        includes: { global: [] },
        excludes: {},
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: false,
        },
        performance: {
          parallel: false,
          maxConcurrent: 3,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Test Helper Class to Access Protected Methods
  // ==========================================================================

  class TestableAngularLawBase extends AngularLawBase {
    static testHasAngularProject(projectRoot: string): boolean {
      return this.hasAngularProject(projectRoot);
    }

    static testHasNgrxStore(projectRoot: string): boolean {
      return this.hasNgrxStore(projectRoot);
    }

    static testIsAngularSourceFile(filePath: string): boolean {
      return this.isAngularSourceFile(filePath);
    }

    static testGetAngularVersion(projectRoot: string): string | null {
      return this.getAngularVersion(projectRoot);
    }

    static testCreateAngularRequiredResult(
      lawName: string,
      projectRoot: string,
      checkMethod: (projectRoot: string) => boolean,
      context: LawCheckContext
    ) {
      return this.createAngularRequiredResult(
        lawName,
        projectRoot,
        checkMethod,
        context
      );
    }
  }

  // ==========================================================================
  // hasAngularProject Tests
  // ==========================================================================

  describe('hasAngularProject', () => {
    it('should return false when no Angular configuration exists', () => {
      const result = TestableAngularLawBase.testHasAngularProject(tempDir);

      expect(result).toBe(false);
    });

    it('should return true when angular.json exists', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const result = TestableAngularLawBase.testHasAngularProject(tempDir);

      expect(result).toBe(true);
    });

    it('should return true when package.json has @angular/core dependency', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@angular/core': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testHasAngularProject(tempDir);

      expect(result).toBe(true);
    });

    it('should return false when package.json has no Angular dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testHasAngularProject(tempDir);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // hasNgrxStore Tests
  // ==========================================================================

  describe('hasNgrxStore', () => {
    it('should return false when no NgRx dependency exists', () => {
      const result = TestableAngularLawBase.testHasNgrxStore(tempDir);

      expect(result).toBe(false);
    });

    it('should return true when package.json has @ngrx/store dependency', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@ngrx/store': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testHasNgrxStore(tempDir);

      expect(result).toBe(true);
    });

    it('should return true when @ngrx/store is in devDependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          '@ngrx/store': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testHasNgrxStore(tempDir);

      expect(result).toBe(true);
    });

    it('should return false when different ngrx packages exist but not store', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@ngrx/effects': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testHasNgrxStore(tempDir);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // isAngularSourceFile Tests
  // ==========================================================================

  describe('isAngularSourceFile', () => {
    it('should return true for .component.ts files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('app.component.ts');

      expect(result).toBe(true);
    });

    it('should return true for .service.ts files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('data.service.ts');

      expect(result).toBe(true);
    });

    it('should return true for .module.ts files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('app.module.ts');

      expect(result).toBe(true);
    });

    it('should return true for .guard.ts files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('auth.guard.ts');

      expect(result).toBe(true);
    });

    it('should return true for .pipe.ts files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('format.pipe.ts');

      expect(result).toBe(true);
    });

    it('should return true for .directive.ts files', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'highlight.directive.ts'
      );

      expect(result).toBe(true);
    });

    it('should return false for regular .ts files', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile('utils.ts');

      expect(result).toBe(false);
    });

    it('should return false for .spec.ts files', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'app.component.spec.ts'
      );

      expect(result).toBe(false);
    });

    it('should return false for interface files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('user.interface.ts');

      expect(result).toBe(false);
    });

    it('should return false for model files', () => {
      const result =
        TestableAngularLawBase.testIsAngularSourceFile('user.model.ts');

      expect(result).toBe(false);
    });

    it('should handle file paths with directories', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'src/app/components/header/header.component.ts'
      );

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // getAngularVersion Tests
  // ==========================================================================

  describe('getAngularVersion', () => {
    it('should return null when no package.json exists', () => {
      const result = TestableAngularLawBase.testGetAngularVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return version when @angular/core is in dependencies', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@angular/core': '17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testGetAngularVersion(tempDir);

      expect(result).toBe('17.0.0');
    });

    it('should return version with caret prefix stripped', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          '@angular/core': '^18.1.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testGetAngularVersion(tempDir);

      expect(result).toContain('18');
    });

    it('should return null when no @angular/core dependency', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = TestableAngularLawBase.testGetAngularVersion(tempDir);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // createAngularRequiredResult Tests
  // ==========================================================================

  describe('createAngularRequiredResult', () => {
    it('should return null when check method returns true', () => {
      const result = TestableAngularLawBase.testCreateAngularRequiredResult(
        'Test Law',
        tempDir,
        () => true,
        mockContext
      );

      expect(result).toBeNull();
    });

    it('should return LawResult when check method returns false', () => {
      const result = TestableAngularLawBase.testCreateAngularRequiredResult(
        'Test Law',
        tempDir,
        () => false,
        mockContext
      );

      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
      expect(result?.violations).toEqual([]);
    });

    it('should include correct law name in result', () => {
      const result = TestableAngularLawBase.testCreateAngularRequiredResult(
        'Custom Angular Law',
        tempDir,
        () => false,
        mockContext
      );

      // Law names are converted to kebab-case by the createResult method
      expect(result?.lawName).toBe('custom-angular-law');
    });

    it('should handle Angular project check correctly', () => {
      // No Angular project configured
      const result = TestableAngularLawBase.testCreateAngularRequiredResult(
        'Angular Law',
        tempDir,
        root => TestableAngularLawBase.testHasAngularProject(root),
        mockContext
      );

      expect(result).not.toBeNull();
      expect(result?.passed).toBe(true);
    });

    it('should return null when Angular project exists', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const result = TestableAngularLawBase.testCreateAngularRequiredResult(
        'Angular Law',
        tempDir,
        root => TestableAngularLawBase.testHasAngularProject(root),
        mockContext
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should correctly identify full Angular project setup', () => {
      // Create Angular project structure
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '^17.0.0',
          '@ngrx/store': '^17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      expect(TestableAngularLawBase.testHasAngularProject(tempDir)).toBe(true);
      expect(TestableAngularLawBase.testHasNgrxStore(tempDir)).toBe(true);
      expect(TestableAngularLawBase.testGetAngularVersion(tempDir)).toBe(
        '^17.0.0'
      );
    });

    it('should handle projects without NgRx', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '^18.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      expect(TestableAngularLawBase.testHasAngularProject(tempDir)).toBe(true);
      expect(TestableAngularLawBase.testHasNgrxStore(tempDir)).toBe(false);
    });

    it('should correctly filter Angular source files from mixed file list', () => {
      const files = [
        'app.component.ts',
        'app.service.ts',
        'app.module.ts',
        'utils.ts',
        'types.ts',
        'header.directive.ts',
        'format.pipe.ts',
        'auth.guard.ts',
        'app.component.spec.ts',
        'user.model.ts',
      ];

      const angularFiles = files.filter(file =>
        TestableAngularLawBase.testIsAngularSourceFile(file)
      );

      expect(angularFiles).toEqual([
        'app.component.ts',
        'app.service.ts',
        'app.module.ts',
        'header.directive.ts',
        'format.pipe.ts',
        'auth.guard.ts',
      ]);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty directory', () => {
      expect(TestableAngularLawBase.testHasAngularProject(tempDir)).toBe(false);
      expect(TestableAngularLawBase.testHasNgrxStore(tempDir)).toBe(false);
      expect(TestableAngularLawBase.testGetAngularVersion(tempDir)).toBeNull();
    });

    it('should handle malformed package.json', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      FileUtils.writeFile(packageJsonPath, 'invalid json');

      // Should not throw
      expect(() =>
        TestableAngularLawBase.testHasAngularProject(tempDir)
      ).not.toThrow();
    });

    it('should handle file paths with special characters', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'src/app/my-component.component.ts'
      );

      expect(result).toBe(true);
    });

    it('should handle file paths with numbers', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'src/app/component1/component1.component.ts'
      );

      expect(result).toBe(true);
    });

    it('should handle deeply nested file paths', () => {
      const result = TestableAngularLawBase.testIsAngularSourceFile(
        'src/app/features/users/components/user-list/user-list.component.ts'
      );

      expect(result).toBe(true);
    });
  });
});
