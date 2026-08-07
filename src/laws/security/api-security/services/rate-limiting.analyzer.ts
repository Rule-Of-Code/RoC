import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { RateLimitingConstants } from '../constants';

/**
 * RateLimitingAnalyzer
 *
 * Specialized analyzer for rate limiting implementation.
 * Single Responsibility: Client and server-side rate limiting validation
 */
export class RateLimitingAnalyzer {
  /**
   * A server surface that could actually BE rate-limited. Rate limiting is a
   * backend concern — a pure Angular SPA has nothing to throttle, so demanding it
   * there was a guaranteed false failure on every frontend.
   */
  private static readonly BACKEND_SURFACE =
    /from\s+['"](express|fastify|@nestjs\/[\w-]+|koa|@hapi\/hapi|hapi)['"]|require\(['"](express|fastify|koa|hapi)['"]\)|https?\.createServer|functions\.https\.onRequest|\.onRequest\s*\(/;

  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    let hasRateLimiting = false;
    let hasBackendSurface = false;

    // Search for rate limiting in files
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.js'],
      config
    );

    for (const file of allFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });

        if (RateLimitingConstants.hasRateLimitPattern(content)) {
          hasRateLimiting = true;
        }
        if (this.BACKEND_SURFACE.test(content) || file.includes('functions')) {
          hasBackendSurface = true;
        }

        // Check for CORS in Firebase functions
        if (
          file.includes('functions') &&
          RateLimitingConstants.hasMissingCorsInFunction(content)
        ) {
          violations.push(
            `${PathOperations.getBasename(file)}: HTTPS function missing CORS configuration`
          );
        }
      } catch (_error) {
        // Continue
      }
    }

    // Only a project with a backend surface can be faulted for missing it.
    if (hasBackendSurface && !hasRateLimiting) {
      violations.push('No rate limiting implementation found');
    }

    return violations;
  }
}
