import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { SecurityPatternConstants } from './security-pattern-constants';

/**
 * TemplateSafetyConstants
 *
 * HTML template security patterns and validation.
 * Single Responsibility: Unsafe template patterns detection
 */
export class TemplateSafetyConstants extends SecurityPatternConstants {
  static readonly PATTERNS = {
    UNSAFE_INNER_HTML: /\[innerHTML\]\s*=\s*["'][^"']*\{\{/,
    INLINE_SCRIPT: /<script[^>]*>/i,
    JAVASCRIPT_PROTOCOL: /javascript:/i,
    INLINE_HANDLERS: /on\w+\s*=/i,
  };

  static readonly MESSAGES = {
    UNSAFE_INNER_HTML: 'Unsafe innerHTML binding with interpolation',
    INLINE_SCRIPT: 'Inline script tag found in template',
    JAVASCRIPT_PROTOCOL: 'Unsafe protocol usage in template',
    INLINE_HANDLERS: 'Inline event handlers found in template',
  };

  static readonly EXTENSIONS = ['.html', '.ng', '.component.html'];

  static hasUnsafePattern(content: string): boolean {
    return Object.values(this.PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  static isTemplateFile(filename: string): boolean {
    return this.EXTENSIONS.some(ext => filename.endsWith(ext));
  }
}
