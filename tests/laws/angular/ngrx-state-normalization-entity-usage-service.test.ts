/**
 * @fileoverview Tests for NgRxStateNormalizationEntityUsageService
 * @description Comprehensive tests for the NgRx entity usage analyzer service
 */
import { NgRxStateNormalizationEntityUsageService } from '../../../src/laws/angular/ngrx-state-normalization-mandate/services/entity-usage.service';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NgRxStateNormalizationEntityUsageService', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('ngrx-entity-usage-test-');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('checkEntityUsage()', () => {
    describe('result structure', () => {
      it('should return complete entity usage result', () => {
        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result).toHaveProperty('hasEntityAdapter');
        expect(result).toHaveProperty('entityFiles');
      });

      it('should return boolean for hasEntityAdapter', () => {
        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(typeof result.hasEntityAdapter).toBe('boolean');
      });

      it('should return array for entityFiles', () => {
        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(Array.isArray(result.entityFiles)).toBe(true);
      });

      it('should optionally have version property', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result).toHaveProperty('version');
      });
    });

    describe('package detection', () => {
      it('should detect @ngrx/entity in dependencies', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(true);
        expect(result.version).toBe('^17.0.0');
      });

      it('should detect @ngrx/entity in devDependencies', () => {
        const packageJson = {
          name: 'test-project',
          devDependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(true);
      });

      it('should return false when @ngrx/entity not installed', () => {
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

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(false);
        expect(result.entityFiles).toHaveLength(0);
      });

      it('should return false when no package.json exists', () => {
        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(false);
      });
    });

    describe('version extraction', () => {
      it('should extract version with caret', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.2.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.version).toBe('^17.2.0');
      });

      it('should extract version with tilde', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '~17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.version).toBe('~17.0.0');
      });

      it('should extract exact version', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.version).toBe('17.0.0');
      });
    });

    describe('entityFiles', () => {
      it('should return empty array when package installed but no specific files scanned', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/entity': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.entityFiles).toHaveLength(0);
      });

      it('should return empty array when not installed', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {},
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.entityFiles).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should handle non-existent directory', () => {
        const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(
            nonExistentPath
          );

        expect(result.hasEntityAdapter).toBe(false);
        expect(result.entityFiles).toHaveLength(0);
      });

      it('should handle empty package.json', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(false);
      });

      it('should handle malformed package.json', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          'not valid json'
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(false);
      });

      it('should handle empty string path', () => {
        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage('');

        expect(result).toBeDefined();
        expect(result.hasEntityAdapter).toBe(false);
      });
    });

    describe('multiple ngrx packages scenario', () => {
      it('should find @ngrx/entity among many ngrx dependencies', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store': '^17.0.0',
            '@ngrx/effects': '^17.0.0',
            '@ngrx/entity': '^17.0.0',
            '@ngrx/store-devtools': '^17.0.0',
            '@ngrx/router-store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(true);
      });

      it('should correctly identify when only @ngrx/store is installed', () => {
        const packageJson = {
          name: 'test-project',
          dependencies: {
            '@ngrx/store': '^17.0.0',
          },
        };
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify(packageJson)
        );

        const result =
          NgRxStateNormalizationEntityUsageService.checkEntityUsage(tempDir);

        expect(result.hasEntityAdapter).toBe(false);
      });
    });
  });
});
