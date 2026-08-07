/**
 * Angular Validation Utilities
 * Centralized validation helpers for Angular analyzers
 * Meta-dogfooding: Eliminates duplicated validation logic across Angular utilities
 */
export class AngularValidationUtils {
  /**
   * Generic content validation helper with violations and suggestions support
   * Meta-dogfooding: Centralizes validation patterns across all Angular analyzers
   */
  static validateContent(
    content: string,
    fileName: string,
    checks: Array<{
      condition: boolean;
      violationMessage?: string;
      suggestionMessage?: string;
    }>,
    violations: string[],
    suggestions: string[]
  ): void {
    checks.forEach(check => {
      if (check.condition) {
        if (check.violationMessage) {
          violations.push(`${check.violationMessage} in ${fileName}`);
        }
        if (check.suggestionMessage) {
          suggestions.push(`${check.suggestionMessage} in ${fileName}`);
        }
      }
    });
  }

  /**
   * Suggestions-only validation helper for lighter use cases
   * Meta-dogfooding: Provides consistent suggestion patterns
   */
  static validateAndSuggest(
    content: string,
    fileName: string,
    checks: Array<{
      condition: boolean;
      suggestionMessage?: string;
    }>,
    suggestions: string[]
  ): void {
    checks.forEach(check => {
      if (check.condition && check.suggestionMessage) {
        suggestions.push(`${check.suggestionMessage} in ${fileName}`);
      }
    });
  }
}
