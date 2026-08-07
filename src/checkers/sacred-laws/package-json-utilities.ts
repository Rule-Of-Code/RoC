/**
 * Package JSON Utilities
 * Common operations for reading and validating package.json files
 */

import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/**
 * Standard package.json structure
 */
export interface PackageJsonStructure {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Quality check result structure
 */
export interface QualityCheckResult {
  violations: string[];
  suggestions: string[];
}

/**
 * Tool definition for quality checks
 */
export interface QualityTool {
  name: string;
  purpose: string;
  required?: boolean;
}

/**
 * Package JSON utilities for sacred laws
 */
export class PackageJsonUtilities {
  /**
   * Standard error result for package.json reading failures
   */
  private static readonly ERROR_READING_PACKAGE = (): QualityCheckResult => ({
    violations: ['Error reading package.json'],
    suggestions: [],
  });

  /**
   * Read and parse package.json safely
   */
  static readPackageJson(projectRoot: string): PackageJsonStructure | null {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      return null;
    }

    try {
      return FileSystemOperations.readJsonFile<PackageJsonStructure>(
        packageJsonPath,
        {}
      );
    } catch (_error) {
      return null;
    }
  }

  /**
   * Helper to validate package.json existence and return appropriate error
   */
  private static validatePackageJsonExists(
    projectRoot: string
  ): QualityCheckResult | null {
    const packageJson = this.readPackageJson(projectRoot);
    if (!packageJson) {
      return {
        violations: ['Missing package.json'],
        suggestions: ['Initialize project with package.json'],
      };
    }
    return null;
  }

  /**
   * Check for required scripts in package.json
   */
  static checkRequiredScripts(
    projectRoot: string,
    requiredScripts: string[]
  ): QualityCheckResult {
    const validationError = this.validatePackageJsonExists(projectRoot);
    if (validationError) return validationError;

    const packageJson = this.readPackageJson(projectRoot);
    if (!packageJson) {
      return this.ERROR_READING_PACKAGE();
    }

    const result: QualityCheckResult = {
      violations: [],
      suggestions: [],
    };

    const scripts = packageJson.scripts ?? {};
    for (const scriptName of requiredScripts) {
      if (!scripts[scriptName]) {
        result.violations.push(`Missing ${scriptName} script`);
        result.suggestions.push(`Add ${scriptName} script for automation`);
      }
    }

    return result;
  }

  /**
   * Check for required dependencies
   */
  static checkRequiredDependencies(
    projectRoot: string,
    requiredTools: QualityTool[]
  ): QualityCheckResult {
    const validationError = this.validatePackageJsonExists(projectRoot);
    if (validationError) return validationError;

    const result: QualityCheckResult = {
      violations: [],
      suggestions: [],
    };

    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      for (const tool of requiredTools) {
        const hasBaseTool = deps[tool.name];
        const hasScopedTool = deps[`@${tool.name}/`];

        if (!hasBaseTool && !hasScopedTool) {
          if (tool.required) {
            result.violations.push(`Missing ${tool.name} for ${tool.purpose}`);
            result.suggestions.push(
              `Install ${tool.name} for professional ${tool.purpose}`
            );
          } else {
            result.suggestions.push(
              `Consider adding ${tool.name} for enhanced ${tool.purpose}`
            );
          }
        }
      }
    } catch (_error) {
      result.violations.push('Invalid package.json format');
    }

    return result;
  }

  /**
   * Generic package.json based quality check
   */
  static performQualityCheck(
    projectRoot: string,
    checker: (
      packageJson: PackageJsonStructure,
      projectRoot: string
    ) => QualityCheckResult
  ): QualityCheckResult {
    const validationError = this.validatePackageJsonExists(projectRoot);
    if (validationError) return validationError;

    const packageJson = this.readPackageJson(projectRoot);
    if (!packageJson) {
      return this.ERROR_READING_PACKAGE();
    }

    try {
      return checker(packageJson, projectRoot);
    } catch (_error) {
      return this.ERROR_READING_PACKAGE();
    }
  }
}
