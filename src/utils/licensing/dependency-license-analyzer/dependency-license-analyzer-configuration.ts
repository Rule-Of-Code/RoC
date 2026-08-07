import {
  DEPENDENCY_LICENSE_COMPATIBILITY,
  DEPENDENCY_LICENSE_CONFIG,
  DEPENDENCY_LICENSE_MESSAGES,
} from '../../constants';
import { PathOperations } from '../../path-operations';

/**
 * Dependency License Analyzer Configuration
 * Centralized configuration for dependency license analysis patterns and rules
 */
export class DependencyLicenseAnalyzerConfiguration {
  /**
   * Get license constants
   */
  static getLicenseConstants(_config: Record<string, unknown> = {}): {
    apache20: string;
    bsd2Clause: string;
    bsd3Clause: string;
  } {
    return {
      apache20: DEPENDENCY_LICENSE_CONFIG.LICENSES.APACHE_2_0 as string,
      bsd2Clause: DEPENDENCY_LICENSE_CONFIG.LICENSES.BSD_2_CLAUSE as string,
      bsd3Clause: DEPENDENCY_LICENSE_CONFIG.LICENSES.BSD_3_CLAUSE as string,
    };
  }

  /**
   * Get dependency scanning configuration
   */
  static getDependencyScanningConfig(_config: Record<string, unknown> = {}): {
    performanceLimit: number;
    extractionLimit: number;
    exampleLimit: number;
  } {
    return {
      performanceLimit: DEPENDENCY_LICENSE_CONFIG.SCANNING.PERFORMANCE_LIMIT,
      extractionLimit: DEPENDENCY_LICENSE_CONFIG.SCANNING.EXTRACTION_LIMIT,
      exampleLimit: DEPENDENCY_LICENSE_CONFIG.SCANNING.EXAMPLE_LIMIT,
    };
  }

  /**
   * Get scoring configuration
   */
  static getScoringConfig(_config: Record<string, unknown> = {}): {
    baseScore: number;
    maxPenalty: number;
    penaltyPerProblematic: number;
  } {
    return {
      baseScore: DEPENDENCY_LICENSE_CONFIG.SCORING.BASE_SCORE,
      maxPenalty: DEPENDENCY_LICENSE_CONFIG.SCORING.MAX_PENALTY,
      penaltyPerProblematic:
        DEPENDENCY_LICENSE_CONFIG.SCORING.PENALTY_PER_PROBLEMATIC,
    };
  }

  /**
   * Get problematic licenses categorization
   */
  static getProblematicLicenses(_config: Record<string, unknown> = {}): {
    copyleft: string[];
    commercial: string[];
    restrictive: string[];
  } {
    return {
      copyleft: [...DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COPYLEFT],
      commercial: [
        ...DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COMMERCIAL,
      ],
      restrictive: [
        ...DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.RESTRICTIVE,
      ],
    };
  }

