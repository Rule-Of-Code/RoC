import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * APIAuthenticationConstants
 *
 * API authentication and authorization configuration.
 * Single Responsibility: Authentication service patterns and token handling
 */
export class APIAuthenticationConstants {
  static readonly AUTH_PATTERNS = {
    AUTHORIZATION_HEADER: /Authorization|Bearer/i,
    TOKEN_REFRESH: /refresh|renew/i,
    SECURE_STORAGE: /secure|encrypt/i,
    AUTH_SERVICE: /auth\.(service|guard)/i,
  };

  static readonly INSECURE_PATTERNS = {
    LOCALSTORAGE: /localStorage/,
    SESSIONSTORAGE: /sessionStorage/,
  };

  static readonly AUTH_FILES = [
    'auth.service.ts',
    'authentication.service.ts',
    'token.service.ts',
    'auth.interceptor.ts',
    'auth.guard.ts',
  ];

  static hasAuthorizationHandling(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.AUTH_PATTERNS.AUTHORIZATION_HEADER
    );
  }

  static hasTokenRefreshMechanism(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.AUTH_PATTERNS.TOKEN_REFRESH
    );
  }

  static hasInsecureTokenStorage(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.INSECURE_PATTERNS.LOCALSTORAGE
      ) &&
      !PatternMatchingUtils.hasRegexPattern(
        content,
        this.AUTH_PATTERNS.SECURE_STORAGE
      )
    );
  }
}
