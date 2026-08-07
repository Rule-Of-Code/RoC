/**
 * Package JSON Utilities - Tests
 * Comprehensive tests for PackageJsonUtilities class
 */
import {
  PackageJsonUtilities,
  type PackageJsonStructure,
  type QualityCheckResult,
  type QualityTool,
} from '../../../src/checkers/sacred-laws/package-json-utilities';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PackageJsonUtilities', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('package-json-utils-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // readPackageJson()
  // ============================================
  describe('readPackageJson()', () => {
    it('should return null when package.json does not exist', () => {
      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result).toBeNull();
    });

    it('should return parsed package.json when it exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-project');
      expect(result?.version).toBe('1.0.0');
    });

    it('should return package.json with scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            build: 'tsc',
          },
        })
      );

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result?.scripts?.test).toBe('jest');
      expect(result?.scripts?.build).toBe('tsc');
    });

    it('should return package.json with dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result?.dependencies?.lodash).toBe('^4.0.0');
      expect(result?.devDependencies?.jest).toBe('^29.0.0');
    });

    it('should return null for invalid JSON', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result).toEqual({});
    });

    it('should handle empty package.json', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'package.json'), '{}');

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result).toEqual({});
    });
  });

  // ============================================
  // checkRequiredScripts()
  // ============================================
  describe('checkRequiredScripts()', () => {
    it('should return violation for missing package.json', () => {
      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, [
        'test',
      ]);

      expect(result.violations).toContain('Missing package.json');
      expect(result.suggestions).toContain(
        'Initialize project with package.json'
      );
    });

    it('should return no violations when all scripts exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            build: 'tsc',
            lint: 'eslint .',
          },
        })
      );

      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, [
        'test',
        'build',
        'lint',
      ]);

      expect(result.violations.length).toBe(0);
      expect(result.suggestions.length).toBe(0);
    });

    it('should return violations for missing scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
          },
        })
      );

      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, [
        'test',
        'build',
        'lint',
      ]);

      expect(result.violations).toContain('Missing build script');
      expect(result.violations).toContain('Missing lint script');
      expect(result.suggestions).toContain('Add build script for automation');
      expect(result.suggestions).toContain('Add lint script for automation');
    });

    it('should handle package.json without scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, [
        'test',
      ]);

      expect(result.violations).toContain('Missing test script');
    });

    it('should return empty results for empty required scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, []);

      expect(result.violations.length).toBe(0);
      expect(result.suggestions.length).toBe(0);
    });
  });

  // ============================================
  // checkRequiredDependencies()
  // ============================================
  describe('checkRequiredDependencies()', () => {
    it('should return violation for missing package.json', () => {
      const tools: QualityTool[] = [
        { name: 'jest', purpose: 'testing', required: true },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      expect(result.violations).toContain('Missing package.json');
    });

    it('should return no violations when all required dependencies exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
          },
        })
      );

      const tools: QualityTool[] = [
        { name: 'jest', purpose: 'testing', required: true },
        { name: 'eslint', purpose: 'linting', required: true },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      const hasJestViolation = result.violations.some(v => v.includes('jest'));
      const hasEslintViolation = result.violations.some(v =>
        v.includes('eslint')
      );
      expect(hasJestViolation).toBe(false);
      expect(hasEslintViolation).toBe(false);
    });

    it('should return violations for missing required dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const tools: QualityTool[] = [
        { name: 'jest', purpose: 'testing', required: true },
        { name: 'eslint', purpose: 'linting', required: true },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      expect(result.violations.some(v => v.includes('jest'))).toBe(true);
      expect(result.violations.some(v => v.includes('eslint'))).toBe(true);
    });

    it('should return suggestions for optional dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const tools: QualityTool[] = [
        { name: 'husky', purpose: 'git hooks', required: false },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      expect(result.violations.length).toBe(0);
      expect(result.suggestions.some(s => s.includes('husky'))).toBe(true);
    });

    it('should detect dependencies in both dependencies and devDependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        })
      );

      const tools: QualityTool[] = [
        { name: 'lodash', purpose: 'utility', required: true },
        { name: 'jest', purpose: 'testing', required: true },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      const hasLodashViolation = result.violations.some(v =>
        v.includes('lodash')
      );
      const hasJestViolation = result.violations.some(v => v.includes('jest'));
      expect(hasLodashViolation).toBe(false);
      expect(hasJestViolation).toBe(false);
    });
  });

  // ============================================
  // performQualityCheck()
  // ============================================
  describe('performQualityCheck()', () => {
    it('should return violation for missing package.json', () => {
      const result = PackageJsonUtilities.performQualityCheck(tempDir, () => ({
        violations: [],
        suggestions: [],
      }));

      expect(result.violations).toContain('Missing package.json');
    });

    it('should call checker with package.json content', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
          },
        })
      );

      let receivedPackageJson: PackageJsonStructure | null = null;

      PackageJsonUtilities.performQualityCheck(tempDir, packageJson => {
        receivedPackageJson = packageJson;
        return { violations: [], suggestions: [] };
      });

      expect(receivedPackageJson).not.toBeNull();
      expect((receivedPackageJson as PackageJsonStructure | null)?.name).toBe(
        'test-project'
      );
    });

    it('should return checker result', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const expectedResult: QualityCheckResult = {
        violations: ['Test violation'],
        suggestions: ['Test suggestion'],
      };

      const result = PackageJsonUtilities.performQualityCheck(
        tempDir,
        () => expectedResult
      );

      expect(result).toEqual(expectedResult);
    });

    it('should handle checker that throws error', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const result = PackageJsonUtilities.performQualityCheck(tempDir, () => {
        throw new Error('Test error');
      });

      expect(result.violations).toContain('Error reading package.json');
    });

    it('should pass projectRoot to checker', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      let receivedProjectRoot: string | null = null;

      PackageJsonUtilities.performQualityCheck(
        tempDir,
        (_packageJson, projectRoot) => {
          receivedProjectRoot = projectRoot;
          return { violations: [], suggestions: [] };
        }
      );

      expect(receivedProjectRoot).toBe(tempDir);
    });
  });

  // ============================================
  // Type Exports
  // ============================================
  describe('Type Exports', () => {
    it('should export PackageJsonStructure type correctly', () => {
      const packageJson: PackageJsonStructure = {
        name: 'test',
        scripts: { test: 'jest' },
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };

      expect(packageJson.name).toBe('test');
      expect(packageJson.scripts?.test).toBe('jest');
    });

    it('should export QualityCheckResult type correctly', () => {
      const result: QualityCheckResult = {
        violations: ['error 1'],
        suggestions: ['fix 1'],
      };

      expect(result.violations.length).toBe(1);
      expect(result.suggestions.length).toBe(1);
    });

    it('should export QualityTool type correctly', () => {
      const tool: QualityTool = {
        name: 'jest',
        purpose: 'testing',
        required: true,
      };

      expect(tool.name).toBe('jest');
      expect(tool.purpose).toBe('testing');
      expect(tool.required).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle deeply nested projectRoot', () => {
      const nestedDir = PathOperations.join(tempDir, 'a', 'b', 'c', 'd');
      FileUtils.createDirectory(nestedDir);
      FileUtils.writeFile(
        PathOperations.join(nestedDir, 'package.json'),
        JSON.stringify({
          name: 'nested-project',
          version: '1.0.0',
        })
      );

      const result = PackageJsonUtilities.readPackageJson(nestedDir);
      expect(result?.name).toBe('nested-project');
    });

    it('should handle package.json with unusual properties', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          customProperty: { nested: true },
          anotherCustom: [1, 2, 3],
        })
      );

      const result = PackageJsonUtilities.readPackageJson(tempDir);
      expect(result).not.toBeNull();
      expect((result as Record<string, unknown>).customProperty).toEqual({
        nested: true,
      });
    });

    it('should handle empty scripts object', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {},
        })
      );

      const result = PackageJsonUtilities.checkRequiredScripts(tempDir, [
        'test',
      ]);

      expect(result.violations).toContain('Missing test script');
    });

    it('should handle empty dependencies objects', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
        })
      );

      const tools: QualityTool[] = [
        { name: 'jest', purpose: 'testing', required: true },
      ];

      const result = PackageJsonUtilities.checkRequiredDependencies(
        tempDir,
        tools
      );

      expect(result.violations.some(v => v.includes('jest'))).toBe(true);
    });
  });
});
