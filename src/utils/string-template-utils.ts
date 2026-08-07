/**
 * String Template Utilities
 * Centralized string template processing and placeholder replacement
 * Meta-dogfooding: Eliminates 20+ duplicate applyPlaceholders methods across Angular configuration files
 */
export class StringTemplateUtils {
  /**
   * Apply placeholders to message template with indexed placeholders {0}, {1}, {2}, etc.
   * RULE 1: Centralized implementation - replaces identical methods in 20+ configuration files
   *
   * @param template - Template string with {0}, {1}, etc. placeholders
   * @param replacements - Values to replace placeholders with
   * @returns Formatted string with placeholders replaced
   *
   * @example
   * ```typescript
   * StringTemplateUtils.formatTemplate('Error in {0} at line {1}', 'file.ts', '42')
   * // Returns: 'Error in file.ts at line 42'
   * ```
   */
  static formatTemplate(template: string, ...replacements: string[]): string {
    if (!replacements.length) return template;

    let result = template;
    replacements.forEach((replacement, index) => {
      const placeholder = `{${index}}`;
      result = result.replace(placeholder, replacement);
    });
    return result;
  }

  /**
   * Apply named placeholders to template with {name} syntax
   * RULE 2: Extended functionality for named placeholder support
   *
   * @param template - Template string with {name} placeholders
   * @param replacements - Object with placeholder names as keys and replacement values
   * @returns Formatted string with named placeholders replaced
   *
   * @example
   * ```typescript
   * StringTemplateUtils.formatNamedTemplate('Error in {fileName} at {location}', {
   *   fileName: 'module.ts',
   *   location: 'line 42'
   * })
   * // Returns: 'Error in module.ts at line 42'
   * ```
   */
  static formatNamedTemplate(
    template: string,
    replacements: Record<string, number | string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  /**
   * Check if template contains placeholders
   * RULE 2: Utility method for template validation
   */
  static hasPlaceholders(template: string): boolean {
    return /\{\w*\d*\}/.test(template);
  }

  /**
   * Extract placeholder names from template
   * RULE 2: Analysis utility for template introspection
   */
  static extractPlaceholders(template: string): string[] {
    const matches = template.match(/\{(\w*\d*)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }
}
