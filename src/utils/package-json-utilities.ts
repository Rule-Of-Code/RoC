/**
 * Package JSON Utilities
 * Shared utilities for sacred-laws package.json operations
 */

import type { PackageJson } from '../types/package-json-types';
import { PackageJsonOperations } from './package-json-operations';

export class PackageJsonUtilities {
  /**
   * Performs quality check using package.json validation pattern
   */
  static performQualityCheck(
    projectRoot: string,
    validationCallback: (packageJson: PackageJson) => {
      violations: string[];
      suggestions: string[];
    }
  ): { violations: string[]; suggestions: string[] } {
    const packageJson =
      PackageJsonOperations.loadProjectPackageJson(projectRoot);

    if (!packageJson) {
      return {
        violations: ['No package.json found'],
        suggestions: [
          'Create a package.json file for proper dependency management',
        ],
      };
    }

    return validationCallback(packageJson);
  }
}
