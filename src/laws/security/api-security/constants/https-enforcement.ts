import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * HttpsEnforcementConstants
 *
 * HTTPS/TLS enforcement configuration and patterns.
 * Single Responsibility: HTTPS redirect and TLS configuration validation
 */
export class HttpsEnforcementConstants {
  static readonly SSL_PATTERNS = {
    SSL_CERTIFICATE: /ssl_certificate/i,
    HTTPS_REDIRECT: /https.*redirect/i,
    TLS_VERSION: /TLSv1\.[2-3]|ssl_protocols/i,
  };

  static readonly CONFIG_FILES = [
    'firebase.json',
    'nginx.conf',
    'ngsw-config.json',
  ];

  static readonly ENV_FILES = [
    'src/environments/environment.ts',
    'src/environments/environment.prod.ts',
  ];

  static hasHttpsConfiguration(content: string): boolean {
    return Object.values(this.SSL_PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  static hasNonLocalHttpEndpoint(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(content, /http:\/\//) &&
      !content.includes('localhost')
    );
  }
}
