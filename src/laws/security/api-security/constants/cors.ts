import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * CORSConstants
 *
 * CORS configuration and validation patterns.
 * Single Responsibility: CORS header and middleware validation
 */
export class CORSConstants {
  static readonly CORS_PATTERNS = {
    CORS_MIDDLEWARE: /cors/i,
    ACCESS_CONTROL_HEADER: /Access-Control-Allow-Origin/i,
    EXPRESS: /express/i,
  };

  static readonly CONFIG_FILES = [
    'proxy.conf.json',
    'functions/src/index.ts',
    'server.ts',
    'main.ts',
    'app.ts',
  ];

  static hasCorsMiddleware(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.CORS_PATTERNS.CORS_MIDDLEWARE
    );
  }

  static hasAccessControlHeader(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.CORS_PATTERNS.ACCESS_CONTROL_HEADER
    );
  }

  static isExpressServerMissingCors(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.CORS_PATTERNS.EXPRESS
      ) &&
      !PatternMatchingUtils.hasRegexPattern(
        content,
        this.CORS_PATTERNS.CORS_MIDDLEWARE
      )
    );
  }
}