  /**
   * Get license compatibility rules
   */
  static getLicenseCompatibilityRules(
    _config: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return {
      mit: {
        incompatible: [...DEPENDENCY_LICENSE_COMPATIBILITY.MIT.INCOMPATIBLE],
        requires_notice: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.MIT.REQUIRES_NOTICE,
        ],
      },
      'apache-2.0': {
        incompatible: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.APACHE_2_0.INCOMPATIBLE,
        ],
        requires_notice: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.APACHE_2_0.REQUIRES_NOTICE,
        ],
      },
      'gpl-3.0': {
        incompatible: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.GPL_3_0.INCOMPATIBLE,
        ],
        requires_notice: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.GPL_3_0.REQUIRES_NOTICE,
        ],
      },
      proprietary: {
        incompatible: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.INCOMPATIBLE,
        ],
        requires_notice: [
          ...DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.REQUIRES_NOTICE,
        ],
      },
    };
  }

  /**
   * Get violation messages
   */
  static getViolationMessages(_config: Record<string, unknown> = {}): {
    foundProblematicDependencies: (count: number) => string;
  } {
    return {
      foundProblematicDependencies: (count: number) =>
        DEPENDENCY_LICENSE_MESSAGES.VIOLATIONS.FOUND_PROBLEMATIC_DEPENDENCIES.replace(
          '{count}',
          count.toString()
        ),
    };
  }

  /**
   * Get suggestion messages
   */
  static getSuggestionMessages(_config: Record<string, unknown> = {}): {
    runNpmInstall: string;
    reviewLicenses: (examples: string[]) => string;
    useLicenseChecker: string;
    findAlternative: (license: string) => string;
    includeLicenseNotice: (license: string) => string;
  } {
    return {
      runNpmInstall: DEPENDENCY_LICENSE_MESSAGES.SUGGESTIONS
        .RUN_NPM_INSTALL as string,
      reviewLicenses: (examples: string[]) =>
        DEPENDENCY_LICENSE_MESSAGES.SUGGESTIONS.REVIEW_LICENSES.replace(
          '{examples}',
          examples.join(', ')
        ),
      useLicenseChecker: DEPENDENCY_LICENSE_MESSAGES.SUGGESTIONS
        .USE_LICENSE_CHECKER as string,
      findAlternative: (license: string) =>
        DEPENDENCY_LICENSE_MESSAGES.SUGGESTIONS.FIND_ALTERNATIVE.replace(
          '{license}',
          license
        ),
      includeLicenseNotice: (license: string) =>
        DEPENDENCY_LICENSE_MESSAGES.SUGGESTIONS.INCLUDE_LICENSE_NOTICE.replace(
          '{license}',
          license
        ),
    };
  }

  /**
   * Get license compatibility messages
   */
  static getLicenseCompatibilityMessages(
    _config: Record<string, unknown> = {}
  ): {
    incompatibleLicense: (depLicense: string, projectLicense: string) => string;
  } {
    return {
      incompatibleLicense: (depLicense: string, projectLicense: string) =>
        DEPENDENCY_LICENSE_MESSAGES.VIOLATIONS.INCOMPATIBLE_LICENSE.replace(
          '{depLicense}',
          depLicense
        ).replace('{projectLicense}', projectLicense),
    };
  }

  /**
   * Get file paths configuration
   */
  static getFilePathsConfig(_config: Record<string, unknown> = {}): {
    nodeModulesDir: string;
    packageJsonFile: string;
  } {
    return {
      nodeModulesDir: DEPENDENCY_LICENSE_CONFIG.PATHS
        .NODE_MODULES_DIR as string,
      packageJsonFile: DEPENDENCY_LICENSE_CONFIG.PATHS
        .PACKAGE_JSON_FILE as string,
    };
  }

  /**
   * Get project paths
   */
  static getProjectPaths(
    projectRoot: string,
    _configOverride: Record<string, unknown> = {}
  ): {
    nodeModulesPath: string;
  } {
    const config = DependencyLicenseAnalyzerConfiguration.getFilePathsConfig(
      {}
    );
    return {
      nodeModulesPath: PathOperations.join(projectRoot, config.nodeModulesDir),
    };
  }

  /**
   * Get dependency package.json path
   */
  static getDependencyPackageJsonPath(
    nodeModulesPath: string,
    depName: string,
    _configOverride: Record<string, unknown> = {}
  ): string {
    const config = DependencyLicenseAnalyzerConfiguration.getFilePathsConfig(
      {}
    );
    return PathOperations.join(
      nodeModulesPath,
      depName,
      config.packageJsonFile
    );
  }

  /**
   * Get example format for problematic dependencies
   */
  static getExampleFormats(_config: Record<string, unknown> = {}): {
    noLicense: (depName: string) => string;
    withLicense: (depName: string, license: string) => string;
  } {
    return {
      noLicense: (depName: string) =>
        DEPENDENCY_LICENSE_MESSAGES.FORMATS.NO_LICENSE.replace(
          '{depName}',
          depName
        ),
      withLicense: (depName: string, license: string) =>
        DEPENDENCY_LICENSE_MESSAGES.FORMATS.WITH_LICENSE.replace(
          '{depName}',
          depName
        ).replace('{license}', license),
    };
  }
}
