import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
// Interface for audit results
export interface AuditResults {
  vulnerabilities: unknown[];
  metadata: {
    vulnerabilities: {
      summary: {
        critical: number;
        high: number;
        moderate: number;
        low: number;
        info: number;
        total: number;
      };
    };
  };
}

/**
 * NPM Audit Simulator
 * Simulates npm audit functionality when actual npm audit is not available
 */
export class NpmAuditSimulator {
  /**
   * Get basic audit information
   */
  static getBasicAuditInfo(projectRoot: string): {
    packageJsonExists: boolean;
    packageLockExists: boolean;
    dependencyCount: number;
  } {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    const packageLockPath = PathOperations.join(
      projectRoot,
      'package-lock.json'
    );

    let dependencyCount = 0;
    let packageJsonExists = false;

    if (FileUtils.exists(packageJsonPath)) {
      packageJsonExists = true;
      try {
        const dependencies =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
        dependencyCount = Object.keys(dependencies).length;
      } catch (_error) {
        // Parsing error
      }
    }

    return {
      packageJsonExists,
      packageLockExists: FileUtils.exists(packageLockPath),
      dependencyCount,
    };
  }

  /**
   * Simulate npm audit check
   */
  static simulateNpmAudit(projectRoot: string): {
    results: AuditResults;
    hasVulnerabilities: boolean;
  } {
    // This is a simplified simulation since we can't run actual npm audit
    // In real implementation, this would execute `npm audit --json`

    const auditInfo = this.getBasicAuditInfo(projectRoot);

    // Check for node_modules
    const nodeModulesPath = PathOperations.join(projectRoot, 'node_modules');
    const _hasNodeModules = FileUtils.exists(nodeModulesPath);

    // Create simulated audit results
    const simulatedResults: AuditResults = {
      vulnerabilities: [],
      metadata: {
        vulnerabilities: {
          summary: {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
            info: 0,
            total: 0,
          },
        },
      },
    };

    let hasVulnerabilities = false;

    // Simulate vulnerability detection based on project characteristics
    if (auditInfo.dependencyCount > 50) {
      hasVulnerabilities =
        this.simulateLargeProjectVulnerabilities(simulatedResults);
    }

    if (!auditInfo.packageLockExists) {
      this.simulatePackageLockWarnings(simulatedResults);
    }

    return {
      results: simulatedResults,
      hasVulnerabilities,
    };
  }

  private static simulateLargeProjectVulnerabilities(
    simulatedResults: AuditResults
  ): boolean {
    // Large projects are more likely to have vulnerabilities
    simulatedResults.metadata.vulnerabilities.summary.moderate = 1;
    simulatedResults.metadata.vulnerabilities.summary.total = 1;
    return true;
  }

  private static simulatePackageLockWarnings(
    simulatedResults: AuditResults
  ): void {
    // Without package-lock.json, we can't get accurate audit results
    simulatedResults.metadata.vulnerabilities.summary.info = 1;
    simulatedResults.metadata.vulnerabilities.summary.total += 1;
  }

  /**
   * Generate audit recommendations
   */
  static generateAuditRecommendations(hasVulnerabilities: boolean): string[] {
    const recommendations = [
      'Run npm audit regularly to check for vulnerabilities',
      'Keep dependencies up to date with npm update',
      'Use npm audit fix to automatically fix minor issues',
      'Review and update vulnerable dependencies manually for major issues',
    ];

    if (hasVulnerabilities) {
      recommendations.unshift(
        'Address identified vulnerabilities as soon as possible'
      );
    }

    return recommendations;
  }

  /**
   * Check if npm audit is available
   */
  static isNpmAuditAvailable(): boolean {
    // In real implementation, would check if npm is installed and audit command is available
    // For simulation purposes, we assume it might not be available
    return typeof process !== 'undefined' && process.env.NODE_ENV !== 'test';
  }

  /**
   * Get audit configuration recommendations
   */
  static getAuditConfigRecommendations(): string[] {
    return [
      'Configure audit level in .npmrc file',
      'Set up automated security scanning in CI/CD pipeline',
      'Consider using tools like Snyk or WhiteSource for enhanced security scanning',
      'Implement security policies for dependency management',
    ];
  }
}
