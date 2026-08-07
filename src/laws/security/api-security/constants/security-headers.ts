import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * SecurityHeadersConstants
 *
 * Security headers configuration and validation.
 * Single Responsibility: Security header detection and validation
 */
export class SecurityHeadersConstants {
  static readonly SECURITY_HEADERS = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy',
  ];

  static readonly HEADER_PATTERNS = {
    NGINX_HEADER: /add_header/i,
    INTERCEPTOR: /\.interceptor\.ts$/,
    SECURITY_HEADER: /X-Content-Type-Options|X-Frame-Options|CSP|HSTS/i,
  };

  static readonly CONFIG_FILES = ['nginx.conf'];

  static hasSecurityHeader(content: string): boolean {
    return this.SECURITY_HEADERS.some(header => content.includes(header));
  }

  /** Is THIS specific header present? The per-header loop must use this — calling
   *  hasSecurityHeader() in the loop ignored the header and reported all-or-nothing. */
  static hasSpecificHeader(content: string, header: string): boolean {
    return content.includes(header);
  }

  static hasSecurityHeaderPattern(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.HEADER_PATTERNS.SECURITY_HEADER
    );
  }

  static getMissingHeaders(content: string): string[] {
    return this.SECURITY_HEADERS.filter(header => !content.includes(header));
  }
}
