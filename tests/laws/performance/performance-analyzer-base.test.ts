/**
 * Tests for PerformanceAnalyzerBase
 *
 * Tests for base class methods used by all CDN caching strategy analyzers.
 */
import { PerformanceAnalyzerBase } from '../../../src/laws/performance/cdn-caching-strategy/services/performance-analyzer-base';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceAnalyzerBase', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('performance-analyzer-base-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('safeCheckFileExists', () => {
    it('should return true when file exists', () => {
      const testFile = PathOperations.join(tempDir, 'test-file.txt');
      FileSystemOperations.writeFile(testFile, 'test content');

      // Access protected method via subclass pattern
      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeCheckFileExists: (path: string) => boolean;
        }
      ).safeCheckFileExists(testFile);

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', () => {
      const nonExistentFile = PathOperations.join(tempDir, 'non-existent.txt');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeCheckFileExists: (path: string) => boolean;
        }
      ).safeCheckFileExists(nonExistentFile);

      expect(result).toBe(false);
    });

    it('should return false when file check throws error', () => {
      const existsSpy = jest
        .spyOn(FileUtils, 'exists')
        .mockImplementation(() => {
          throw new Error('Permission denied');
        });

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeCheckFileExists: (path: string) => boolean;
        }
      ).safeCheckFileExists('/invalid/path');

      expect(result).toBe(false);

      // Restore immediately to avoid affecting afterEach cleanup
      existsSpy.mockRestore();
    });
  });

  describe('safeReadJsonFile', () => {
    it('should return parsed JSON when file is valid', () => {
      const jsonFile = PathOperations.join(tempDir, 'test.json');
      const testData = { key: 'value', nested: { num: 42 } };
      FileSystemOperations.writeJsonFile(jsonFile, testData);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadJsonFile: (path: string) => Record<string, unknown> | null;
        }
      ).safeReadJsonFile(jsonFile);

      expect(result).toEqual(testData);
    });

    it('should return null when file does not exist', () => {
      const nonExistentFile = PathOperations.join(tempDir, 'non-existent.json');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadJsonFile: (path: string) => Record<string, unknown> | null;
        }
      ).safeReadJsonFile(nonExistentFile);

      expect(result).toBeNull();
    });

    it('should return null when file contains invalid JSON', () => {
      const invalidJsonFile = PathOperations.join(tempDir, 'invalid.json');
      FileSystemOperations.writeFile(invalidJsonFile, 'not valid json { }');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadJsonFile: (path: string) => Record<string, unknown> | null;
        }
      ).safeReadJsonFile(invalidJsonFile);

      expect(result).toBeNull();
    });
  });

  describe('safeReadFile', () => {
    it('should return file content when file exists', () => {
      const testFile = PathOperations.join(tempDir, 'test-content.txt');
      const content = 'Hello, World!';
      FileSystemOperations.writeFile(testFile, content);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadFile: (
            path: string,
            encoding?: BufferEncoding
          ) => string | null;
        }
      ).safeReadFile(testFile);

      expect(result).toBe(content);
    });

    it('should return empty string when file does not exist (fallbackToEmpty default)', () => {
      const nonExistentFile = PathOperations.join(tempDir, 'non-existent.txt');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadFile: (
            path: string,
            encoding?: BufferEncoding
          ) => string | null;
        }
      ).safeReadFile(nonExistentFile);

      // FileUtils.readFile has fallbackToEmpty=true by default
      expect(result).toBe('');
    });

    it('should use specified encoding', () => {
      const testFile = PathOperations.join(tempDir, 'encoded.txt');
      FileSystemOperations.writeFile(testFile, 'Test content');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          safeReadFile: (
            path: string,
            encoding?: BufferEncoding
          ) => string | null;
        }
      ).safeReadFile(testFile, 'utf8');

      expect(result).toBe('Test content');
    });
  });

  describe('iterateAngularProjects', () => {
    it('should return false when angular.json does not exist', () => {
      const callback = jest.fn().mockReturnValue(true);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          iterateAngularProjects: (
            projectRoot: string,
            callback: (project: unknown, name: string) => boolean
          ) => boolean;
        }
      ).iterateAngularProjects(tempDir, callback);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false when angular.json has no projects', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, { version: 1 });

      const callback = jest.fn().mockReturnValue(true);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          iterateAngularProjects: (
            projectRoot: string,
            callback: (project: unknown, name: string) => boolean
          ) => boolean;
        }
      ).iterateAngularProjects(tempDir, callback);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should iterate over projects and return true when callback returns true', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: { optimization: true },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const callback = jest.fn().mockReturnValue(true);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          iterateAngularProjects: (
            projectRoot: string,
            callback: (project: unknown, name: string) => boolean
          ) => boolean;
        }
      ).iterateAngularProjects(tempDir, callback);

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(
        angularJson.projects['my-app'],
        'my-app'
      );
    });

    it('should iterate over multiple projects until callback returns true', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'app-one': { architect: {} },
          'app-two': { architect: {} },
          'app-three': { architect: {} },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const callback = jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          iterateAngularProjects: (
            projectRoot: string,
            callback: (project: unknown, name: string) => boolean
          ) => boolean;
        }
      ).iterateAngularProjects(tempDir, callback);

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should return false when no callback returns true', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'app-one': { architect: {} },
          'app-two': { architect: {} },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const callback = jest.fn().mockReturnValue(false);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          iterateAngularProjects: (
            projectRoot: string,
            callback: (project: unknown, name: string) => boolean
          ) => boolean;
        }
      ).iterateAngularProjects(tempDir, callback);

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFirebaseHostingConfig', () => {
    it('should return null when firebase.json does not exist', () => {
      const result = (
        PerformanceAnalyzerBase as unknown as {
          getFirebaseHostingConfig: (
            projectRoot: string
          ) => Record<string, unknown> | null;
        }
      ).getFirebaseHostingConfig(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when firebase.json has no hosting', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      FileSystemOperations.writeJsonFile(firebaseJsonPath, {
        functions: { source: 'functions' },
      });

      const result = (
        PerformanceAnalyzerBase as unknown as {
          getFirebaseHostingConfig: (
            projectRoot: string
          ) => Record<string, unknown> | null;
        }
      ).getFirebaseHostingConfig(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when hosting is not an object', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      FileSystemOperations.writeJsonFile(firebaseJsonPath, {
        hosting: 'invalid',
      });

      const result = (
        PerformanceAnalyzerBase as unknown as {
          getFirebaseHostingConfig: (
            projectRoot: string
          ) => Record<string, unknown> | null;
        }
      ).getFirebaseHostingConfig(tempDir);

      expect(result).toBeNull();
    });

    it('should return hosting config when valid', () => {
      const firebaseJsonPath = PathOperations.join(tempDir, 'firebase.json');
      const hostingConfig = { public: 'dist', headers: [] };
      FileSystemOperations.writeJsonFile(firebaseJsonPath, {
        hosting: hostingConfig,
      });

      const result = (
        PerformanceAnalyzerBase as unknown as {
          getFirebaseHostingConfig: (
            projectRoot: string
          ) => Record<string, unknown> | null;
        }
      ).getFirebaseHostingConfig(tempDir);

      expect(result).toEqual(hostingConfig);
    });
  });

  describe('readAngularJsonContent', () => {
    it('should return null when angular.json does not exist', () => {
      const result = (
        PerformanceAnalyzerBase as unknown as {
          readAngularJsonContent: (projectRoot: string) => string | null;
        }
      ).readAngularJsonContent(tempDir);

      expect(result).toBeNull();
    });

    it('should return file content when angular.json exists', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const content = '{"version": 1}';
      FileSystemOperations.writeFile(angularJsonPath, content);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readAngularJsonContent: (projectRoot: string) => string | null;
        }
      ).readAngularJsonContent(tempDir);

      expect(result).toBe(content);
    });
  });

  describe('readServerConfigFile', () => {
    it('should return null when file does not exist', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'nginx.conf');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readServerConfigFile: (path: string) => string | null;
        }
      ).readServerConfigFile(nonExistentPath);

      expect(result).toBeNull();
    });

    it('should return file content when file exists', () => {
      const serverConfigPath = PathOperations.join(tempDir, 'nginx.conf');
      const content = 'server { listen 80; }';
      FileSystemOperations.writeFile(serverConfigPath, content);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readServerConfigFile: (path: string) => string | null;
        }
      ).readServerConfigFile(serverConfigPath);

      expect(result).toBe(content);
    });
  });

  describe('readWebpackConfigFile', () => {
    it('should return null when file does not exist', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'webpack.config.js');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readWebpackConfigFile: (path: string) => string | null;
        }
      ).readWebpackConfigFile(nonExistentPath);

      expect(result).toBeNull();
    });

    it('should return file content when file exists', () => {
      const webpackConfigPath = PathOperations.join(
        tempDir,
        'webpack.config.js'
      );
      const content = 'module.exports = { entry: "./src/index.js" };';
      FileSystemOperations.writeFile(webpackConfigPath, content);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readWebpackConfigFile: (path: string) => string | null;
        }
      ).readWebpackConfigFile(webpackConfigPath);

      expect(result).toBe(content);
    });
  });

  describe('readFileAbsolutePath', () => {
    it('should return file content when file exists', () => {
      const testFile = PathOperations.join(tempDir, 'absolute-path-test.txt');
      const content = 'absolute path content';
      FileSystemOperations.writeFile(testFile, content);

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readFileAbsolutePath: (
            path: string,
            encoding?: BufferEncoding
          ) => string | null;
        }
      ).readFileAbsolutePath(testFile);

      expect(result).toBe(content);
    });

    it('should return empty string when file does not exist (fallbackToEmpty default)', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent.txt');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          readFileAbsolutePath: (
            path: string,
            encoding?: BufferEncoding
          ) => string | null;
        }
      ).readFileAbsolutePath(nonExistentPath);

      // FileUtils.readFile has fallbackToEmpty=true by default
      expect(result).toBe('');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      const testFile = PathOperations.join(tempDir, 'exists-test.txt');
      FileSystemOperations.writeFile(testFile, 'content');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          fileExists: (path: string) => boolean;
        }
      ).fileExists(testFile);

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent.txt');

      const result = (
        PerformanceAnalyzerBase as unknown as {
          fileExists: (path: string) => boolean;
        }
      ).fileExists(nonExistentPath);

      expect(result).toBe(false);
    });
  });
});
