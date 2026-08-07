import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { PackageJsonLicense } from '../licensing-types';
import { LicensingValidationBase } from '../licensing-validation-base';
import { ProjectLicenseAnalyzerConfiguration } from './project-license-analyzer-configuration';

/**
 * Project License Analyzer Validation
 * Specialized validation utilities for project license analysis
 */
export class ProjectLicenseAnalyzerValidation extends LicensingValidationBase {
  /**
   * Validate project license configuration
   */
  static validateProjectLicense(
    projectRoot: string,
    packageJson: PackageJsonLicense,
    _config: Record<string, unknown> = {}
  ): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    const scoringConfig = ProjectLicenseAnalyzerConfiguration.getScoringConfig(
      {}
    );
    const {
      violations,
      suggestions,
      score: _initialScore,
    } = this.initializeValidation(scoringConfig.baseScore);
    const messages = ProjectLicenseAnalyzerConfiguration.getViolationMessages(
      {}
    );
    const suggestionMessages =
      ProjectLicenseAnalyzerConfiguration.getSuggestionMessages({});
    let score = scoringConfig.baseScore;

    // A `"private": true` package is npm's own declaration that it will never
    // be published. There, `"license": "UNLICENSED"` is the SANCTIONED value —
    // not an omission — and a LICENSE file for a closed-source repo is
    // ceremony. Demanding an OSS licence from a private repo is a violation
    // the project can only silence with a waiver, and waivers we force are the
    // waivers that later hide real debt.
    const isPrivatePackage =
      (packageJson as { private?: boolean }).private === true;

    // Check for license in package.json
    const projectLicense =
      ProjectLicenseAnalyzerValidation.extractProjectLicense(packageJson);
    if (!projectLicense) {
      violations.push(messages.noLicenseField);
      suggestions.push(suggestionMessages.addLicenseField);
      score -= scoringConfig.noLicensePenalty;
    } else if (projectLicense === 'UNLICENSED' && !isPrivatePackage) {
      violations.push(messages.unlicensedProject);
      suggestions.push(suggestionMessages.addOpenSourceLicense);
      score -= scoringConfig.unlicensedPenalty;
    }

    // Check for LICENSE file
    const hasLicenseFile =
      ProjectLicenseAnalyzerValidation.checkLicenseFileExists(projectRoot);
    if (!hasLicenseFile && !isPrivatePackage) {
      violations.push(messages.noLicenseFile);
      suggestions.push(suggestionMessages.createLicenseFile);
      score -= scoringConfig.noFilePenalty;
    }

    // Check for license consistency
    if (projectLicense && hasLicenseFile) {
      const licenseFilePath =
        ProjectLicenseAnalyzerValidation.findLicenseFilePath(projectRoot);
      if (licenseFilePath) {
        const consistency =
          ProjectLicenseAnalyzerValidation.validateLicenseConsistency(
            projectLicense,
            licenseFilePath
          );
        // Only a mismatch we can actually establish is a violation. When the
        // identifier is one we do not know, we say nothing — an unverifiable
        // claim is not evidence, and a violation nobody can fix is a waiver
        // waiting to happen.
        if (consistency.determinable && !consistency.consistent) {
          violations.push(
            messages.licenseMismatch(projectLicense, consistency.fileLicense)
          );
          suggestions.push(suggestionMessages.ensureConsistency);
          score -= scoringConfig.mismatchPenalty;
        }
      }
    }

    return { violations, suggestions, score };
  }

  /**
   * Extract project license from package.json
   */
  static extractProjectLicense(packageJson: PackageJsonLicense): string | null {
    if (packageJson.license) {
      return packageJson.license;
    }
    if (packageJson.licenses && packageJson.licenses.length > 0) {
      return packageJson.licenses[0]?.type ?? '';
    }
    return null;
  }

  /**
   * Generic helper to find LICENSE file
   * @private
   */
  private static findLicenseFile(projectRoot: string): string | null {
    const licenseFiles =
      ProjectLicenseAnalyzerConfiguration.getLicenseFileNames({});

    for (const file of licenseFiles) {
      const filePath = PathOperations.join(projectRoot, file);
      if (FileUtils.exists(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Check if LICENSE file exists
   */
  static checkLicenseFileExists(
    projectRoot: string,
    _config: Record<string, unknown> = {}
  ): boolean {
    return this.findLicenseFile(projectRoot) !== null;
  }

  /**
   * Find LICENSE file path
   */
  static findLicenseFilePath(
    projectRoot: string,
    _config: Record<string, unknown> = {}
  ): string | null {
    return this.findLicenseFile(projectRoot);
  }

  /**
   * Closed-source licence identifiers. `UNLICENSED` is npm's own sanctioned
   * value for a package that will never be published — the same value this
   * class declares sanctioned above — and `SEE LICENSE IN <file>` is SPDX's.
   */
  private static readonly PROPRIETARY_IDENTIFIERS =
    /^(unlicensed|proprietary|closed[- ]?source|see licen[cs]e\b.*)$/i;

  /** What a proprietary LICENSE file actually says. */
  private static readonly PROPRIETARY_CONTENT =
    /all rights reserved|proprietary|confidential|unlicensed|not licensed for|no licen[cs]e is granted/i;

  /**
   * Validate license consistency between package.json and LICENSE file.
   *
   * The map below knows five OSS licences. Anything else used to fall through
   * to `consistent: false, 'Cannot determine from content'` — so every
   * proprietary project WITH a LICENSE file was told its licence mismatched.
   * The only way to pass was to DELETE the LICENSE file: the law rewarded
   * destroying a real legal artifact (a backend consumer). Two things were wrong:
   *
   * 1. We did not know what a closed-source licence looks like. Now we do.
   * 2. We reported "I cannot determine this" as "these do not match". Those are
   *    different claims, and only one of them is a violation. `determinable`
   *    keeps them apart — an unrecognised licence is now unknown, not guilty.
   */
  static validateLicenseConsistency(
    packageJsonLicense: string,
    licenseFilePath: string,
    _config: Record<string, unknown> = {}
  ): {
    consistent: boolean;
    determinable: boolean;
    fileLicense: string;
  } {
    try {
      const licenseContent = FileUtils.readFile(licenseFilePath, {
        encoding: 'utf8',
      }).toLowerCase();

      const licenseMap = ProjectLicenseAnalyzerConfiguration.getLicenseTypeMap(
        {}
      );
      const normalizedPackageJsonLicense = packageJsonLicense.toLowerCase();
      const patterns = licenseMap[normalizedPackageJsonLicense];

      if (patterns) {
        const consistent = patterns.some(pattern =>
          licenseContent.includes(pattern)
        );
        return {
          consistent,
          determinable: true,
          fileLicense: consistent ? packageJsonLicense : 'Unknown',
        };
      }

      if (this.PROPRIETARY_IDENTIFIERS.test(packageJsonLicense.trim())) {
        const consistent = this.PROPRIETARY_CONTENT.test(licenseContent);
        return {
          consistent,
          determinable: true,
          fileLicense: consistent ? packageJsonLicense : 'Unknown',
        };
      }

      // An unrecognised identifier (a custom or dual licence): we cannot judge
      // it, and we will not invent a mismatch to fill the silence.
      return {
        consistent: false,
        determinable: false,
        fileLicense: 'Cannot determine from content',
      };
    } catch (_error) {
      return {
        consistent: false,
        determinable: false,
        fileLicense: 'Error reading license file',
      };
    }
  }
}
