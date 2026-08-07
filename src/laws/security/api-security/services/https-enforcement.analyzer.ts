import { FileUtils, PathOperations } from '../../../../utils';
import { HttpsEnforcementConstants } from '../constants';

/**
 * HttpsEnforcementAnalyzer
 *
 * Specialized analyzer for HTTPS/TLS configuration.
 * Single Responsibility: HTTPS redirect and TLS validation
 */
export class HttpsEnforcementAnalyzer {
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    // Delegate to helper methods for complexity reduction
    violations.push(...this.checkFirebaseConfiguration(projectRoot));
    violations.push(...this.checkNginxConfiguration(projectRoot));
    violations.push(...this.checkEnvironmentFiles(projectRoot));

    return violations;
  }

  /**
   * Check Firebase configuration for HTTPS redirect
   * Helper method extracted for complexity reduction
   */
  private static checkFirebaseConfiguration(projectRoot: string): string[] {
    const violations: string[] = [];
    const firebaseConfigPath = PathOperations.join(
      projectRoot,
      'firebase.json'
    );

    if (!FileUtils.exists(firebaseConfigPath)) {
      return violations;
    }

    try {
      const content = FileUtils.readFile(firebaseConfigPath, {
        encoding: 'utf8',
      });

      if (!content.includes('https') && !content.includes('redirect')) {
        violations.push(
          'Missing HTTPS redirect configuration in firebase.json'
        );
      }
    } catch (_error) {
      // Continue
    }

    return violations;
  }

  /**
   * Check nginx configuration for SSL certificate
   * Helper method extracted for complexity reduction
   */
  private static checkNginxConfiguration(projectRoot: string): string[] {
    const violations: string[] = [];
    const nginxPath = PathOperations.join(projectRoot, 'nginx.conf');

    if (!FileUtils.exists(nginxPath)) {
      return violations;
    }

    try {
      const content = FileUtils.readFile(nginxPath, { encoding: 'utf8' });

      if (!HttpsEnforcementConstants.hasHttpsConfiguration(content)) {
        violations.push(
          'Missing SSL certificate configuration in nginx.conf'
        );
      }
    } catch (_error) {
      // Continue
    }

    return violations;
  }

  /**
   * Check environment files for non-HTTPS endpoints
   * Helper method extracted for complexity reduction
   */
  private static checkEnvironmentFiles(projectRoot: string): string[] {
    const violations: string[] = [];

    for (const envFile of HttpsEnforcementConstants.ENV_FILES) {
      const envPath = PathOperations.join(projectRoot, envFile);

      if (!FileUtils.exists(envPath)) {
        continue;
      }

      try {
        const content = FileUtils.readFile(envPath, { encoding: 'utf8' });

        if (HttpsEnforcementConstants.hasNonLocalHttpEndpoint(content)) {
          violations.push(
            `Non-HTTPS endpoints found in ${PathOperations.getBasename(envPath)}`
          );
        }
      } catch (_error) {
        // Continue
      }
    }

    return violations;
  }
}
