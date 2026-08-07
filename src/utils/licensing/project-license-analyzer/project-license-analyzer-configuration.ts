import { LICENSE_CONVENTIONS, LICENSE_MESSAGES } from '../../constants';
import { PathOperations } from '../../path-operations';

/**
 * Project License Analyzer Configuration
 * Centralized configuration for project license analysis
 */
export class ProjectLicenseAnalyzerConfiguration {
  /**
   * Get license file names to check
   */
  static getLicenseFileNames(_config: Record<string, unknown> = {}): string[] {
    return [...LICENSE_CONVENTIONS.LICENSE_FILE_NAMES];
  }

  /**
   * Get license type mappings for consistency checking
   */
  static getLicenseTypeMap(
    _config: Record<string, unknown> = {}
  ): Record<string, string[]> {
    return {
      mit: [...LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.MIT],
      'apache-2.0': [...LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.APACHE_2_0],
      'gpl-3.0': [...LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.GPL_3_0],
      'bsd-3-clause': [
        ...LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.BSD_3_CLAUSE,
      ],
      isc: [...LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.ISC],
    };
  }

  /**
   * Get scoring configuration
   */
  static getScoringConfig(_config: Record<string, unknown> = {}): {
    baseScore: number;
    noLicensePenalty: number;
    unlicensedPenalty: number;
    noFilePenalty: number;
    mismatchPenalty: number;
  } {
    return {
      baseScore: LICENSE_CONVENTIONS.SCORING.BASE_SCORE,
      noLicensePenalty: LICENSE_CONVENTIONS.SCORING.NO_LICENSE_PENALTY,
      unlicensedPenalty: LICENSE_CONVENTIONS.SCORING.UNLICENSED_PENALTY,
      noFilePenalty: LICENSE_CONVENTIONS.SCORING.NO_FILE_PENALTY,
      mismatchPenalty: LICENSE_CONVENTIONS.SCORING.MISMATCH_PENALTY,
    };
  }

  /**
   * Get violation messages
   */
  static getViolationMessages(_config: Record<string, unknown> = {}): {
    noLicenseField: string;
    unlicensedProject: string;
    noLicenseFile: string;
    licenseMismatch: (packageLicense: string, fileLicense: string) => string;
  } {
    return {
      noLicenseField: LICENSE_MESSAGES.VIOLATIONS.NO_LICENSE_FIELD,
      unlicensedProject: LICENSE_MESSAGES.VIOLATIONS.UNLICENSED_PROJECT,
      noLicenseFile: LICENSE_MESSAGES.VIOLATIONS.NO_LICENSE_FILE,
      licenseMismatch: (packageLicense: string, fileLicense: string) =>
        LICENSE_MESSAGES.VIOLATIONS.LICENSE_MISMATCH.replace(
          '{packageLicense}',
          packageLicense
        ).replace('{fileLicense}', fileLicense),
    };
  }

  /**
   * Get suggestion messages
   */
  static getSuggestionMessages(_config: Record<string, unknown> = {}): {
    addLicenseField: string;
    addOpenSourceLicense: string;
    createLicenseFile: string;
    ensureConsistency: string;
  } {
    return {
      addLicenseField: LICENSE_MESSAGES.SUGGESTIONS.ADD_LICENSE_FIELD,
      addOpenSourceLicense:
        LICENSE_MESSAGES.SUGGESTIONS.ADD_OPEN_SOURCE_LICENSE,
      createLicenseFile: LICENSE_MESSAGES.SUGGESTIONS.CREATE_LICENSE_FILE,
      ensureConsistency: LICENSE_MESSAGES.SUGGESTIONS.ENSURE_CONSISTENCY,
    };
  }

  /**
   * Get license file path candidates
   */
  static getLicenseFilePaths(
    projectRoot: string,
    _config: Record<string, unknown> = {}
  ): string[] {
    const fileNames = ProjectLicenseAnalyzerConfiguration.getLicenseFileNames(
      {}
    );
    return fileNames.map(fileName =>
      PathOperations.join(projectRoot, fileName)
    );
  }
}
