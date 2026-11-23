import type { RuleOfCodeConfig } from '../../../config/types';
import { SecurityCheckerBase } from './security-checker-base';
import { AuthenticationPatternValidators } from './shared-authentication-patterns';

/**
 * Authentication Implementation Checker
 * Validates authentication patterns and implementations
 */
export class AuthenticationChecker extends SecurityCheckerBase {
  /**
   * Check authentication implementation patterns
   */
  static checkAuthenticationImplementation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const authFlow = AuthenticationPatternValidators.createSecurityAnalysisFlow(
      {
        validator: codeFiles => this.hasAuthenticationService(codeFiles),
        violationMessage: 'No authentication service implementation found',
        suggestionMessage:
          'Implement a dedicated authentication service (AuthService, AuthManager)',
      },
      [
        {
          validator: codeFiles => this.hasTokenManagement(codeFiles),
          violationMessage: 'No proper token management implementation found',
          suggestionMessage: 'Implement secure token storage and management',
        },
        // "Insecure" only where an insecure pattern IS in the code (md5/sha1/btoa
        // of a password, a plaintext one). Absent hashing used to be reported
        // as "Insecure password handling detected" — on a 3-line project that
        // handles no password at all (B4).
        {
          validator: codeFiles => !this.hasInsecurePasswordHandling(codeFiles),
          violationMessage: 'Insecure password handling detected',
          suggestionMessage: 'Use proper password hashing and validation',
        },
        {
          validator: codeFiles =>
            !this.handlesPasswords(codeFiles) ||
            this.hasSecurePasswordHandling(codeFiles),
          violationMessage:
            'Passwords are handled without a recognised hashing library (bcrypt, scrypt, argon2, pbkdf2) or managed auth',
          suggestionMessage:
            'Hash passwords with bcrypt, scrypt or argon2, or delegate to a managed auth provider',
        },
      ]
    );

    return this.runSecurityCheck(projectRoot, config, codeFiles => {
      const { violations, suggestions } = authFlow(codeFiles);

      // Additional OAuth check
      const hasOAuthIntegration = this.hasOAuthIntegration(codeFiles);
      if (!hasOAuthIntegration) {
        suggestions.push(
          'Consider implementing OAuth2/SSO for enhanced security'
        );
      }

      return { violations, suggestions };
    });
  }

  private static hasAuthenticationService(codeFiles: string[]): boolean {
    const authPatterns = [
      /class.*Auth.*Service/,
      /class.*Authentication.*Service/,
      /AuthService/,
      /AuthManager/,
      /LoginService/,
      /UserAuthentication/,
    ];

    return this.anyFileMatchesCode(codeFiles, authPatterns);
  }

  private static hasTokenManagement(codeFiles: string[]): boolean {
    const tokenPatterns = [
      /localStorage\.setItem.*token/i,
      /sessionStorage\.setItem.*token/i,
      /jwt\.sign/,
      /jwt\.verify/,
      /TokenManager/,
      /TokenService/,
      /refreshToken/,
      /accessToken/,
    ];

    return this.anyFileMatchesCode(codeFiles, tokenPatterns);
  }

  private static readonly SECURE_PASSWORD_PATTERNS = [
    /bcrypt/,
    /scrypt/,
    /argon2/,
    /pbkdf2/,
    /crypto\.hash/,
    /password.*hash/i,
    /hash.*password/i,
    // Firebase Auth handles passwords securely server-side
    /firebase.*auth/i,
    /@angular\/fire\/auth/,
    /signInWithEmailAndPassword/,
    /createUserWithEmailAndPassword/,
  ];

  private static readonly INSECURE_PASSWORD_PATTERNS = [
    /md5.*password/i,
    /sha1.*password/i,
    /btoa.*password/i,
    /password.*plain/i,
    /plaintext.*password/i,
  ];

  private static hasSecurePasswordHandling(codeFiles: string[]): boolean {
    return this.anyFileMatchesCode(codeFiles, this.SECURE_PASSWORD_PATTERNS);
  }

  private static hasInsecurePasswordHandling(codeFiles: string[]): boolean {
    return this.anyFileMatchesCode(codeFiles, this.INSECURE_PASSWORD_PATTERNS);
  }

  /** The code handles passwords at all — the word as an identifier or key. */
  private static handlesPasswords(codeFiles: string[]): boolean {
    return this.anyFileMatchesCode(codeFiles, [/\bpassword\b/i]);
  }

  private static hasOAuthIntegration(codeFiles: string[]): boolean {
    const oauthPatterns = [
      /oauth/i,
      /passport/,
      /google.*auth/i,
      /facebook.*auth/i,
      /microsoft.*auth/i,
      /github.*auth/i,
      /auth0/i,
      /okta/i,
      /firebase.*auth/i,
    ];

    return this.anyFileMatchesCode(codeFiles, oauthPatterns);
  }
}
