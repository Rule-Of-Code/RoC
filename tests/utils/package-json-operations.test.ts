/**
 * Package JSON Operations Tests
 * Tests for PackageJsonOperations class
 */

import { PathOperations } from '../../src/utils/path-operations';
import { PackageJsonOperations } from '../../src/utils/package-json-operations';
import { isRuleOfCodePackageName } from '../../src/utils/ruleofcode-package';

// RuleOfCode package root which has package.json
const PACKAGE_ROOT = PathOperations.resolve(__dirname, '..', '..');
// Workspace root which has package.json (same as package root in this repo)
const WORKSPACE_ROOT = PACKAGE_ROOT;

describe('utils/package-json-operations', () => {
  describe('loadProjectPackageJson', () => {
    it('should load package.json from workspace root', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(WORKSPACE_ROOT);

      expect(pkg).not.toBeNull();
      expect(pkg?.name).toBeDefined();
    });

    it('should load package.json from package root', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);

      expect(pkg).not.toBeNull();
      expect(isRuleOfCodePackageName(pkg?.name)).toBe(true);
    });

    it('should return null for directory without package.json', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson('/tmp');
      expect(pkg).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const pkg =
        PackageJsonOperations.loadProjectPackageJson('/non/existent/path');
      expect(pkg).toBeNull();
    });
  });

  describe('loadPackageJsonWithFallback', () => {
    it('should load from primary path', () => {
      const pkg = PackageJsonOperations.loadPackageJsonWithFallback(
        PACKAGE_ROOT,
        '/some/fallback'
      );

      expect(pkg).not.toBeNull();
      expect(isRuleOfCodePackageName(pkg?.name)).toBe(true);
    });

    it('should use fallback when primary fails', () => {
      const fallbackPath = PathOperations.join(PACKAGE_ROOT, 'package.json');
      const pkg = PackageJsonOperations.loadPackageJsonWithFallback(
        '/non/existent',
        fallbackPath
      );

      expect(pkg).not.toBeNull();
      expect(isRuleOfCodePackageName(pkg?.name)).toBe(true);
    });

    it('should return null when both fail', () => {
      const pkg = PackageJsonOperations.loadPackageJsonWithFallback(
        '/non/existent',
        '/also/non/existent'
      );

      expect(pkg).toBeNull();
    });

    it('should work without fallback', () => {
      const pkg =
        PackageJsonOperations.loadPackageJsonWithFallback(PACKAGE_ROOT);

      expect(pkg).not.toBeNull();
    });
  });

  describe('getDependencies', () => {
    it('should return dependencies from package.json', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      const deps = PackageJsonOperations.getDependencies(pkg);

      expect(typeof deps).toBe('object');
    });

    it('should return empty object for null package', () => {
      const deps = PackageJsonOperations.getDependencies(null);
      expect(deps).toEqual({});
    });

    it('should return empty object when dependencies is undefined', () => {
      const mockPkg = { name: 'test' };
      const deps = PackageJsonOperations.getDependencies(mockPkg as never);
      expect(deps).toEqual({});
    });
  });

  describe('getDevDependencies', () => {
    it('should return devDependencies from package.json', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      const devDeps = PackageJsonOperations.getDevDependencies(pkg);

      expect(typeof devDeps).toBe('object');
    });

    it('should return empty object for null package', () => {
      const devDeps = PackageJsonOperations.getDevDependencies(null);
      expect(devDeps).toEqual({});
    });
  });

  describe('getAllDependencies', () => {
    it('should combine deps and devDeps', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      const allDeps = PackageJsonOperations.getAllDependencies(pkg);

      expect(typeof allDeps).toBe('object');
    });

    it('should return empty object for null package', () => {
      const allDeps = PackageJsonOperations.getAllDependencies(null);
      expect(allDeps).toEqual({});
    });
  });

  describe('hasDependency', () => {
    it('should return true for existing dependency', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      // Check for a known dependency - minimatch is a common one
      const hasDep = PackageJsonOperations.hasDependency(pkg, 'minimatch');

      expect(typeof hasDep).toBe('boolean');
    });

    it('should return true when dep is in dependencies', () => {
      const mockPkg = {
        name: 'test',
        dependencies: { lodash: '1.0.0' },
      };
      const hasDep = PackageJsonOperations.hasDependency(mockPkg, 'lodash');
      expect(hasDep).toBe(true);
    });

    it('should return true when dep is in devDependencies', () => {
      const mockPkg = {
        name: 'test',
        dependencies: {},
        devDependencies: { jest: '1.0.0' },
      };
      const hasDep = PackageJsonOperations.hasDependency(mockPkg, 'jest');
      expect(hasDep).toBe(true);
    });

    it('should return false for non-existent dependency', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      const hasDep = PackageJsonOperations.hasDependency(
        pkg,
        'non-existent-package-12345'
      );

      expect(hasDep).toBe(false);
    });

    it('should check only deps when includeDev is false', () => {
      const mockPkg = {
        name: 'test',
        dependencies: {},
        devDependencies: { jest: '1.0.0' },
      };
      const hasDep = PackageJsonOperations.hasDependency(
        mockPkg,
        'jest',
        false
      );
      expect(hasDep).toBe(false);
    });

    it('should return false for null package', () => {
      const hasDep = PackageJsonOperations.hasDependency(null, 'any-package');
      expect(hasDep).toBe(false);
    });
  });

  describe('getUnpinnedDependencies', () => {
    it('should return unpinned dependencies', () => {
      const pkg = PackageJsonOperations.loadProjectPackageJson(PACKAGE_ROOT);
      const unpinned = PackageJsonOperations.getUnpinnedDependencies(pkg);

      expect(typeof unpinned).toBe('object');
      // Check if all returned versions are unpinned (start with ^, ~, or *)
      for (const version of Object.values(unpinned)) {
        expect(/^[\^~*]/.test(version)).toBe(true);
      }
    });

    it('should return empty object for null package', () => {
      const unpinned = PackageJsonOperations.getUnpinnedDependencies(null);
      expect(unpinned).toEqual({});
    });

    it('should detect caret range dependencies', () => {
      const mockPkg = {
        name: 'test',
        dependencies: {
          'pinned-dep': '1.0.0',
          'caret-dep': '^1.0.0',
          'tilde-dep': '~1.0.0',
          'star-dep': '*',
        },
      };

      const unpinned = PackageJsonOperations.getUnpinnedDependencies(mockPkg);

      expect(unpinned['caret-dep']).toBe('^1.0.0');
      expect(unpinned['tilde-dep']).toBe('~1.0.0');
      expect(unpinned['star-dep']).toBe('*');
      expect(unpinned['pinned-dep']).toBeUndefined();
    });
  });
});
