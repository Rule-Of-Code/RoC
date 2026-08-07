import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import type { PackageJsonLicense } from '../licensing-types';
import { LicensingValidationBase } from '../licensing-validation-base';
import { DependencyLicenseAnalyzerConfiguration } from './dependency-license-analyzer-configuration';

/**
 * Dependency License Analyzer Validation
 * Specialized validation utilities for dependency license analysis
 */
export class DependencyLicenseAnalyzerValidation extends LicensingValidationBase {
  /**
   * Validate dependency licenses in the project
   */
  static validateDependencyLicenses(
    projectRoot: string,
    packageJson: PackageJsonLicense,
    _config: Record<string, unknown> = {}
  ): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    const scoringConfig =
      DependencyLicenseAnalyzerConfiguration.getScoringConfig({});
    const {
      violations,
      suggestions,
      score: initialScore,
    } = this.initializeValidation(scoringConfig.baseScore);
    let score = initialScore;

    const paths = DependencyLicenseAnalyzerConfiguration.getProjectPaths(
      projectRoot,
      {}
    );
    const messages =
      DependencyLicenseAnalyzerConfiguration.getSuggestionMessages();

    if (!FileUtils.exists(paths.nodeModulesPath)) {
      suggestions.push(messages.runNpmInstall);
      return { violations, suggestions, score };
    }

    const dependencies = this.mergeDependencies(projectRoot);

    const { problematicCount, exampleProblematic } =
      DependencyLicenseAnalyzerValidation.scanDependencies(
        paths.nodeModulesPath,
        dependencies
      );

    if (problematicCount > 0) {
      DependencyLicenseAnalyzerValidation.addLicenseViolations(
        violations,
        suggestions,
        problematicCount,
        exampleProblematic
      );
      score -= Math.min(
        scoringConfig.maxPenalty,
        problematicCount * scoringConfig.penaltyPerProblematic
      );
    }

