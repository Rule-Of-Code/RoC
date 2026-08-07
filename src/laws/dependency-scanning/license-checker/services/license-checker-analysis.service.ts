/**
 * License Checker Analysis Service
 * Business logic layer: License analysis and detection
 */

import type { LawCheckContext } from '../../../../types/law.types';
import { FileUtils } from '../../../../utils';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { DirectoryScanner } from '../../../../utils/directory-scanner';
import { PathOperations } from '../../../../utils/path-operations';
import { LicenseCheckerConstants } from '../constants/license-checker.constants';

export interface LicenseAnalysisResult {
  hasProjectLicense: boolean;
  licenseType: string;
  filesWithoutHeaders: number;
}

export interface DependencyLicensesResult {
  incompatibleLicenses: string[];
  unknownLicenses: string[];
  copyleftLicenses: string[];
}

/**
 * Service for analyzing licenses in projects
 */
export class LicenseCheckerAnalysisService {
  /**
   * Analyze project licenses (project license file and headers in source files)
   */
  static analyzeLicenses(
    projectRoot: string,
    context?: LawCheckContext
  ): LicenseAnalysisResult {
    let hasProjectLicense = false;
    let licenseType = 'unknown';

    // Check for license files in project root
    const fileLicenseResult = this.findLicenseFile(projectRoot);
    if (fileLicenseResult.found) {
      hasProjectLicense = true;
      licenseType = fileLicenseResult.type;
    }

    // Check package.json for license field
    const packageLicenseResult = this.getPackageJsonLicense(projectRoot);
    if (packageLicenseResult) {
      hasProjectLicense = true;
      licenseType = packageLicenseResult;
    }

    // Check source files for license headers
    const filesWithoutHeaders = this.checkSourceFilesForHeaders(
      projectRoot,
      context
    );

    return {
      hasProjectLicense,
      licenseType,
      filesWithoutHeaders,
    };
  }

  /**
   * Analyze dependency licenses (check for incompatible, unknown, and copyleft)
   */
  static checkDependencyLicenses(
    projectRoot: string
  ): DependencyLicensesResult {
    const incompatibleLicenses: string[] = [];
    const unknownLicenses: string[] = [];
    const copyleftLicenses: string[] = [];

    try {
      const dependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      for (const pkg of Object.keys(dependencies)) {
        const detectedLicense = this.detectPackageLicense(pkg);

        if (LicenseCheckerConstants.isRestrictiveLicense(detectedLicense)) {
          incompatibleLicenses.push(`${pkg} (${detectedLicense})`);
        } else if (detectedLicense === 'unknown') {
          unknownLicenses.push(pkg);
        } else if (LicenseCheckerConstants.isCopyleftLicense(detectedLicense)) {
          copyleftLicenses.push(`${pkg} (${detectedLicense})`);
        }
      }
    } catch (_error) {
      // Handle parsing errors silently
    }

    return {
      incompatibleLicenses,
      unknownLicenses,
      copyleftLicenses,
    };
  }

  /**
   * Find license file in project root
   */
  private static findLicenseFile(projectRoot: string): {
    found: boolean;
    type: string;
  } {
    for (const licenseFile of LicenseCheckerConstants.LICENSE_FILES) {
      const licensePath = PathOperations.join(projectRoot, licenseFile);
      if (FileUtils.exists(licensePath)) {
        try {
          const content = FileUtils.readFile(licensePath);
          const licenseType =
            LicenseCheckerConstants.detectLicenseType(content);
          return { found: true, type: licenseType };
        } catch (_error) {
          // Continue to next license file
        }
      }
    }
    return { found: false, type: 'unknown' };
  }

  /**
   * Get license from package.json
   */
  private static getPackageJsonLicense(projectRoot: string): string | null {
    try {
      const packageJson = ProjectTypeDetectorValidation.getPackageJson(
        projectRoot
      ) as Record<string, unknown>;
      return (packageJson.license as string | undefined) ?? null;
    } catch (_error) {
      // Handle parsing errors
    }
    return null;
  }

  /**
   * Check source files for license headers
   */
  private static checkSourceFilesForHeaders(
    projectRoot: string,
    context?: LawCheckContext
  ): number {
    let filesWithoutHeaders = 0;

    if (context?.config) {
      const scanResult = DirectoryScanner.scanDirectory(
        projectRoot,
        context.config,
        {
          extensions: LicenseCheckerConstants.SOURCE_FILE_EXTENSIONS,
          maxDepth: LicenseCheckerConstants.SCAN_MAX_DEPTH,
        }
      );

      const sourceFiles = scanResult.files.slice(
        0,
        LicenseCheckerConstants.MAX_HEADER_SCAN_FILES
      );

      for (const file of sourceFiles) {
        try {
          const content = FileUtils.readFile(file);
          if (!LicenseCheckerConstants.hasLicenseHeader(content)) {
            filesWithoutHeaders++;
          }
        } catch (_error) {
          filesWithoutHeaders++;
        }
      }
    }

    return filesWithoutHeaders;
  }

  /**
   * Detect license for a package (simulated)
   */
  private static detectPackageLicense(packageName: string): string {
    // In a real implementation, you would use a tool like license-checker
    // This is a simplified version that checks known packages
    return LicenseCheckerConstants.getDefaultLicenseForPackage(packageName);
  }
}
