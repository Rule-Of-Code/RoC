import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { APIAuthenticationConstants } from '../constants';

/**
 * APIAuthenticationAnalyzer
 *
 * Specialized analyzer for API authentication implementation.
 * Single Responsibility: Authentication service and token handling validation
 */
export class APIAuthenticationAnalyzer {
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    // Delegate to helper methods for complexity reduction
    const hasAuthService = this.checkAuthenticationServices(
      projectRoot,
      config,
      violations
    );
    this.checkFirebaseAuthConfiguration(projectRoot, violations);

    if (!hasAuthService) {
      violations.push('No authentication service implementation found');
    }

    return violations;
  }

  /**
   * Check authentication service files.
   *
   * Searches the WHOLE project for auth-related files (auth.service.ts,
   * token.service.ts, auth.interceptor.ts, auth.guard.ts, ...) instead of a few
   * hard-coded paths. This supports any structure — Nx (apps/x/src/app/core),
   * plain `src/app/services`, `libs/...` — without relying on glob expansion
   * (the previous `apps/*​/src/app/services` path never matched, since exists()
   * checks a literal path).
   */
  private static checkAuthenticationServices(
    projectRoot: string,
    config: RuleOfCodeConfig,
    violations: string[]
  ): boolean {
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts'],
      config
    );

    // Match by full filename (path may use / or \). NB: PathOperations.getBasename
    // strips the extension (path.parse().name), so compare on the path suffix.
    const authFiles = allFiles.filter(file =>
      APIAuthenticationConstants.AUTH_FILES.some(
        name =>
          file === name ||
          file.endsWith(`/${name}`) ||
          file.endsWith(`\\${name}`)
      )
    );

    if (authFiles.length === 0) {
      return false;
    }

    // Auth handling is often spread across files (Authorization header in the
    // interceptor, refresh in the token service) — validate the COMBINED content.
    let combined = '';
    for (const file of authFiles) {
      try {
        combined += FileUtils.readFile(file, { encoding: 'utf8' }) + '\n';
      } catch (_error) {
        // Continue
      }
    }

    this.validateAuthContent(combined, violations);
    return true;
  }

  /**
   * Validate the combined authentication content
   * Helper method extracted for complexity reduction
   */
  private static validateAuthContent(
    content: string,
    violations: string[]
  ): void {
    if (!APIAuthenticationConstants.hasAuthorizationHandling(content)) {
      violations.push(
        'Authentication: Missing proper Authorization header handling'
      );
    }

    if (!APIAuthenticationConstants.hasTokenRefreshMechanism(content)) {
      violations.push('Authentication: Missing token refresh mechanism');
    }

    if (APIAuthenticationConstants.hasInsecureTokenStorage(content)) {
      violations.push(
        'Authentication: Insecure token storage using localStorage without encryption'
      );
    }
  }

  /**
   * Check Firebase Auth configuration
   * Helper method extracted for complexity reduction
   */
  private static checkFirebaseAuthConfiguration(
    projectRoot: string,
    violations: string[]
  ): void {
    const firebaseConfigPath = PathOperations.join(
      projectRoot,
      'firebase.json'
    );

    if (!FileUtils.exists(firebaseConfigPath)) {
      return;
    }

    try {
      const content = FileUtils.readFile(firebaseConfigPath, {
        encoding: 'utf8',
      });

      if (!content.includes('auth')) {
        violations.push('Firebase Auth not configured in firebase.json');
      }
    } catch (_error) {
      // Continue
    }
  }
}
