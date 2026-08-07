/**
 * Authentication Pattern Validators
 * Shared validation patterns for authentication-related checkers
 */

export class AuthenticationPatternValidators {
  /**
   * Creates a standardized security analysis workflow
   */
  static createSecurityAnalysisFlow(
    checkName: string,
    primaryCheck: {
      validator: (codeFiles: string[]) => boolean;
      violationMessage: string;
      suggestionMessage: string;
    },
    secondaryChecks?: Array<{
      validator: (codeFiles: string[]) => boolean;
      violationMessage: string;
      suggestionMessage: string;
    }>
  ) {
    return (codeFiles: string[]) => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      // Primary check
      if (!primaryCheck.validator(codeFiles)) {
        violations.push(primaryCheck.violationMessage);
        suggestions.push(primaryCheck.suggestionMessage);
      }

      // Secondary checks
      if (secondaryChecks) {
        for (const check of secondaryChecks) {
          if (!check.validator(codeFiles)) {
            violations.push(check.violationMessage);
            suggestions.push(check.suggestionMessage);
          }
        }
      }

      return { violations, suggestions };
    };
  }

  /**
   * Standard initialization pattern for authentication checkers
   */
  static initializeSecurityCheck(
    violations: string[],
    suggestions: string[]
  ): { violations: string[]; suggestions: string[] } {
    return { violations, suggestions };
  }
}
