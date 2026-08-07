import type { PackageJsonLicense } from '../licensing-types';
import { ProjectLicenseAnalyzerValidation } from './project-license-analyzer-validation';

/**
 * Project License Analyzer
 * Specialized utility for analyzing project license configuration
 */
export class ProjectLicenseAnalyzer {
  /**
   * Check project license configuration
   */
  static checkProjectLicense(
    projectRoot: string,
    packageJson: PackageJsonLicense
  ): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    return ProjectLicenseAnalyzerValidation.validateProjectLicense(
      projectRoot,
      packageJson
    );
  }

  /**
   * Extract project license from package.json
   */
  static getProjectLicense(packageJson: PackageJsonLicense): string | null {
    return ProjectLicenseAnalyzerValidation.extractProjectLicense(packageJson);
  }
}
