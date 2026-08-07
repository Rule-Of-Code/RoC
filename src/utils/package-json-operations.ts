/**
 * Package JSON Operations Utility
 * Consolidates duplicate package.json loading patterns
 */

import type { PackageJsonStructure as PackageJson } from '../checkers/sacred-laws/package-json-utilities';
import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

export class PackageJsonOperations {
  /**
   * Safely loads package.json from project root
   * Handles errors silently and returns null on failure
   * Used by multiple checkers: dependency-pinning, npm-audit, etc.
   */
  static loadProjectPackageJson(projectRoot: string): PackageJson | null {
    try {
      const packagePath = PathOperations.join(projectRoot, 'package.json');

      if (FileUtils.exists(packagePath)) {
        return FileSystemOperations.readJsonFile<PackageJson>(packagePath);
      }
    } catch (_error) {
      // Silent fail - package.json doesn't exist or is invalid
    }
    return null;
  }

  /**
   * Loads package.json with fallback pattern
   * First tries specified path, falls back to default location
   */
  static loadPackageJsonWithFallback(
    projectRoot: string,
    fallbackPath?: string
  ): PackageJson | null {
    let result = PackageJsonOperations.loadProjectPackageJson(projectRoot);

    if (!result && fallbackPath) {
      try {
        if (FileUtils.exists(fallbackPath)) {
          result = FileSystemOperations.readJsonFile<PackageJson>(fallbackPath);
        }
      } catch (_error) {
        // Silent fail
      }
    }

    return result;
  }

  /**
   * Gets dependencies from package.json
   */
  static getDependencies(
    packageJson: PackageJson | null
  ): Record<string, string> {
    if (!packageJson) return {};
    return packageJson.dependencies ?? {};
  }

  /**
   * Gets dev dependencies from package.json
   */
  static getDevDependencies(
    packageJson: PackageJson | null
  ): Record<string, string> {
    if (!packageJson) return {};
    return packageJson.devDependencies ?? {};
  }

  /**
   * Gets all dependencies (including dev)
   */
  static getAllDependencies(
    packageJson: PackageJson | null
  ): Record<string, string> {
    if (!packageJson) return {};
    return {
      ...PackageJsonOperations.getDependencies(packageJson),
      ...PackageJsonOperations.getDevDependencies(packageJson),
    };
  }

  /**
   * Checks if dependency exists
   */
  static hasDependency(
    packageJson: PackageJson | null,
    depName: string,
    includeDev = true
  ): boolean {
    if (!packageJson) return false;

    const deps = PackageJsonOperations.getDependencies(packageJson);
    if (deps[depName]) return true;

    if (includeDev) {
      const devDeps = PackageJsonOperations.getDevDependencies(packageJson);
      return !!devDeps[depName];
    }

    return false;
  }

  /**
   * Gets all unpinned (range) dependencies
   */
  static getUnpinnedDependencies(
    packageJson: PackageJson | null
  ): Record<string, string> {
    if (!packageJson) return {};

    const allDeps = PackageJsonOperations.getAllDependencies(packageJson);
    const unpinned: Record<string, string> = {};

    for (const [name, version] of Object.entries(allDeps)) {
      if (PackageJsonOperations.isUnpinnedVersion(version)) {
        unpinned[name] = version;
      }
    }

    return unpinned;
  }

  /**
   * Checks if a version string is unpinned (uses ranges like ^, ~, *)
   */
  private static isUnpinnedVersion(version: string): boolean {
    return /^[\^~*]/.test(version);
  }
}
