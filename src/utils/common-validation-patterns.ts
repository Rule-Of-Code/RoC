/**
 * Common Validation Patterns
 * Extracts shared violation and suggestion patterns used across multiple checkers
 */

import { GitTagVersion } from './git-tag-version';

/** Interface for file existence checking utilities */
export interface FileExistsChecker {
  exists: (path: string) => boolean;
}

export class CommonValidationPatterns {
  /**
   * Creates a result for file/directory check operations
   */
  private static createCheckResult(
    exists: boolean,
    violations: string[] = [],
    suggestions: string[] = []
  ): { exists: boolean; violations: string[]; suggestions: string[] } {
    return { exists, violations, suggestions };
  }

  /**
   * Checks if directory exists and returns common violations
   */
  static checkDirectoryExists(
    directoryPath: string,
    directoryName: string,
    fileUtils: FileExistsChecker
  ): { exists: boolean; violations: string[]; suggestions: string[] } {
    if (!fileUtils.exists(directoryPath)) {
      return this.createCheckResult(
        false,
        [`${directoryName} directory not found`],
        [`Create ${directoryName} directory`]
      );
    }

    return this.createCheckResult(true);
  }

  /**
   * Checks if file exists and returns common violations
   */
  static checkFileExists(
    filePath: string,
    fileName: string,
    fileUtils: FileExistsChecker
  ): { exists: boolean; violations: string[]; suggestions: string[] } {
    if (!fileUtils.exists(filePath)) {
      return this.createCheckResult(
        false,
        [`${fileName} not found`],
        [`Create ${fileName}`]
      );
    }

    return this.createCheckResult(true);
  }

  /**
   * Checks if any of multiple files exist
   */
  static checkAnyFileExists(
    filePaths: string[],
    description: string,
    fileUtils: FileExistsChecker
  ): { exists: boolean; violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const exists = filePaths.some(path => fileUtils.exists(path));
    if (!exists) {
      violations.push(`No ${description} found`);
      suggestions.push(`Create one of: ${filePaths.join(', ')}`);
    }

    return { exists, violations, suggestions };
  }

  /**
   * Checks if all of multiple files exist
   */
  static checkAllFilesExist(
    filePaths: string[],
    description: string,
    fileUtils: FileExistsChecker
  ): {
    allExist: boolean;
    missing: string[];
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const missing: string[] = [];

    for (const path of filePaths) {
      if (!fileUtils.exists(path)) {
        missing.push(path);
      }
    }

    if (missing.length > 0) {
      violations.push(`Missing ${description} files: ${missing.join(', ')}`);
      suggestions.push(`Create missing ${description} files`);
    }

    return {
      allExist: missing.length === 0,
      missing,
      violations,
      suggestions,
    };
  }

  /**
   * Creates violation for missing configuration
   */
  static missingConfigViolation(configName: string): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `No ${configName} configuration found`,
      suggestion: `Create ${configName} configuration`,
    };
  }

  /**
   * Creates violation for invalid configuration
   */
  static invalidConfigViolation(
    configName: string,
    reason?: string
  ): { violation: string; suggestion: string } {
    const reasonText = reason ? ` (${reason})` : '';
    return {
      violation: `Invalid ${configName} configuration${reasonText}`,
      suggestion: `Fix ${configName} configuration`,
    };
  }

  /**
   * Creates violation for missing dependency
   */
  static missingDependencyViolation(depName: string): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `Missing dependency: ${depName}`,
      suggestion: `Install ${depName}: npm install ${depName}`,
    };
  }

  /**
   * Creates violation for missing script
   */
  static missingScriptViolation(
    scriptName: string,
    recommendedScript?: string
  ): { violation: string; suggestion: string } {
    const suggestion = recommendedScript
      ? `Add script: "${scriptName}": "${recommendedScript}"`
      : `Add ${scriptName} script to package.json`;
    return {
      violation: `Missing npm script: ${scriptName}`,
      suggestion,
    };
  }

  /**
   * Creates violation for missing tool configuration
   */
  static missingToolConfigViolation(toolName: string): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `No ${toolName} configuration found`,
      suggestion: `Configure ${toolName} in project`,
    };
  }

  /**
   * Creates violation for uncompleted checklist
   */
  static incompleteChecklistViolation(
    checklistName: string,
    missingItems: string[]
  ): { violation: string; suggestion: string } {
    return {
      violation: `${checklistName} incomplete: missing ${missingItems.join(', ')}`,
      suggestion: `Complete ${checklistName} items`,
    };
  }

  /**
   * Validates pattern and returns violations
   */
  static validatePattern(
    pattern: RegExp,
    value: string,
    description: string
  ): { valid: boolean; violation?: string; suggestion?: string } {
    if (!pattern.test(value)) {
      return {
        valid: false,
        violation: `Invalid ${description}: ${value}`,
        suggestion: `Use proper ${description} format`,
      };
    }
    return { valid: true };
  }

  /**
   * Validates version format
   */
  static validateSemVer(version: string): {
    valid: boolean;
    violation?: string;
    suggestion?: string;
  } {
    // One definition of SemVer for the whole tool. Four had accumulated, in
    // four dialects; two of them belonged to laws that judge the same tags,
    // which is how one defect came to need fixing twice.
    return this.validatePattern(
      GitTagVersion.semVerPattern(),
      version,
      'semantic version'
    );
  }
}
