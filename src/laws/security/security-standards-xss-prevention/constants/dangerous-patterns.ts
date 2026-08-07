import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';
import { SecurityPatternConstants } from './security-pattern-constants';

/**
 * DangerousPatternsConstants
 *
 * Patterns and validation for dangerous Angular methods.
 * Single Responsibility: innerHTML, bypassSecurityTrust*, eval, document.write detection
 */
export class DangerousPatternsConstants extends SecurityPatternConstants {
  static readonly PATTERNS = {
    INNER_HTML: /\.innerHTML\s*=/i,
    BYPASS_HTML: /bypassSecurityTrustHtml\(/i,
    BYPASS_SCRIPT: /bypassSecurityTrustScript\(/i,
    BYPASS_URL: /bypassSecurityTrustUrl\(/i,
    DOCUMENT_WRITE: /document\.write\s*\(/i,
    EVAL: /eval\s*\(/i,
    INNER_HTML_BINDING: /\[innerHTML\]\s*=/i,
  };

  static readonly MESSAGES = {
    INNER_HTML: 'Direct innerHTML usage detected - potential XSS vulnerability',
    BYPASS_HTML: 'bypassSecurityTrustHtml usage without proper sanitization',
    BYPASS_SCRIPT: 'bypassSecurityTrustScript usage - extremely dangerous',
    BYPASS_URL: 'bypassSecurityTrustUrl usage without validation',
    DOCUMENT_WRITE: 'document.write usage - XSS vulnerability risk',
    EVAL: 'eval() usage - code injection vulnerability',
    INNER_HTML_BINDING: 'Angular innerHTML binding without sanitization',
  };

  static hasDangerousPattern(content: string): boolean {
    return Object.values(this.PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }
}
