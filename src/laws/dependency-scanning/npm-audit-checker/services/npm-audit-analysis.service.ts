/**
 * NPM Audit Checker Analysis Service
 * Business logic layer: Vulnerability detection and analysis
 */

import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { NpmAuditConstants } from '../constants/npm-audit.constants';

export interface AuditResult {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  auditAvailable: boolean;
  totalVulnerabilities: number;
}

export interface PackageAnalysisResult {
  hasLockFile: boolean;
  hasInsecureProtocols: boolean;
  hasWildcardVersions: boolean;
}

/**
 * Service for analyzing NPM audit results and package security
 */
export class NpmAuditAnalysisService {
  /**
   * Run NPM audit and detect vulnerabilities
   */
  static runNpmAudit(projectRoot: string): AuditResult {
    let critical = 0;
    let high = 0;
    let moderate = 0;
    let low = 0;
    let auditAvailable = false;

    // Check if npm audit can be run
    const packageLockPath = PathOperations.join(
      projectRoot,
      'package-lock.json'
    );
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    auditAvailable =
      FileUtils.exists(packageLockPath) && FileUtils.exists(packageJsonPath);

    if (auditAvailable) {
      try {
        const dependencies =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        const vulnResult = this.detectVulnerabilities(dependencies);
        ({ critical, high, moderate, low } = vulnResult);
      } catch (_error) {
        // Handle errors silently
      }
    }

    return {
      critical,
      high,
      moderate,
      low,
      auditAvailable,
      totalVulnerabilities: critical + high + moderate + low,
    };
  }

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
   * Detect vulnerabilities in dependencies
   */
  private static detectVulnerabilities(dependencies: Record<string, string>): {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  } {
    let critical = 0;
    let high = 0;
    let moderate = 0;
    const low = 0;

    for (const [pkg, version] of Object.entries(dependencies)) {
      if (typeof version !== 'string') continue;

      // Check for known vulnerable packages
      if (NpmAuditConstants.isKnownVulnerablePackage(pkg, version)) {
        const severity = NpmAuditConstants.getVulnerabilityLevel(pkg);
        if (severity === 'critical') {
          critical++;
        } else if (severity === 'high') {
          high++;
        }
      } else if (
        NpmAuditConstants.isZeroVersion(version) &&
        !version.includes('^')
      ) {
        moderate++;
      }
    }

    return { critical, high, moderate, low };
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
