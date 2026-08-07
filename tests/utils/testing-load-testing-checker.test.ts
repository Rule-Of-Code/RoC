/**
 * @fileoverview Tests for load-testing-checker.ts
 * @description Tests for the load testing setup checker utility
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';
import { LoadTestingChecker } from '../../src/utils/testing/load-testing-checker';

describe('utils/testing/load-testing-checker', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('load-testing-checker-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkLoadTestingSetup', () => {
    describe('when project has no load testing setup', () => {
      it('should return hasLoadTesting false', () => {
        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(false);
      });

      it('should return empty tools array', () => {
        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.tools).toEqual([]);
      });

      it('should return empty configFiles array', () => {
        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.configFiles).toEqual([]);
      });

      it('should return empty scriptFiles array', () => {
        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.scriptFiles).toEqual([]);
      });
    });

    describe('load testing configuration files detection', () => {
      it('should detect artillery.yml config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'artillery.yml'),
          'config:\n  target: http://localhost:3000'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('artillery.yml');
      });

      it('should detect artillery.yaml config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'artillery.yaml'),
          'config:\n  target: http://localhost:3000'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('artillery.yaml');
      });

      it('should detect artillery.config.js config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'artillery.config.js'),
          'module.exports = { target: "http://localhost:3000" };'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('artillery.config.js');
      });

      it('should detect k6.config.js config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'k6.config.js'),
          'export default { vus: 10, duration: "30s" };'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('k6.config.js');
      });

      it('should detect loadtest.config.js config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'loadtest.config.js'),
          'module.exports = { maxRequests: 1000 };'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('loadtest.config.js');
      });

      it('should detect performance.config.js config file', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'performance.config.js'),
          'module.exports = { scenarios: [] };'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('performance.config.js');
      });

      it('should detect multiple config files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'artillery.yml'),
          'config:\n  target: http://localhost'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'k6.config.js'),
          'export default {};'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(2);
      });

      it('should find config files in subdirectories (non-test directories)', () => {
        // Note: "tests" directories may be filtered by DirectoryScanner
        // Use a non-test directory name like "performance"
        const perfDir = PathOperations.join(tempDir, 'performance');
        FileUtils.createDirectory(perfDir);
        FileUtils.writeFile(
          PathOperations.join(perfDir, 'artillery.yml'),
          'config:\n  target: http://localhost'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.configFiles.length).toBe(1);
        expect(result.configFiles[0]).toContain('performance');
      });
    });

    describe('load testing script files detection', () => {
      it('should detect load test files with "load" in name', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'load-test.js'),
          'export function loadTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('load-test.js');
      });

      it('should detect load test TypeScript files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'load-test.ts'),
          'export function loadTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('load-test.ts');
      });

      it('should detect artillery script files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'artillery-scenario.yml'),
          'scenarios:\n  - flow: []'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBeGreaterThanOrEqual(1);
      });

      it('should detect k6 script files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'k6-test.js'),
          'import http from "k6/http";'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('k6-test.js');
      });

      it('should detect performance script files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'performance-script.ts'),
          'export async function perfTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('performance-script.ts');
      });

      it('should detect stress test files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'stress-test.js'),
          'export function stressTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('stress-test.js');
      });

      it('should detect multiple script files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'load-test.js'),
          'test'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'stress-test.ts'),
          'test'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'k6-benchmark.js'),
          'test'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(3);
      });

      it('should find script files in subdirectories (non-test directories)', () => {
        // Note: "tests" directories may be filtered by DirectoryScanner
        // Use a non-test directory name
        const perfDir = PathOperations.join(tempDir, 'performance');
        FileUtils.createDirectory(perfDir);
        FileUtils.writeFile(
          PathOperations.join(perfDir, 'load-test.ts'),
          'export function loadTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
        expect(result.scriptFiles[0]).toContain('performance');
      });
    });

    describe('package.json dependencies detection', () => {
      it('should detect artillery dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              artillery: '^2.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('artillery');
      });

      it('should detect k6 dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              k6: '^0.45.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('k6');
      });

      it('should detect loadtest dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              loadtest: '^5.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('loadtest');
      });

      it('should detect autocannon dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              autocannon: '^7.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('autocannon');
      });

      it('should detect clinic dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              clinic: '^12.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('clinic');
      });

      it('should detect lighthouse dependency', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              lighthouse: '^10.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('lighthouse');
      });

      it('should detect multiple load testing tools', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              artillery: '^2.0.0',
              k6: '^0.45.0',
              autocannon: '^7.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools.length).toBe(3);
        expect(result.tools).toContain('artillery');
        expect(result.tools).toContain('k6');
        expect(result.tools).toContain('autocannon');
      });

      it('should detect tools in dependencies (not just devDependencies)', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            dependencies: {
              artillery: '^2.0.0',
            },
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools).toContain('artillery');
      });
    });

    describe('combined detection', () => {
      it('should return all detected components', () => {
        // Create package.json with tools
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              artillery: '^2.0.0',
              autocannon: '^7.0.0',
            },
          })
        );

        // Create config files
        // Note: Using performance.config.js which doesn't match any script pattern
        // - load.*test.* would match "loadtest"
        // - k6.* would match "k6.config.js"
        // - artillery.* would match artillery files
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'performance.config.js'),
          'module.exports = { scenarios: [] };'
        );

        // Create script files (using stress-test which is clearly a script)
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'stress-test.ts'),
          'export function stressTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools.length).toBe(2);
        expect(result.configFiles.length).toBe(1);
        expect(result.scriptFiles.length).toBe(1);
      });

      it('should report hasLoadTesting true if any component is found', () => {
        // Only script files, no tools or config
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'stress-test.js'),
          'export function stressTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.tools.length).toBe(0);
        expect(result.configFiles.length).toBe(0);
        expect(result.scriptFiles.length).toBe(1);
      });
    });

    describe('directory skipping behavior', () => {
      it('should not search in node_modules directory', () => {
        const nodeModules = PathOperations.join(tempDir, 'node_modules');
        FileUtils.createDirectory(nodeModules);
        FileUtils.writeFile(
          PathOperations.join(nodeModules, 'artillery.yml'),
          'config: {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.configFiles.length).toBe(0);
      });

      it('should not search in dist directory', () => {
        const dist = PathOperations.join(tempDir, 'dist');
        FileUtils.createDirectory(dist);
        FileUtils.writeFile(PathOperations.join(dist, 'load-test.js'), 'test');

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.scriptFiles.length).toBe(0);
      });

      it('should not search in .git directory', () => {
        const git = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(git);
        FileUtils.writeFile(PathOperations.join(git, 'k6.config.js'), 'test');

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.configFiles.length).toBe(0);
      });

      it('should not search in coverage directory', () => {
        const coverage = PathOperations.join(tempDir, 'coverage');
        FileUtils.createDirectory(coverage);
        FileUtils.writeFile(
          PathOperations.join(coverage, 'performance-script.ts'),
          'test'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.scriptFiles.length).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty project gracefully', () => {
        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result).toBeDefined();
        expect(result.hasLoadTesting).toBe(false);
        expect(Array.isArray(result.tools)).toBe(true);
        expect(Array.isArray(result.configFiles)).toBe(true);
        expect(Array.isArray(result.scriptFiles)).toBe(true);
      });

      it('should handle project with only directories', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
        FileUtils.createDirectory(PathOperations.join(tempDir, 'tests'));

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(false);
      });

      it('should handle invalid package.json gracefully', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          'invalid json {'
        );

        expect(() => {
          LoadTestingChecker.checkLoadTestingSetup(tempDir);
        }).not.toThrow();
      });

      it('should handle package.json without dependencies', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          })
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.tools.length).toBe(0);
      });

      it('should handle deeply nested script files (non-test directories)', () => {
        // Note: "tests" directories may be filtered by DirectoryScanner
        const deepPath = PathOperations.join(
          tempDir,
          'performance',
          'scenarios',
          'api'
        );
        FileUtils.createDirectory(deepPath);
        FileUtils.writeFile(
          PathOperations.join(deepPath, 'load-test.ts'),
          'export function loadTest() {}'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
      });
    });

    describe('case sensitivity for script detection', () => {
      it('should match load test files case-insensitively', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'LOAD-TEST.js'),
          'test'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
      });

      it('should match k6 files case-insensitively', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, 'K6-test.ts'), 'test');

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
      });

      it('should match Artillery files case-insensitively', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'ARTILLERY-scenario.yml'),
          'test'
        );

        const result = LoadTestingChecker.checkLoadTestingSetup(tempDir);

        expect(result.hasLoadTesting).toBe(true);
        expect(result.scriptFiles.length).toBe(1);
      });
    });
  });
});
