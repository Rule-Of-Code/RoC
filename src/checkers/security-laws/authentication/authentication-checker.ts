import type { RuleOfCodeConfig } from '../../../config/types';
import { SecurityCheckerBase } from './security-checker-base';
import { AuthenticationPatternValidators } from './shared-authentication-patterns';

/** Said when a managed auth SDK holds the tokens (#549). */
export const MANAGED_TOKENS_NOTE =
  'Tokens are held by a managed auth SDK: token storage and refresh are the SDK’s and are not asked for (tokens the app itself writes to web storage are still judged)';

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
          'Sign users in through a managed auth SDK or your own sign-in, and attach the credential to requests (an interceptor or middleware)',
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

      // A managed SDK holds the tokens (#549): say so, instead of asking how
      // the app stores them.
      if (this.authShapeOf(codeFiles).managedSdk) {
        suggestions.push(MANAGED_TOKENS_NOTE);
      }

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

  /**
   * Authentication by what the code does (#549): it imports a managed auth
   * SDK or a server session library, calls a sign-in or verifies a
   * credential, or attaches a credential to its requests. What a class is
   * called is not authentication — an empty `class AuthService {}` is none,
   * and a provider over a managed SDK called anything is one.
   */
  private static hasAuthenticationService(codeFiles: string[]): boolean {
    const shape = this.authShapeOf(codeFiles);
    return (
      shape.managedSdk ||
      shape.serverSession ||
      shape.signsInOrVerifies ||
      shape.attachesCredentials
    );
  }

  /**
   * Token handling: an SDK that holds the token (and the calls that read it),
   * a token attached to requests, tokens signed or verified, or kept in web
   * storage. A variable called `accessToken` or a class called `TokenService`
   * is not token management (#549).
   */
  private static hasTokenManagement(codeFiles: string[]): boolean {
    const shape = this.authShapeOf(codeFiles);
    // A JWT library (jose's SignJWT / jwtVerify, jsonwebtoken, …) is token
    // management too (#590).
    if (
      shape.managedSdk ||
      shape.readsSdkToken ||
      shape.attachesCredentials ||
      shape.jwtLibrary
    )
      return true;
    return this.anyFileMatchesCode(codeFiles, [
      /localStorage\.setItem.*token/i,
      /sessionStorage\.setItem.*token/i,
      /\bjwt\.(?:sign|verify)\s*\(/,
    ]);
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
  ];

  private static hasSecurePasswordHandling(codeFiles: string[]): boolean {
    return this.anyFileMatchesCode(codeFiles, this.SECURE_PASSWORD_PATTERNS);
  }

  /**
   * Weak hashing of a password, or a password compared directly
   * (`user.password === password`): only a value stored as written compares
   * that way (#590). A name such as `plainTextPassword` handed to
   * `bcrypt.compare` is not plaintext handling.
   */
  private static hasInsecurePasswordHandling(codeFiles: string[]): boolean {
    return (
      this.authShapeOf(codeFiles).comparesPasswordDirectly ||
      this.anyFileMatchesCode(codeFiles, this.INSECURE_PASSWORD_PATTERNS)
    );
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
