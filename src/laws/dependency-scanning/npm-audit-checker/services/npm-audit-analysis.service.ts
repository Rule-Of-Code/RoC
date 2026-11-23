/**
 * NPM Audit Checker Analysis Service
 * Business logic layer: what the manifest and the lockfile say.
 * No vulnerability is counted here (#545): the scanner in the gate does that.
 */

import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { NpmAuditConstants } from '../constants/npm-audit.constants';

export interface PackageAnalysisResult {
  hasLockFile: boolean;
  hasInsecureProtocols: boolean;
  hasWildcardVersions: boolean;
}

/**
 * Service for analyzing the package manifest and lockfile
 */
export class NpmAuditAnalysisService {
  /**
   * Analyze package.json for security issues
   */
  static analyzePackageJson(projectRoot: string): PackageAnalysisResult {
    let hasLockFile = false;
    let hasInsecureProtocols = false;
    let hasWildcardVersions = false;

    // Check for lock files
    hasLockFile = NpmAuditConstants.LOCK_FILES.some(lockFile =>
      FileUtils.exists(PathOperations.join(projectRoot, lockFile))
    );

    // Check dependencies for security issues
    try {
      const dependencies =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const depResult = this.checkDependenciesForIssues(dependencies);
      ({ hasInsecureProtocols, hasWildcardVersions } = depResult);
    } catch (_error) {
      // Handle parsing errors
    }

    // Check repository URLs for insecure protocols
    hasInsecureProtocols =
      hasInsecureProtocols || this.checkRepositoryUrlSecurity(projectRoot);

    return {
      hasLockFile,
      hasInsecureProtocols,
      hasWildcardVersions,
    };
  }

  /**
   * Check dependencies for security issues (insecure protocols, wildcard versions)
   */
  private static checkDependenciesForIssues(
    dependencies: Record<string, string>
  ): {
    hasInsecureProtocols: boolean;
    hasWildcardVersions: boolean;
  } {
    let hasInsecureProtocols = false;
    let hasWildcardVersions = false;

    for (const [_pkg, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') continue;

      // Check for insecure protocols
      if (NpmAuditConstants.hasInsecureProtocol(version)) {
        hasInsecureProtocols = true;
      }

      // Check for wildcard versions
      if (NpmAuditConstants.isWildcardVersion(version)) {
        hasWildcardVersions = true;
      }
    }

    return { hasInsecureProtocols, hasWildcardVersions };
  }

  /**
   * Check repository URL for insecure protocols
   */
  private static checkRepositoryUrlSecurity(projectRoot: string): boolean {
    try {
      const packageJson = ProjectTypeDetectorValidation.getPackageJson(
        projectRoot
      ) as Record<string, unknown> | null;
      if (
        packageJson?.repository &&
        typeof packageJson.repository === 'string'
      ) {
        return NpmAuditConstants.urlHasInsecureProtocol(packageJson.repository);
      }
    } catch (_error) {
      // Handle parsing errors
    }

    return false;
  }
}
