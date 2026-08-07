import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { DependencyPinningConstants } from '../constants/dependency-pinning.constants';

/**
 * Dependency Pinning Analysis Service
 * Responsibility: Analyzing dependencies for version pinning issues
 */
export class DependencyPinningAnalysisService {
  /**
   * Analyze dependency pinning in project
   */
  static analyzeDependencyPinning(projectRoot: string): {
    unpinnedProduction: string[];
    unpinnedDev: string[];
    wildcardVersions: string[];
    rangeVersions: string[];
    hasLockFile: boolean;
  } {
    const unpinnedProduction: string[] = [];
    const unpinnedDev: string[] = [];
    const wildcardVersions: string[] = [];
    const rangeVersions: string[] = [];
    let hasLockFile = false;

    // Check for lock files
    hasLockFile = DependencyPinningConstants.LOCK_FILES.some(lockFile =>
      FileUtils.exists(PathOperations.join(projectRoot, lockFile))
    );

    // Analyze package.json
    try {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      // Check all dependencies
      if (Object.keys(allDeps).length > 0) {
        this.analyzeDependencySection(allDeps, 'production', {
          unpinnedProduction,
          wildcardVersions,
          rangeVersions,
        });
      }
    } catch (_error) {
      // Handle parsing errors
    }

    return {
      unpinnedProduction,
      unpinnedDev,
      wildcardVersions,
      rangeVersions,
      hasLockFile,
    };
  }

  /**
   * Analyze security implications of dependencies
   */
  static analyzeSecurityImplications(projectRoot: string): {
    unpinnedCritical: string[];
    hasSecurityFocus: boolean;
  } {
    const unpinnedCritical: string[] = [];

    try {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

      for (const [pkg, version] of Object.entries(allDeps)) {
        if (typeof version !== 'string') continue;
        if (!DependencyPinningConstants.isCriticalPackage(pkg)) continue;

        const pinningIssue =
          DependencyPinningConstants.analyzeDependencyVersion(pkg, version);
        if (pinningIssue) {
          unpinnedCritical.push(`${pkg}@${version}`);
        }
      }
    } catch (_error) {
      // Handle parsing errors
    }

    return {
      unpinnedCritical,
      hasSecurityFocus: false,
    };
  }

  /**
   * Analyze a section of dependencies
   */
  private static analyzeDependencySection(
    dependencies: Record<string, string>,
    type: 'dev' | 'production',
    collections: {
      unpinnedProduction?: string[];
      unpinnedDev?: string[];
      wildcardVersions: string[];
      rangeVersions: string[];
    }
  ): void {
    for (const [pkg, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') continue;

      const pinningIssue = DependencyPinningConstants.analyzeDependencyVersion(
        pkg,
        version
      );
      if (!pinningIssue) continue;

      this.classifyDependencyIssue(
        pkg,
        version,
        type,
        pinningIssue.type,
        collections
      );
    }
  }

  /**
   * Classify and collect dependency issue
   */
  private static classifyDependencyIssue(
    pkg: string,
    version: string,
    type: 'dev' | 'production',
    issueType: string,
    collections: {
      unpinnedProduction?: string[];
      unpinnedDev?: string[];
      wildcardVersions: string[];
      rangeVersions: string[];
    }
  ): void {
    const depEntry = `${pkg}@${version}`;

    switch (issueType) {
      case 'unpinned':
        if (type === 'production' && collections.unpinnedProduction) {
          collections.unpinnedProduction.push(depEntry);
        } else if (type === 'dev' && collections.unpinnedDev) {
          collections.unpinnedDev.push(depEntry);
        }
        break;
      case 'wildcard':
        collections.wildcardVersions.push(depEntry);
        break;
      case 'range':
        collections.rangeVersions.push(depEntry);
        break;
    }
  }
}
