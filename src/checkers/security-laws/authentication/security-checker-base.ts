import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../../utils/checker-utils';
import { FileUtils } from '../../../utils/file-utils';
import { PathOperations } from '../../../utils/path-operations';

/**
 * Base class for Security Checkers
 * Consolidates common security analysis patterns and patterns
 */
export class SecurityCheckerBase {
  /**
   * Common initialization for security checkers
   * Validates src path and returns code files
   * Supports both standard projects and Nx monorepo structure
   */
  protected static initializeSecurityCheck(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[]; codeFiles: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let codeFiles: string[] = [];

    // For security checks, we need to scan ALL code files, not just includes
    // Authorization patterns (guards, RBAC, etc.) can be anywhere in the project
    const scanConfig: RuleOfCodeConfig = {
      ...config,
      includes: undefined, // Remove includes filtering for security checks
    };

    // Try standard src path first
    const srcPath = PathOperations.join(projectRoot, 'src');
    if (FileUtils.exists(srcPath)) {
      codeFiles = CheckerUtils.findFilesByExtension(
        srcPath,
        CheckerUtils.getCommonExtensions().ALL_CODE,
        scanConfig
      );
    }

    // If no files found, try Nx monorepo structure (apps/*/src and libs/*/src)
    if (codeFiles.length === 0) {
      const appsPath = PathOperations.join(projectRoot, 'apps');
      const libsPath = PathOperations.join(projectRoot, 'libs');

      if (FileUtils.exists(appsPath)) {
        const appsFiles = CheckerUtils.findFilesByExtension(
          appsPath,
          CheckerUtils.getCommonExtensions().ALL_CODE,
          scanConfig
        );
        codeFiles = [...codeFiles, ...appsFiles];
      }

      if (FileUtils.exists(libsPath)) {
        const libsFiles = CheckerUtils.findFilesByExtension(
          libsPath,
          CheckerUtils.getCommonExtensions().ALL_CODE,
          scanConfig
        );
        codeFiles = [...codeFiles, ...libsFiles];
      }
    }

    return { violations, suggestions, codeFiles };
  }

  /**
   * Generic security checker pattern
   * Eliminates duplicate initialization and early return logic
   */
  protected static runSecurityCheck<
    T extends { violations: string[]; suggestions: string[] },
  >(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checkFunction: (codeFiles: string[]) => T
  ): T {
    const { violations, suggestions, codeFiles } = this.initializeSecurityCheck(
      projectRoot,
      config
    );

    // If no code files found, return early with empty violations/suggestions
    if (codeFiles.length === 0) {
      return { violations, suggestions } as T;
    }

    // Run the check function with code files
    const result = checkFunction(codeFiles);

    // Merge violations and suggestions from initialization with check results
    return {
      ...result,
      violations: [...violations, ...result.violations],
      suggestions: [...suggestions, ...result.suggestions],
    } as T;
  }

  /**
   * Common pattern for adding violation and suggestion pair
   */
  protected static addViolationWithSuggestion(
    violations: string[],
    suggestions: string[],
    violation: string,
    suggestion: string
  ): void {
    violations.push(violation);
    suggestions.push(suggestion);
  }
}
