import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../../utils/file-utils';
import { SecurityCheckerBase } from './security-checker-base';
/**
 * Authorization Patterns Checker
 * Validates authorization and access control implementations
 */
export class AuthorizationChecker extends SecurityCheckerBase {
  /**
   * Check authorization patterns implementation
   */
  static checkAuthorizationPatterns(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const { violations, suggestions, codeFiles } = this.initializeSecurityCheck(
      projectRoot,
      _config
    );

    const hasRBAC = this.hasRoleBasedAccessControl(codeFiles);
    if (!hasRBAC) {
      violations.push(
        'No Role-Based Access Control (RBAC) implementation found'
      );
      suggestions.push('Implement RBAC with roles and permissions');
    }

    // Check for guards/middleware
    const hasGuards = this.hasAuthorizationGuards(codeFiles);
    if (!hasGuards) {
      violations.push('No authorization guards or middleware found');
      suggestions.push('Implement route guards and authorization middleware');
    }

    // Check for permission-based access
    const hasPermissions = this.hasPermissionSystem(codeFiles);
    if (!hasPermissions) {
      violations.push('No permission-based access control found');
      suggestions.push('Implement granular permission system');
    }

    // Check for resource-level authorization
    const hasResourceAuth = this.hasResourceLevelAuth(codeFiles);
    if (!hasResourceAuth) {
      violations.push('No resource-level authorization found');
      suggestions.push('Implement resource-level access control');
    }

    return { violations, suggestions };
  }

  private static hasRoleBasedAccessControl(codeFiles: string[]): boolean {
    const rbacPatterns = [
      /role.*based/i,
      /user.*role/i,
      /Role.*enum/i,
      /UserRole/,
      /hasRole/,
      /checkRole/,
      /roleRequired/i,
      /requiredRole/i,
      /@Role/,
      /@Roles/,
    ];

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return rbacPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
  }

  private static hasAuthorizationGuards(codeFiles: string[]): boolean {
    const guardPatterns = [
      /Guard$/,
      /AuthGuard/,
      /RoleGuard/,
      /PermissionGuard/,
      /canActivate/,
      /CanActivate/,
      /authMiddleware/i,
      /authorize.*middleware/i,
      /@UseGuards/,
      /@Guard/,
    ];

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return guardPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
  }

  private static hasPermissionSystem(codeFiles: string[]): boolean {
    const permissionPatterns = [
      /permission/i,
      /hasPermission/,
      /checkPermission/,
      /Permission.*enum/i,
      /UserPermission/,
      /requiredPermission/i,
      /@Permission/,
      /@Permissions/,
      /ability/i,
      /can.*action/i,
    ];

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return permissionPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
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

    return codeFiles.some(file => {
      try {
        const content = FileUtils.readFile(file);
        return resourceAuthPatterns.some(pattern => pattern.test(content));
      } catch (_error) {
        return false;
      }
    });
  }
}