    return { violations, suggestions, score };
  }

  /**
   * Scan dependencies for problematic licenses
   */
  static scanDependencies(
    nodeModulesPath: string,
    dependencies: Record<string, string>,
    _config: Record<string, unknown> = {}
  ): { problematicCount: number; exampleProblematic: string[] } {
    const problematicLicenses =
      DependencyLicenseAnalyzerConfiguration.getProblematicLicenses({});
    const scanConfig =
      DependencyLicenseAnalyzerConfiguration.getDependencyScanningConfig({});
    const exampleProblematic: string[] = [];
    let problematicCount = 0;

    this.iterateDependenciesWithLimit(
      nodeModulesPath,
      dependencies,
      scanConfig.performanceLimit,
      (depName, result) => {
        if (result.success) {
          const evaluation =
            DependencyLicenseAnalyzerValidation.evaluateLicense(
              depName,
              result.license,
              problematicLicenses,
              exampleProblematic
            );
          if (evaluation.isProblematic) {
            problematicCount++;
          }
          return evaluation;
        }
        return null;
      }
    );

    return { problematicCount, exampleProblematic };
  }

  /**
   * Evaluate if license is problematic
   */
  static evaluateLicense(
    depName: string,
    depLicense: string | null,
    problematicLicenses: ReturnType<
      typeof DependencyLicenseAnalyzerConfiguration.getProblematicLicenses
    >,
    exampleProblematic: string[]
  ): { isProblematic: boolean; hasValidPackageJson: boolean } {
    const config =
      DependencyLicenseAnalyzerConfiguration.getDependencyScanningConfig({});
    const formats = DependencyLicenseAnalyzerConfiguration.getExampleFormats(
      {}
    );

    if (!depLicense) {
      if (exampleProblematic.length < config.exampleLimit) {
        exampleProblematic.push(formats.noLicense(depName));
      }
      return { isProblematic: false, hasValidPackageJson: true };
    }

    const isProblematic = problematicLicenses.copyleft.includes(
      depLicense.toLowerCase()
    );

    if (isProblematic && exampleProblematic.length < config.exampleLimit) {
      exampleProblematic.push(formats.withLicense(depName, depLicense));
    }

    return { isProblematic, hasValidPackageJson: true };
  }

  /**
   * Add license violation messages
   */
  static addLicenseViolations(
    violations: string[],
    suggestions: string[],
    problematicCount: number,
    exampleProblematic: string[]
  ): void {
    const violationMessages =
      DependencyLicenseAnalyzerConfiguration.getViolationMessages();
    const suggestionMessages =
      DependencyLicenseAnalyzerConfiguration.getSuggestionMessages();

    violations.push(
      violationMessages.foundProblematicDependencies(problematicCount)
    );

    if (exampleProblematic.length > 0) {
      suggestions.push(suggestionMessages.reviewLicenses(exampleProblematic));
    }

    suggestions.push(suggestionMessages.useLicenseChecker);
  }

  /**
   * Extract license information from dependency package.json
   */
  static getDependencyLicense(packageJson: {
    license?: string;
    licenses?: Array<string | { type?: string }>;
  }): string | null {
    if (packageJson.license) {
      return packageJson.license;
    }
    if (packageJson.licenses?.length) {
      const firstLicense = packageJson.licenses[0];
      if (typeof firstLicense === 'object' && firstLicense.type) {
        return firstLicense.type;
      }
      return typeof firstLicense === 'string' ? firstLicense : null;
    }
    return null;
  }

  /**
   * Generic helper to read dependency package.json and extract license
   * @private
   */
  private static readDependencyPackageJson(
    nodeModulesPath: string,
    depName: string
  ): {
    success: boolean;
    license: string | null;
    packageJson: unknown;
  } {
    const depPackageJsonPath =
      DependencyLicenseAnalyzerConfiguration.getDependencyPackageJsonPath(
        nodeModulesPath,
        depName
      );

    if (!FileUtils.exists(depPackageJsonPath)) {
      return { success: false, license: null, packageJson: null };
    }

    try {
      const depPackageJson =
        FileSystemOperations.readJsonFile(depPackageJsonPath);
      const license = DependencyLicenseAnalyzerValidation.getDependencyLicense(
        depPackageJson as {
          license?: string;
          licenses?: Array<string | { type?: string }>;
        }
      );
      return { success: true, license, packageJson: depPackageJson };
    } catch (_error) {
      return { success: false, license: null, packageJson: null };
    }
  }

  /**
   * Generic helper to merge dependencies and devDependencies
   * @private
   */
  private static mergeDependencies(
    projectRoot: string
  ): Record<string, string> {
    return ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
  }

  /**
   * Generic helper to iterate dependencies with limit and callback
   * @private
   */
  private static iterateDependenciesWithLimit<T>(
    nodeModulesPath: string,
    dependencies: Record<string, string>,
    limit: number,
    callback: (
      depName: string,
      result: ReturnType<typeof this.readDependencyPackageJson>
    ) => T | null
  ): T[] {
    const results: T[] = [];
    let count = 0;

    for (const [depName] of Object.entries(dependencies)) {
      if (count >= limit) break;

      const result = this.readDependencyPackageJson(nodeModulesPath, depName);
      const callbackResult = callback(depName, result);

      if (callbackResult !== null) {
        results.push(callbackResult);
        if (result.success) {
          count++;
        }
      }
    }

    return results;
  }

  /**
   * Validate license compatibility with project license
   */
  static validateLicenseCompatibility(
    projectLicense: string,
    dependencyLicenses: string[],
    _config: Record<string, unknown> = {}
  ): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const compatible = true;

    const compatibilityRules =
      DependencyLicenseAnalyzerConfiguration.getLicenseCompatibilityRules({});
    const projectLicenseNormalized = projectLicense.toLowerCase();

    if (!compatibilityRules[projectLicenseNormalized]) {
      return { compatible, issues, suggestions };
    }

    const rules = compatibilityRules[projectLicenseNormalized] as {
      incompatible: string[];
      requires_notice: string[];
    };

    DependencyLicenseAnalyzerValidation.checkDependencyLicenses(
      dependencyLicenses,
      rules,
      projectLicense,
      issues,
      suggestions
    );

    return { compatible: issues.length === 0, issues, suggestions };
  }

  /**
   * Check dependency licenses against compatibility rules
   */
  static checkDependencyLicenses(
    dependencyLicenses: string[],
    rules: { incompatible: string[]; requires_notice: string[] },
    projectLicense: string,
    issues: string[],
    suggestions: string[]
  ): void {
    const compatibilityMessages =
      DependencyLicenseAnalyzerConfiguration.getLicenseCompatibilityMessages();
    const suggestionMessages =
      DependencyLicenseAnalyzerConfiguration.getSuggestionMessages();

    for (const depLicense of dependencyLicenses) {
      const depLicenseNormalized = depLicense.toLowerCase();

      if (rules.incompatible.includes(depLicenseNormalized)) {
        issues.push(
          compatibilityMessages.incompatibleLicense(depLicense, projectLicense)
        );
        suggestions.push(suggestionMessages.findAlternative(depLicense));
      } else if (rules.requires_notice.includes(depLicenseNormalized)) {
        suggestions.push(suggestionMessages.includeLicenseNotice(depLicense));
      }
    }
  }

  /**
   * Extract dependency licenses as string array (for compatibility checking)
   */
  static extractDependencyLicenses(
    projectRoot: string,
    packageJson: PackageJsonLicense,
    _config: Record<string, unknown> = {}
  ): string[] {
    const paths = DependencyLicenseAnalyzerConfiguration.getProjectPaths(
      projectRoot,
      {}
    );
    const scanConfig =
      DependencyLicenseAnalyzerConfiguration.getDependencyScanningConfig({});

    if (!FileUtils.exists(paths.nodeModulesPath)) {
      return [];
    }

    const dependencies = this.mergeDependencies(projectRoot);

    return this.iterateDependenciesWithLimit(
      paths.nodeModulesPath,
      dependencies,
      scanConfig.extractionLimit,
      (_depName, result) => {
        return result.success && result.license ? result.license : null;
      }
    );
  }
}
