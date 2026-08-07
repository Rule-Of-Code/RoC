import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../../utils/file-utils';
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
      'AuthenticationImplementation',
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
        {
          validator: codeFiles => this.hasSecurePasswordHandling(codeFiles),
          violationMessage: 'Insecure password handling detected',
          suggestionMessage: 'Use proper password hashing and validation',
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

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return authPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
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

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return tokenPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
  }

  private static hasSecurePasswordHandling(codeFiles: string[]): boolean {
    const securePatterns = [
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

    const insecurePatterns = [
      /md5.*password/i,
      /sha1.*password/i,
      /btoa.*password/i,
      /password.*plain/i,
      /plaintext.*password/i,
    ];

    let hasSecure = false;
    let hasInsecure = false;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);

        if (securePatterns.some(pattern => pattern.test(content))) {
          hasSecure = true;
        }

        if (insecurePatterns.some(pattern => pattern.test(content))) {
          hasInsecure = true;
        }
      } catch (_error) {
        // Continue checking other files
      }
    }

    return hasSecure && !hasInsecure;
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

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return oauthPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
  }
}
