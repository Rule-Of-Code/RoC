import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { PackageJsonLicense } from '../licensing-types';
import { DependencyLicenseAnalyzerValidation } from './dependency-license-analyzer-validation';

/**
 * Dependency License Analyzer
 * Specialized utility for analyzing dependency license compatibility
 */
export class DependencyLicenseAnalyzer {
  /**
   * Main method to analyze dependency licenses for problematic licenses
   */
  static analyzeDependencyLicenses(projectRoot: string): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (!FileUtils.exists(packageJsonPath)) {
      return {
        violations: ['No package.json found in project root'],
        suggestions: [
          'Ensure you have a package.json file in your project root',
        ],
        score: 0,
      };
    }

    let packageJson: PackageJsonLicense;
    try {
      packageJson = FileSystemOperations.readJsonFile(packageJsonPath);
    } catch (_error) {
      return {
        violations: ['Could not read package.json file'],
        suggestions: ['Check that package.json is valid JSON'],
        score: 0,
      };
    }

    return DependencyLicenseAnalyzerValidation.validateDependencyLicenses(
      projectRoot,
      packageJson
    );
  }

  /**
   * Check license compatibility with project license
   */
  static checkLicenseCompatibility(
    projectLicense: string,
    dependencyLicenses: string[]
  ): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    return DependencyLicenseAnalyzerValidation.validateLicenseCompatibility(
      projectLicense,
      dependencyLicenses
    );
  }

  /**
   * Extract dependency licenses from project (for compatibility checking)
   */
  static extractDependencyLicenses(
    projectRoot: string,
    packageJson: PackageJsonLicense
  ): string[] {
    return DependencyLicenseAnalyzerValidation.extractDependencyLicenses(
      projectRoot,
      packageJson
    );
  }
}
