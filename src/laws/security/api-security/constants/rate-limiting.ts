import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * RateLimitingConstants
 *
 * Rate limiting configuration and implementation patterns.
 * Single Responsibility: Rate limiting detection and validation
 */
export class RateLimitingConstants {
  static readonly RATE_LIMIT_PATTERNS = {
    CLIENT_RATE_LIMIT: /rateLimit|throttle/i,
    SERVER_RATE_LIMIT: /limit_req|rate_limit/i,
    CORS_FUNCTION: /https\.onRequest|cors/i,
  };

  static readonly INTERCEPTOR_PATTERNS = {
    INTERCEPTOR_FILE: /\.interceptor\.ts$/,
    RATE_LIMIT: /rateLimit|throttle/i,
  };

  static readonly CONFIG_FILES = ['nginx.conf', 'server.ts', 'main.ts'];

  static readonly FUNCTIONS_PATH = 'functions';

  static hasRateLimitPattern(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.RATE_LIMIT_PATTERNS.CLIENT_RATE_LIMIT
      ) ||
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.RATE_LIMIT_PATTERNS.SERVER_RATE_LIMIT
      )
    );
  }

  static hasMissingCorsInFunction(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.RATE_LIMIT_PATTERNS.CORS_FUNCTION
      ) && !content.includes('cors')
    );
  }
}
