import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { initializeNamingValidation } from '../naming-validation-base';
import { CodeNamingConfiguration } from './code-naming-configuration';

/**
 * Code Naming Validation
 * Specialized validation utilities for code naming pattern analysis
 */
export class CodeNamingValidation {
  /**
   * Validate code naming patterns in TypeScript files
   */
  static validateCodeNamingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig,
    _validationConfig: Record<string, unknown> = {}
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const { violations, suggestions } = initializeNamingValidation();

    try {
      const srcPath = PathOperations.join(projectRoot, 'src');
      if (!FileUtils.exists(srcPath)) {
        return { violations, suggestions };
      }

      const tsFiles = CheckerUtils.findFilesByExtension(
        srcPath,
        CheckerUtils.getCommonExtensions().TYPESCRIPT,
        config
      );

      const analysisConfig = CodeNamingConfiguration.getAnalysisConfig({});
      let totalViolations = 0;
      const exampleViolations: string[] = [];

      for (const file of tsFiles) {
        try {
          const content = FileUtils.readFile(file, { encoding: 'utf8' });
          const fileViolations =
            CodeNamingValidation.analyzeFileContent(content);
          totalViolations += fileViolations.length;

          if (
            fileViolations.length > 0 &&
            exampleViolations.length < analysisConfig.maxExampleViolations
          ) {
            const fileName = PathOperations.getRelative(projectRoot, file);
            exampleViolations.push(
              `${fileName}: ${fileViolations
                .slice(0, analysisConfig.maxExamplesPerViolation)
                .join(', ')}`
            );
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }

      if (totalViolations > 0) {
        const messages = CodeNamingConfiguration.getValidationMessages({});
        const suggestionMessages =
          CodeNamingConfiguration.getSuggestionMessages({});

        violations.push(messages.totalViolationsFound(totalViolations));

        if (exampleViolations.length > 0) {
          suggestions.push(
            suggestionMessages.exampleViolations(exampleViolations)
          );
        }

        suggestions.push(suggestionMessages.followConventions);
      }
    } catch (_error) {
      const suggestionMessages = CodeNamingConfiguration.getSuggestionMessages(
        {}
      );
      suggestions.push(suggestionMessages.unableToAnalyze);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze naming patterns in code content
   */
  static analyzeFileContent(content: string): string[] {
    const violations: string[] = [];

    CodeNamingValidation.checkVariableNaming(content, violations);
    CodeNamingValidation.checkFunctionNaming(content, violations);
    CodeNamingValidation.checkClassNaming(content, violations);
    CodeNamingValidation.checkInterfaceNaming(content, violations);
    CodeNamingValidation.checkMethodNaming(content, violations);

    const analysisConfig = CodeNamingConfiguration.getAnalysisConfig({});
    return violations.slice(0, analysisConfig.maxViolationsPerFile);
  }

  /**
   * Generic helper to check naming patterns
   */
  private static checkNamingPattern(
    content: string,
    pattern: RegExp,
    isInvalidFn: (name: string) => boolean,
    messageFn: (name: string) => string,
    violations: string[]
  ): void {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      if (name && isInvalidFn(name)) {
        violations.push(messageFn(name));
      }
    }
  }

  /**
   * Check variable naming conventions
   */
  static checkVariableNaming(content: string, violations: string[]): void {
    const patterns = CodeNamingConfiguration.getNamingPatterns({});
    const messages = CodeNamingConfiguration.getValidationMessages({});

    CodeNamingValidation.checkNamingPattern(
      content,
      patterns.variable,
      CodeNamingValidation.isInvalidVariableName,
      messages.invalidVariableName,
      violations
    );
  }

  /**
   * Check function naming conventions
   */
  static checkFunctionNaming(content: string, violations: string[]): void {
    const patterns = CodeNamingConfiguration.getNamingPatterns({});
    const messages = CodeNamingConfiguration.getValidationMessages({});

    CodeNamingValidation.checkNamingPattern(
      content,
      patterns.function,
      CodeNamingValidation.isInvalidFunctionName,
      messages.invalidFunctionName,
      violations
    );
  }

  /**
   * Check class naming conventions
   */
  static checkClassNaming(content: string, violations: string[]): void {
    const patterns = CodeNamingConfiguration.getNamingPatterns({});
    const messages = CodeNamingConfiguration.getValidationMessages({});

    CodeNamingValidation.checkNamingPattern(
      content,
      patterns.class,
      name =>
        CodeNamingValidation.isInvalidName(name, { requirePascalCase: true }),
      messages.invalidClassName,
      violations
    );
  }

  /**
   * Check interface naming conventions
   */
  static checkInterfaceNaming(content: string, violations: string[]): void {
    const patterns = CodeNamingConfiguration.getNamingPatterns({});
    const messages = CodeNamingConfiguration.getValidationMessages({});

    CodeNamingValidation.checkNamingPattern(
      content,
      patterns.interface,
      name =>
        CodeNamingValidation.isInvalidName(name, { requirePascalCase: true }),
      messages.invalidInterfaceName,
      violations
    );
  }

  /**
   * Check method naming conventions
   */
  static checkMethodNaming(content: string, violations: string[]): void {
    const patterns = CodeNamingConfiguration.getNamingPatterns({});
    const messages = CodeNamingConfiguration.getValidationMessages({});

    CodeNamingValidation.checkNamingPattern(
      content,
      patterns.method,
      CodeNamingValidation.isInvalidMethodName,
      messages.invalidMethodName,
      violations
    );
  }

  /**
   * Generic helper to validate name with configurable checks
   */
  private static isInvalidName(
    name: string,
    checks: {
      requireCamelCase?: boolean;
      requirePascalCase?: boolean;
      checkTooShort?: boolean;
      checkInvalidChars?: boolean;
      allowedExceptions?: string[];
    }
  ): boolean {
    if (CodeNamingValidation.isCommonPattern(name)) {
      return false;
    }

    if (checks.allowedExceptions?.includes(name)) {
      return false;
    }

    if (checks.requireCamelCase && !CodeNamingValidation.isCamelCase(name)) {
      return true;
    }

    if (checks.requirePascalCase && !CodeNamingValidation.isPascalCase(name)) {
      return true;
    }

    if (checks.checkTooShort && CodeNamingValidation.isTooShort(name)) {
      return true;
    }

    if (
      checks.checkInvalidChars &&
      CodeNamingValidation.hasInvalidChars(name)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if variable name is invalid
   */
  static isInvalidVariableName(name: string): boolean {
    return CodeNamingValidation.isInvalidName(name, {
      requireCamelCase: true,
      checkTooShort: true,
      checkInvalidChars: true,
    });
  }

  /**
   * Check if function name is invalid
   */
  static isInvalidFunctionName(name: string): boolean {
    return CodeNamingValidation.isInvalidName(name, {
      requireCamelCase: true,
      checkTooShort: true,
    });
  }

  /**
   * Check if method name is invalid
   */
  static isInvalidMethodName(name: string): boolean {
    const angularMethods = CodeNamingConfiguration.getAngularLifecycleMethods(
      {}
    );

    return CodeNamingValidation.isInvalidName(name, {
      requireCamelCase: true,
      checkTooShort: true,
      allowedExceptions: angularMethods,
    });
  }

  /**
   * Check if name is camelCase
   */
  static isCamelCase(name: string): boolean {
    const casePatterns = CodeNamingConfiguration.getCasePatterns({});
    return casePatterns.camelCase.test(name);
  }

  /**
   * Check if name is PascalCase
   */
  static isPascalCase(name: string): boolean {
    const casePatterns = CodeNamingConfiguration.getCasePatterns({});
    return casePatterns.pascalCase.test(name);
  }

  /**
   * Check if name is too short
   */
  static isTooShort(name: string): boolean {
    const shortNames = CodeNamingConfiguration.getAllowedShortNames({});
    return name.length < 2 && !shortNames.includes(name);
  }

  /**
   * Check if name has invalid characters
   */
  static hasInvalidChars(name: string): boolean {
    const casePatterns = CodeNamingConfiguration.getCasePatterns({});
    return casePatterns.invalidChars.test(name);
  }

  /**
   * Check if this is a common pattern that should be ignored
   */
  static isCommonPattern(name: string): boolean {
    const commonPatterns = CodeNamingConfiguration.getCommonPatterns({});
    return (
      commonPatterns.includes(name) ||
      name.startsWith('_') ||
      name.endsWith('_')
    );
  }
}
