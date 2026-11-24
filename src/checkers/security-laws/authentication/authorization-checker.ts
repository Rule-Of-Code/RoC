import type { RuleOfCodeConfig } from '../../../config/types';
import { PathOperations } from '../../../utils/path-operations';
import { SecurityCheckerBase } from './security-checker-base';

/** Said when the code has no role or permission concept (#561). */
export const NO_ROLE_CONCEPT_NOTE =
  'No role or permission concept in the code: role-based, permission and resource-level checks do not apply';

/**
 * Authorization Patterns Checker
 * Validates authorization and access control implementations
 *
 * By what the code does (#561), not by words: a route guard by its contract
 * (`implements CanActivate`, a `CanActivateFn`, `canActivate: […]`,
 * `@UseGuards(…)`), a request refused with 401/403, or a credential attached
 * to every request (the server authorizes it). Roles and permissions are
 * asked for only where the code has them; an app without roles is told the
 * role checks do not apply, not that RBAC is missing.
 */
export class AuthorizationChecker extends SecurityCheckerBase {
  /**
   * Check authorization patterns implementation
   */
  static checkAuthorizationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    // Only code that was read is judged (#561): with no file, or no parser,
    // runSecurityCheck answers before any claim about roles or guards.
    return this.runSecurityCheck(projectRoot, config, codeFiles =>
      this.judgeAuthorization(projectRoot, codeFiles)
    );
  }

  /**
   * A Next.js middleware (`middleware.ts` / `.js` at the root or in `src/`)
   * that redirects or refuses a request on the strength of a session or a
   * token is the app's route guard (#590).
   */
  private static hasNextMiddlewareGuard(
    projectRoot: string,
    codeFiles: string[]
  ): boolean {
    return codeFiles
      .filter(file =>
        /^(?:src\/)?middleware\.[cm]?[jt]s$/.test(
          PathOperations.getRelative(projectRoot, file)
        )
      )
      .some(file => {
        const s = this.authShapeOf([file]);
        const acts = s.redirects || s.refusesRequests;
        const onCredential =
          s.readsCookie ||
          s.signsInOrVerifies ||
          s.readsSdkToken ||
          s.managedSdk;
        return acts && onCredential;
      });
  }

  private static judgeAuthorization(
    projectRoot: string,
    codeFiles: string[]
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const shape = this.authShapeOf(codeFiles);

    const hasGuards =
      shape.routeGuard ||
      shape.refusesRequests ||
      shape.attachesCredentials ||
      this.hasNextMiddlewareGuard(projectRoot, codeFiles);
    if (!hasGuards) {
      violations.push('No authorization guards or middleware found');
      suggestions.push('Implement route guards and authorization middleware');
    }

    if (!shape.roleConcept) {
      suggestions.push(NO_ROLE_CONCEPT_NOTE);
      return { violations, suggestions };
    }

    // The code has roles or permissions: they must be enforced somewhere.
    if (!shape.roleCheck) {
      violations.push(
        'No Role-Based Access Control (RBAC) implementation found'
      );
      // One finding: roles and permissions are one concept here, and an
      // unenforced one is one gap, not two.
      suggestions.push(
        'Enforce the roles or permissions the code defines (a role guard, hasRole(), @Roles(), ability.can())'
      );
    }

    if (!this.hasResourceLevelAuth(codeFiles)) {
      violations.push('No resource-level authorization found');
      suggestions.push('Implement resource-level access control');
    }

    return { violations, suggestions };
  }

  private static hasResourceLevelAuth(codeFiles: string[]): boolean {
    const resourceAuthPatterns = [
      /resource.*access/i,
      /owner.*check/i,
      /belongsTo.*user/i,
      /canAccess.*resource/i,
      /isOwner/,
      /checkOwnership/,
      /resource.*permission/i,
      /access.*control.*list/i,
      /ACL/,
    ];

    return this.anyFileMatchesCode(codeFiles, resourceAuthPatterns);
  }
}
