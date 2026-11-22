import type { RuleOfCodeConfig } from '../../../config/types';
import { SecurityCheckerBase } from './security-checker-base';
import { AuthenticationPatternValidators } from './shared-authentication-patterns';

/**
 * Session Management Checker
 * Validates session handling and management patterns
 */
export class SessionManagementChecker extends SecurityCheckerBase {
  /**
   * Check session management implementation
   */
  static checkSessionManagement(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const sessionFlow =
      AuthenticationPatternValidators.createSecurityAnalysisFlow(
        {
          validator: codeFiles => this.hasSessionConfiguration(codeFiles),
          violationMessage: 'No secure session configuration found',
          suggestionMessage:
            'Configure secure session settings (httpOnly, secure, sameSite)',
        },
        [
          {
            validator: codeFiles => this.hasSessionTimeout(codeFiles),
            violationMessage: 'No session timeout implementation found',
            suggestionMessage: 'Implement session timeout and automatic logout',
          },
          {
            validator: codeFiles => this.hasSessionInvalidation(codeFiles),
            violationMessage: 'No proper session invalidation found',
            suggestionMessage: 'Implement session invalidation on logout',
          },
          {
            validator: codeFiles => this.hasSecureSessionStorage(codeFiles),
            violationMessage: 'Insecure session storage detected',
            suggestionMessage:
              'Use secure session storage (avoid localStorage for sensitive data)',
          },
        ]
      );

    return this.runSecurityCheck(projectRoot, config, codeFiles => {
      const { violations, suggestions } = sessionFlow(codeFiles);

      // Additional concurrent session check
      const hasConcurrentSessionHandling =
        this.hasConcurrentSessionHandling(codeFiles);
      if (!hasConcurrentSessionHandling) {
        suggestions.push('Consider implementing concurrent session management');
      }

      return { violations, suggestions };
    });
  }

  private static hasSessionConfiguration(codeFiles: string[]): boolean {
    const sessionConfigPatterns = [
      /session.*config/i,
      /httpOnly.*true/i,
      /secure.*true/i,
      /sameSite/i,
      /session.*options/i,
      /cookie.*options/i,
      /express.*session/i,
      /session.*middleware/i,
      // Firebase Auth uses secure JWT tokens instead of sessions
      /firebase.*auth/i,
      /@angular\/fire\/auth/,
      /getIdToken/,
      /getIdTokenResult/,
    ];

    return this.anyFileMatchesCode(codeFiles, sessionConfigPatterns);
  }

  private static hasSessionTimeout(codeFiles: string[]): boolean {
    const timeoutPatterns = [
      /session.*timeout/i,
      /maxAge/i,
      /expires/i,
      /session.*expir/i,
      /timeout.*session/i,
      /idle.*timeout/i,
      /auto.*logout/i,
      /session.*duration/i,
    ];

    return this.anyFileMatchesCode(codeFiles, timeoutPatterns);
  }

  private static hasSessionInvalidation(codeFiles: string[]): boolean {
    const invalidationPatterns = [
      /session.*destroy/i,
      /session.*invalidate/i,
      /logout.*session/i,
      /clear.*session/i,
      /session.*clear/i,
      /req\.session\.destroy/,
      /session\.invalidate/,
      /removeSession/i,
      // Firebase Auth signOut invalidates tokens
      /signOut/,
      /auth\.signOut/,
      /firebase.*signOut/i,
      /logout.*firebase/i,
    ];

    return this.anyFileMatchesCode(codeFiles, invalidationPatterns);
  }

  private static hasConcurrentSessionHandling(codeFiles: string[]): boolean {
    const concurrentPatterns = [
      /concurrent.*session/i,
      /multiple.*session/i,
      /session.*limit/i,
      /max.*session/i,
      /duplicate.*session/i,
      /active.*session.*count/i,
    ];

    return this.anyFileMatchesCode(codeFiles, concurrentPatterns);
  }

  private static hasSecureSessionStorage(codeFiles: string[]): boolean {
    let hasSecureStorage = false;
    let hasInsecureStorage = false;

    const secureStoragePatterns = [
      /sessionStorage\.setItem.*(?!.*password|.*token|.*secret)/i,
      /secure.*storage/i,
      /encrypted.*storage/i,
      /httpOnly.*cookie/i,
    ];

    const insecureStoragePatterns = [
      /localStorage\.setItem.*(?:password|token|secret|auth)/i,
      /sessionStorage\.setItem.*(?:password|token|secret|auth)/i,
      /document\.cookie.*(?:password|token|secret)/i,
    ];

    hasSecureStorage = this.anyFileMatchesCode(
      codeFiles,
      secureStoragePatterns
    );
    hasInsecureStorage = this.anyFileMatchesCode(
      codeFiles,
      insecureStoragePatterns
    );

    return hasSecureStorage || !hasInsecureStorage;
  }
}
