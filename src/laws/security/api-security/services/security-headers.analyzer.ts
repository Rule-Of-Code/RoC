import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { SecurityHeadersConstants } from '../constants';


/**
 * SecurityHeadersAnalyzer
 *
 * Specialized analyzer for security headers implementation.
 * Single Responsibility: Security header presence and configuration validation
 */
export class SecurityHeadersAnalyzer {
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    // Check nginx configuration
    const nginxPath = PathOperations.join(projectRoot, 'nginx.conf');
    if (FileUtils.exists(nginxPath)) {
      try {
        const content = FileUtils.readFile(nginxPath, { encoding: 'utf8' });

        // Check EACH header individually. The loop used to call
        // hasSecurityHeader(content) — which is true if ANY header is present —
        // so a config with 3 of 5 headers flagged none of the 2 missing.
        for (const header of SecurityHeadersConstants.SECURITY_HEADERS) {
          if (!SecurityHeadersConstants.hasSpecificHeader(content, header)) {
            violations.push(`Missing security header: ${header} in nginx.conf`);
          }
        }
      } catch (_error) {
        // Continue
      }
    }

    // Check Angular interceptors for security headers
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts'],
      config
    );

    const interceptorFiles = allFiles.filter(f =>
      f.includes('.interceptor.ts')
    );
    let hasSecurityHeaders = false;

    for (const file of interceptorFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });

        if (SecurityHeadersConstants.hasSecurityHeaderPattern(content)) {
          hasSecurityHeaders = true;
        }
      } catch (_error) {
        // Continue
      }
    }

    if (!hasSecurityHeaders && interceptorFiles.length > 0) {
      violations.push(
        'No security headers implementation found in interceptors'
      );
    }

    return violations;
  }
}
