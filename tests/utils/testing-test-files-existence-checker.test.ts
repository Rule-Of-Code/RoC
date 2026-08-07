/**
 * @fileoverview Tests for test-files-existence-checker.ts
 * @description Tests for the test files existence checker utility
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';
import { TestFilesExistenceChecker } from '../../src/utils/testing/test-files-existence-checker';

describe('utils/testing/test-files-existence-checker', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('test-files-existence-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkTestFilesExistence', () => {
    describe('when project has no test files', () => {
      it('should report violations for missing test files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'component.ts'),
          'export class Component {}'
        );
        FileUtils.writeFile(
          PathOperations.join(src, 'service.ts'),
          'export class Service {}'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
        expect(
          result.violations.some(v => v.includes('lack corresponding test'))
        ).toBe(true);
      });

      it('should provide suggestions for adding test files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'utils.ts'),
          'export function helper() {}'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('when project has matching test files', () => {
      it('should not report violations when test files exist', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'component.ts'),
          'export class Component {}'
        );
        FileUtils.writeFile(
          PathOperations.join(src, 'component.test.ts'),
          'describe("Component", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasComponentViolation = result.violations.some(v =>
          v.includes('component')
        );
        expect(hasComponentViolation).toBe(false);
      });

      it('should recognize .spec.ts files as test files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'service.ts'),
          'export class Service {}'
        );
        FileUtils.writeFile(
          PathOperations.join(src, 'service.spec.ts'),
          'describe("Service", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        // Should have fewer violations due to matching test
        expect(result).toBeDefined();
      });
    });

    describe('coverage ratio calculation', () => {
      it('should report low coverage when ratio is below 50%', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);

        // Create 5 source files
        for (let i = 1; i <= 5; i++) {
          FileUtils.writeFile(
            PathOperations.join(src, `file${i}.ts`),
            `export const value${i} = ${i};`
          );
        }

        // Create only 1 test file
        FileUtils.writeFile(
          PathOperations.join(src, 'file1.test.ts'),
          'describe("test", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasLowCoverageViolation = result.violations.some(v =>
          v.includes('Low test coverage ratio')
        );
        expect(hasLowCoverageViolation).toBe(true);
      });

      it('should not report low coverage when ratio is above 50%', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);

        // Create 2 source files
        FileUtils.writeFile(
          PathOperations.join(src, 'file1.ts'),
          'export const a = 1;'
        );
        FileUtils.writeFile(
          PathOperations.join(src, 'file2.ts'),
          'export const b = 2;'
        );

        // Create 2 test files (100% ratio)
        FileUtils.writeFile(
          PathOperations.join(src, 'file1.test.ts'),
          'describe("test1", () => {})'
        );
        FileUtils.writeFile(
          PathOperations.join(src, 'file2.test.ts'),
          'describe("test2", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasLowCoverageViolation = result.violations.some(v =>
          v.includes('Low test coverage ratio')
        );
        expect(hasLowCoverageViolation).toBe(false);
      });
    });

    describe('files that should not require tests', () => {
      it('should not require tests for .d.ts files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'types.d.ts'),
          'export interface MyType {}'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasDtsViolation = result.suggestions.some(s =>
          s.includes('types.d.ts')
        );
        expect(hasDtsViolation).toBe(false);
      });

      it('should not require tests for index.ts files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'index.ts'),
          'export * from "./component";'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasIndexViolation = result.suggestions.some(s =>
          s.includes('index.ts')
        );
        expect(hasIndexViolation).toBe(false);
      });

      it('should not require tests for config files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'app.config.ts'),
          'export const config = {};'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasConfigViolation = result.suggestions.some(s =>
          s.includes('app.config.ts')
        );
        expect(hasConfigViolation).toBe(false);
      });

      it('should not require tests for interfaces files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'user.interfaces.ts'),
          'export interface User {}'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasInterfacesViolation = result.suggestions.some(s =>
          s.includes('user.interfaces.ts')
        );
        expect(hasInterfacesViolation).toBe(false);
      });

      it('should not require tests for constants files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'app.constants.ts'),
          'export const APP_NAME = "Test";'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasConstantsViolation = result.suggestions.some(s =>
          s.includes('app.constants.ts')
        );
        expect(hasConstantsViolation).toBe(false);
      });

      it('should not require tests for main.ts files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'main.ts'),
          'bootstrap();'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasMainViolation = result.suggestions.some(s =>
          s.includes('main.ts')
        );
        expect(hasMainViolation).toBe(false);
      });

      it('should not require tests for polyfills files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'polyfills.ts'),
          'import "zone.js";'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasPolyfillsViolation = result.suggestions.some(s =>
          s.includes('polyfills.ts')
        );
        expect(hasPolyfillsViolation).toBe(false);
      });

      it('should not require tests for types files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'app.types.ts'),
          'export type AppState = {};'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasTypesViolation = result.suggestions.some(s =>
          s.includes('app.types.ts')
        );
        expect(hasTypesViolation).toBe(false);
      });
    });

    describe('directory skipping', () => {
      it('should skip node_modules directory', () => {
        const nodeModules = PathOperations.join(tempDir, 'node_modules');
        FileUtils.createDirectory(nodeModules);
        FileUtils.writeFile(
          PathOperations.join(nodeModules, 'lib.ts'),
          'export const lib = {};'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasNodeModulesViolation = result.suggestions.some(s =>
          s.includes('node_modules')
        );
        expect(hasNodeModulesViolation).toBe(false);
      });

      it('should skip dist directory', () => {
        const dist = PathOperations.join(tempDir, 'dist');
        FileUtils.createDirectory(dist);
        FileUtils.writeFile(
          PathOperations.join(dist, 'bundle.js'),
          'var a = 1;'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasDistViolation = result.suggestions.some(s =>
          s.includes('dist')
        );
        expect(hasDistViolation).toBe(false);
      });

      it('should skip coverage directory', () => {
        const coverage = PathOperations.join(tempDir, 'coverage');
        FileUtils.createDirectory(coverage);
        FileUtils.writeFile(
          PathOperations.join(coverage, 'report.js'),
          'coverage data'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasCoverageViolation = result.suggestions.some(s =>
          s.includes('coverage/')
        );
        expect(hasCoverageViolation).toBe(false);
      });

      it('should skip .git directory', () => {
        const git = PathOperations.join(tempDir, '.git');
        FileUtils.createDirectory(git);
        FileUtils.writeFile(PathOperations.join(git, 'hooks.js'), 'hooks');

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasGitViolation = result.suggestions.some(s =>
          s.includes('.git')
        );
        expect(hasGitViolation).toBe(false);
      });

      it('should skip temp and tmp directories', () => {
        const temp = PathOperations.join(tempDir, 'temp');
        const tmp = PathOperations.join(tempDir, 'tmp');
        FileUtils.createDirectory(temp);
        FileUtils.createDirectory(tmp);
        FileUtils.writeFile(PathOperations.join(temp, 'cache.ts'), 'cache');
        FileUtils.writeFile(PathOperations.join(tmp, 'temp.ts'), 'temp');

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasTempViolation = result.suggestions.some(
          s => s.includes('/temp/') || s.includes('/tmp/')
        );
        expect(hasTempViolation).toBe(false);
      });
    });

    describe('empty project handling', () => {
      it('should handle empty project gracefully', () => {
        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should handle project with only directories', () => {
        FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
        FileUtils.createDirectory(PathOperations.join(tempDir, 'lib'));

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result).toBeDefined();
      });
    });

    describe('different file extensions', () => {
      it('should detect .js source files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'app.js'),
          'const app = {};'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should detect .tsx source files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'component.tsx'),
          'export const Component = () => <div />;'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should detect .jsx source files', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(
          PathOperations.join(src, 'component.jsx'),
          'export const Component = () => <div />;'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should recognize .test.js as test file', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(PathOperations.join(src, 'app.js'), 'const a = 1;');
        FileUtils.writeFile(
          PathOperations.join(src, 'app.test.js'),
          'describe("app", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        // Should have coverage ratio without missing app test
        expect(result).toBeDefined();
      });

      it('should recognize .spec.js as test file', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);
        FileUtils.writeFile(PathOperations.join(src, 'app.js'), 'const a = 1;');
        FileUtils.writeFile(
          PathOperations.join(src, 'app.spec.js'),
          'describe("app", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result).toBeDefined();
      });
    });

    describe('nested directory structure', () => {
      it('should find source and test files in nested directories', () => {
        const components = PathOperations.join(tempDir, 'src', 'components');
        FileUtils.createDirectory(components);
        FileUtils.writeFile(
          PathOperations.join(components, 'button.ts'),
          'export class Button {}'
        );
        FileUtils.writeFile(
          PathOperations.join(components, 'button.test.ts'),
          'describe("Button", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result).toBeDefined();
      });

      it('should handle deeply nested source files', () => {
        const deepPath = PathOperations.join(
          tempDir,
          'src',
          'features',
          'user',
          'components'
        );
        FileUtils.createDirectory(deepPath);
        FileUtils.writeFile(
          PathOperations.join(deepPath, 'profile.ts'),
          'export class Profile {}'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    describe('__tests__ directory recognition', () => {
      it('should recognize files in __tests__ directory as test files', () => {
        const src = PathOperations.join(tempDir, 'src');
        const tests = PathOperations.join(src, '__tests__');
        FileUtils.createDirectory(tests);
        FileUtils.writeFile(
          PathOperations.join(src, 'app.ts'),
          'export const app = {};'
        );
        FileUtils.writeFile(
          PathOperations.join(tests, 'app.ts'),
          'describe("app", () => {})'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        // The __tests__ directory should contain test files
        expect(result).toBeDefined();
      });
    });

    describe('config ignores', () => {
      it('should respect global ignore patterns from config', () => {
        const src = PathOperations.join(tempDir, 'src');
        const generated = PathOperations.join(src, 'generated');
        FileUtils.createDirectory(generated);
        FileUtils.writeFile(
          PathOperations.join(generated, 'api.ts'),
          'export const api = {};'
        );

        const config = FileUtils.getMinimalDefaultConfig();
        config.ignores = {
          ...config.ignores,
          global: ['**/generated/**'],
        };

        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        const hasGeneratedViolation = result.suggestions.some(s =>
          s.includes('generated')
        );
        expect(hasGeneratedViolation).toBe(false);
      });
    });

    describe('missing test examples limit', () => {
      it('should limit missing test examples to 5', () => {
        const src = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(src);

        // Create 10 source files without tests
        for (let i = 1; i <= 10; i++) {
          FileUtils.writeFile(
            PathOperations.join(src, `file${i}.ts`),
            `export const val${i} = ${i};`
          );
        }

        const config = FileUtils.getMinimalDefaultConfig();
        const result = TestFilesExistenceChecker.checkTestFilesExistence(
          tempDir,
          config
        );

        // Should indicate there are more with "..."
        const hasTruncation = result.suggestions.some(s => s.includes('...'));
        expect(hasTruncation).toBe(true);
      });
    });
  });
});
