import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { initializeNamingValidation } from '../naming-validation-base';
import { FileNamingConfiguration } from './file-naming-configuration';

/**
 * File Naming Validation
 * Specialized validation utilities for file and directory naming conventions
 */
export class FileNamingValidation {
  /**
   * Analyze file naming patterns
   */
  static analyzeFileNamingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const { violations, suggestions } = initializeNamingValidation();

    try {
      const srcPath = PathOperations.join(projectRoot, 'src');

      // Find problematic file names
      const problematicFiles = FileNamingValidation.findProblematicFileNames(
        srcPath,
        config
      );

      for (const file of problematicFiles) {
        const relativePath = PathOperations.getRelative(projectRoot, file.path);
        violations.push(`File naming issue: ${file.issue} in ${relativePath}`);
        suggestions.push(file.suggestion);
      }

      // Check directory naming
      const directoryIssues = FileNamingValidation.analyzeDirectoryNaming(
        srcPath,
        config
      );
      violations.push(...directoryIssues.violations);
      suggestions.push(...directoryIssues.suggestions);
    } catch (_error) {
      const messages = FileNamingConfiguration.getNamingSuggestionMessages({});
      suggestions.push(
        messages.verifyStructure ?? 'Verify directory structure'
      );
    }

    return { violations, suggestions };
  }

  /**
   * Find files with problematic names
   */
  static findProblematicFileNames(
    directory: string,
    config: RuleOfCodeConfig
  ): Array<{ path: string; issue: string; suggestion: string }> {
    const problems: Array<{ path: string; issue: string; suggestion: string }> =
      [];

    if (!FileUtils.exists(directory)) {
      return problems;
    }

    try {
      const entries = FileUtils.safeReadDirectory(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory()) {
          if (!FileNamingValidation.shouldSkipDirectory(entry.name)) {
            problems.push(
              ...FileNamingValidation.findProblematicFileNames(fullPath, config)
            );
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const issues = FileNamingValidation.analyzeFileName(entry.name);
          for (const issue of issues) {
            problems.push({
              path: fullPath,
              issue: issue.issue,
              suggestion: issue.suggestion,
            });
          }
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }

    return problems;
  }

  /**
   * Analyze individual file name
   */
  static analyzeFileName(
    fileName: string
  ): Array<{ issue: string; suggestion: string }> {
    const issues: Array<{ issue: string; suggestion: string }> = [];
    const baseName = PathOperations.getBasename(fileName);
    const issueMessages = FileNamingConfiguration.getNamingIssueMessages({});
    const suggestionMessages =
      FileNamingConfiguration.getNamingSuggestionMessages({});

    // Check for camelCase or kebab-case consistency
    if (FileNamingValidation.hasMixedCasing(baseName)) {
      issues.push({
        issue: issueMessages.mixedCasing ?? 'Mixed casing detected',
        suggestion:
          suggestionMessages.consistentCasing ?? 'Use consistent casing',
      });
    }

    // Check for excessive abbreviations
    if (FileNamingValidation.hasExcessiveAbbreviations(baseName)) {
      issues.push({
        issue:
          issueMessages.excessiveAbbreviations ?? 'Excessive abbreviations',
        suggestion:
          suggestionMessages.descriptiveNames ?? 'Use descriptive names',
      });
    }

    // Check for Angular naming conventions
    if (
      FileNamingValidation.isAngularFile(baseName) &&
      !FileNamingValidation.followsAngularNaming(baseName)
    ) {
      issues.push({
        issue: issueMessages.angularNaming ?? 'Angular naming issue',
        suggestion:
          suggestionMessages.angularPattern ?? 'Follow Angular pattern',
      });
    }

    return issues;
  }

  /**
   * Analyze directory naming
   */
  static analyzeDirectoryNaming(
    directory: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    if (!FileUtils.exists(directory)) {
      return { violations, suggestions };
    }

    try {
      const entries = FileUtils.safeReadDirectory(directory, config);

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !FileNamingValidation.shouldSkipDirectory(entry.name)
        ) {
          const fullPath = PathOperations.join(directory, entry.name);

          // Check directory naming conventions
          if (FileNamingValidation.hasPascalCase(entry.name)) {
            const issueMessages =
              FileNamingConfiguration.getNamingIssueMessages({});
            violations.push(
              `${issueMessages.pascalCaseDirectory}: ${entry.name}`
            );
            const kebabCaseName = FileNamingValidation.toKebabCase(entry.name);
            const suggestionMessages =
              FileNamingConfiguration.getNamingSuggestionMessages({});
            suggestions.push(
              `${suggestionMessages.kebabCaseDirectory}: ${kebabCaseName}`
            );
          }

          // Recursively check subdirectories
          const subdirAnalysis = FileNamingValidation.analyzeDirectoryNaming(
            fullPath,
            config
          );
          violations.push(...subdirAnalysis.violations);
          suggestions.push(...subdirAnalysis.suggestions);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }

    return { violations, suggestions };
  }

  /**
   * Check if filename has mixed casing
   */
  static hasMixedCasing(name: string): boolean {
    const hasUpperCase = /[A-Z]/.test(name);
    const hasHyphen = name.includes('-');
    const hasUnderscore = name.includes('_');

    return (hasUpperCase && hasHyphen) || (hasUpperCase && hasUnderscore);
  }

  /**
   * Check if filename has excessive abbreviations
   */
  static hasExcessiveAbbreviations(name: string): boolean {
    const patterns = FileNamingConfiguration.getNamingPatterns({});
    return patterns.abbreviation.test(name) && name.length < 6;
  }

  /**
   * Check if this is an Angular file
   */
  static isAngularFile(baseName: string): boolean {
    const angularSuffixes = FileNamingConfiguration.getAngularSuffixes({});
    return angularSuffixes.some(suffix => baseName.includes(suffix));
  }

  /**
   * Check if follows Angular naming convention
   */
  static followsAngularNaming(baseName: string): boolean {
    const patterns = FileNamingConfiguration.getNamingPatterns({});
    return patterns.angular.test(baseName);
  }

  /**
   * Check if name uses PascalCase
   */
  static hasPascalCase(name: string): boolean {
    const patterns = FileNamingConfiguration.getNamingPatterns({});
    return (
      patterns.pascalCase.test(name) &&
      !name.includes('-') &&
      !name.includes('_')
    );
  }

  /**
   * Convert to kebab-case
   */
  static toKebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Check if directory should be skipped
   */
  static shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = FileNamingConfiguration.getSkipDirectories({});
    return skipDirs.includes(dirname);
  }
}
