/**
 * Cryptographic Libraries Validation Patterns
 * Orchestrates validation workflow for cryptographic library analysis
 */

import { CheckerUtils } from '../../checker-utils';
import { ConfigFileUtils } from '../../config-file-utils';
import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../file-utils';
import type {
  CryptoPatternAnalysis,
  CryptoValidationResult,
  PatternCheck,
} from './cryptographic-libraries-configuration';
import { CryptographicLibrariesConfiguration as Config } from './cryptographic-libraries-configuration';

export class CryptographicLibrariesValidationPatterns {
  // ===================
  // MAIN VALIDATION WORKFLOW
  // ===================
  static validateAllCryptographicPatterns(
    projectRoot: string
  ): CryptoValidationResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Step 1: Analyze package.json for crypto libraries
    this.validatePackageLibraries(projectRoot, violations, suggestions);

    // Step 2: Analyze source files for crypto imports
    this.validateSourceFiles(projectRoot, violations, suggestions);

    return { violations, suggestions };
  }

  // ===================
  // PACKAGE LIBRARY VALIDATION
  // ===================
  private static validatePackageLibraries(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const dependencies =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    if (!Object.keys(dependencies).length) {
      return;
    }

    const analysis = Config.analyzeCryptoLibraries(dependencies);

    // Process outdated libraries (inlined from processOutdatedLibraries)
    for (const lib of analysis.outdatedLibraries) {
      violations.push(
        Config.buildMessage(
          Config.VALIDATION_MESSAGES.OUTDATED_LIBRARY_VIOLATION,
          { library: lib }
        )
      );
      suggestions.push(
        Config.buildMessage(
          Config.VALIDATION_MESSAGES.OUTDATED_LIBRARY_SUGGESTION,
          { library: lib }
        )
      );
    }

    // Process recommended libraries (inlined from processRecommendedLibraries)
    if (!analysis.hasRecommendedLib && analysis.hasCryptoRelatedDeps) {
      suggestions.push(
        Config.VALIDATION_MESSAGES.RECOMMENDED_LIBRARY_SUGGESTION
      );
    }

    // Process native crypto (inlined from processNativeCrypto)
    if (!analysis.hasNativeCrypto) {
      suggestions.push(Config.VALIDATION_MESSAGES.NATIVE_CRYPTO_SUGGESTION);
    }
  }

  // ===================
  // SOURCE FILE VALIDATION
  // ===================
  private static validateSourceFiles(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const config = ConfigFileUtils.getMinimalDefaultConfig();

    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().ALL_CODE,
      config
    );

    for (const file of files) {
      const content = FileUtils.readFile(file);
      const analysis = Config.analyzeCryptoPatterns(content);

      this.processFilePatterns(analysis, file, violations, suggestions);
    }
  }

  // ===================
  // FILE PATTERN PROCESSING (Data-Driven)
  // ===================
  private static processFilePatterns(
    analysis: CryptoPatternAnalysis,
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    // Single loop over all pattern checks with requiresCryptoImport filter
    for (const check of Config.ALL_PATTERN_CHECKS) {
      const shouldCheck =
        !check.requiresCryptoImport || analysis.hasCryptoImport;

      if (shouldCheck && analysis[check.condition]) {
        this.applyPatternCheck(check, filePath, violations, suggestions);
      }
    }
  }

  // ===================
  // APPLY PATTERN CHECK
  // ===================
  private static applyPatternCheck(
    check: PatternCheck,
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    // Add violation if configured
    if (check.violationKey) {
      const message =
        Config.VALIDATION_MESSAGES[
          check.violationKey as keyof typeof Config.VALIDATION_MESSAGES
        ];
      violations.push(
        check.hasFilePath ? Config.buildMessage(message, { filePath }) : message
      );
    }

    // Add suggestion
    const suggestion =
      Config.VALIDATION_MESSAGES[
        check.suggestionKey as keyof typeof Config.VALIDATION_MESSAGES
      ];
    suggestions.push(suggestion);
  }
}
