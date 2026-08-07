import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * CSPConstants
 *
 * Content Security Policy configuration and validation.
 * Single Responsibility: CSP headers, directives, unsafe practices detection
 */
export class CSPConstants {
  static readonly CONFIG_FILES = [
    'config/security-headers.config.js',
    'config/security-headers.conf',
    'src/security-config.ts',
    'angular.json',
  ];

  static readonly PATTERNS = {
    HEADER: /Content-Security-Policy|CSP/,
  };

  static readonly REQUIRED_DIRECTIVES = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
  ];

  static readonly UNSAFE_PRACTICES = ["'unsafe-inline'", "'unsafe-eval'"];

  static hasConfiguration(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(content, this.PATTERNS.HEADER);
  }

  static hasMissingDirective(content: string, directive: string): boolean {
    return !content.includes(directive);
  }

  static hasUnsafePractice(content: string): boolean {
    return this.UNSAFE_PRACTICES.some(practice => content.includes(practice));
  }
}
