import type { LawCheckContext } from '../../../types/law.types';
import { ProjectTypeDetectorValidation } from '../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../utils/file-utils';
import { PackageJsonOperations } from '../../../utils/package-json-operations';

/**
 * Dependency Pinning Checker
 * Ensures dependencies are properly pinned to specific versions
 */
export class DependencyPinningChecker {
  /**
   * Check dependency pinning requirements
   */
  static checkDependencyPinning(context: LawCheckContext): string[] {
    const violations: string[] = [];

    const pkg = this.getPackageJson(context.projectRoot);
    if (!pkg) {
      violations.push('No package.json found');
      return violations;
    }

    // Check for loose version constraints
    const dependencies = ProjectTypeDetectorValidation.getProjectDependencies(
      context.projectRoot
    );

    for (const [depName, version] of Object.entries(dependencies)) {
      if (typeof version === 'string') {
        // Check for loose constraints (^, ~, *, >, <)
        if (version.startsWith('^') || version.startsWith('~')) {
          violations.push(
            `Dependency ${depName} uses loose version constraint: ${version}`
          );
        }

        if (
          version.includes('*') ||
          version.includes('>') ||
          version.includes('<')
        ) {
          violations.push(
            `Dependency ${depName} uses unsafe version range: ${version}`
          );
        }

        // Check for "latest" or similar
        if (version === 'latest' || version === 'next' || version === 'beta') {
          violations.push(
            `Dependency ${depName} uses unstable version tag: ${version}`
          );
        }
      }
    }

    // Check for package-lock.json or yarn.lock
    const hasLockFile = this.checkLockFiles(context);
    if (!hasLockFile) {
      violations.push('No lock file found (package-lock.json or yarn.lock)');
    }

    // Check for Renovate or Dependabot configuration
    const hasUpdateBot = this.checkUpdateBotConfiguration(context);
    if (!hasUpdateBot) {
      violations.push(
        'No automated dependency update configuration found (Renovate/Dependabot)'
      );
    }

    return violations;
  }

  private static checkLockFiles(context: LawCheckContext): boolean {
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

    for (const lockFile of lockFiles) {
      const exists = this.fileExists(`${context.projectRoot}/${lockFile}`);
      if (exists) return true;
    }

    return false;
  }

  private static checkUpdateBotConfiguration(
    context: LawCheckContext
  ): boolean {
    const configFiles = [
      '.renovaterc',
      '.renovaterc.json',
      'renovate.json',
      '.github/renovate.json',
      '.github/dependabot.yml',
      '.dependabot/config.yml',
    ];

    for (const configFile of configFiles) {
      const exists = this.fileExists(`${context.projectRoot}/${configFile}`);
      if (exists) return true;
    }

    return false;
  }

  private static fileExists(filePath: string): boolean {
    return FileUtils.exists(filePath);
  }

  private static getPackageJson(projectRoot: string) {
    return PackageJsonOperations.loadProjectPackageJson(projectRoot);
  }
}
