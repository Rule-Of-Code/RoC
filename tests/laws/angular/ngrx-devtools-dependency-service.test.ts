/**
 * @fileoverview Tests for NgRxDevToolsDependencyService
 * @description Comprehensive tests for the NgRx DevTools dependency checker service
 */
import { NgRxDevToolsDependencyService } from '../../../src/laws/angular/ngrx-devtools-integration-mandate/services/dependency.service';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxDevToolsDependencyService', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-devtools-dep-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('checkDependency()', () => {
    describe('result structure', () => {
      it('should return complete dependency check result', () => {
        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result).toHaveProperty('installed');
      });

      it('should return boolean for installed', () => {
        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(typeof result.installed).toBe('boolean');
      });

      it('should optionally have version property', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result).toHaveProperty('version');
      });
    });

    describe('dependencies detection', () => {
      it('should detect @ngrx/store-devtools in dependencies', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(true);
        expect(result.version).toBe('^17.0.0');
      });

      it('should detect @ngrx/store-devtools in devDependencies', () => {
        const packageJson = {
          name: 'test-project',
          devDependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(true);
        expect(result.version).toBe('^17.0.0');
      });

      it('should return not installed when package not found', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@angular/core': '^17.0.0',
            '@ngrx/store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
        expect(result.version).toBeUndefined();
      });

      it('should return not installed when no package.json', () => {
        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
      });
    });

    describe('version extraction', () => {
      it('should extract version with caret', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.version).toBe('^17.0.0');
      });

      it('should extract version with tilde', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '~17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.version).toBe('~17.0.0');
      });

      it('should extract exact version', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.version).toBe('17.0.0');
      });

      it('should extract version range', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': '>=17.0.0 <18.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.version).toBe('>=17.0.0 <18.0.0');
      });

      it('should handle latest tag', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store-devtools': 'latest',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(true);
        expect(result.version).toBe('latest');
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          NgRxDevToolsDependencyService.checkDependency(nonExistentPath);

        expect(result.installed).toBe(false);
      });

      it('should handle empty package.json', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
      });

      it('should handle malformed package.json', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          'not valid json'
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
      });

      it('should handle package.json without dependencies', () => {
        const packageJson = {
          name: 'test-project',
          version: '1.0.0',
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
      });

      it('should handle empty string path', () => {
        const result = NgRxDevToolsDependencyService.checkDependency('');

        expect(result).toBeDefined();
        expect(result.installed).toBe(false);
      });
    });

    describe('multiple packages scenario', () => {
      it('should find @ngrx/store-devtools among many dependencies', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@angular/core': '^17.0.0',
            '@angular/common': '^17.0.0',
            '@ngrx/store': '^17.0.0',
            '@ngrx/effects': '^17.0.0',
            '@ngrx/store-devtools': '^17.0.0',
            '@ngrx/entity': '^17.0.0',
            rxjs: '^7.0.0',
            'zone.js': '^0.14.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(true);
        expect(result.version).toBe('^17.0.0');
      });

      it('should correctly identify when only @ngrx/store is installed', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store': '^17.0.0',
            '@ngrx/effects': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result = NgRxDevToolsDependencyService.checkDependency(tempDir);

        expect(result.installed).toBe(false);
      });
    });
  });
});
