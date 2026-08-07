import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { CORSConstants } from '../constants';

/**
 * CORSAnalyzer
 *
 * Specialized analyzer for CORS configuration.
 * Single Responsibility: CORS headers and middleware validation
 */
export class CORSAnalyzer {
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    violations.push(...this.checkProxyConfiguration(projectRoot));
    violations.push(...this.checkFirebaseFunctions(projectRoot));
    violations.push(...this.checkHealthEndpoints(projectRoot));
    violations.push(...this.checkServerFiles(projectRoot, config));

    return violations;
  }

  /**
   * Check proxy configuration for CORS headers
   */
  private static checkProxyConfiguration(projectRoot: string): string[] {
    const violations: string[] = [];
    const proxyConfigPath = PathOperations.join(projectRoot, 'proxy.conf.json');

    if (!FileUtils.exists(proxyConfigPath)) {
      return violations;
    }

    try {
      const content = FileUtils.readFile(proxyConfigPath, { encoding: 'utf8' });
      if (!CORSConstants.hasAccessControlHeader(content)) {
        violations.push('Missing CORS headers in proxy configuration');
      }
    } catch (_error) {
      // Continue
    }

    return violations;
  }

  /**
   * Check Firebase Functions for CORS middleware
   */
  private static checkFirebaseFunctions(projectRoot: string): string[] {
    const violations: string[] = [];
    const functionsPath = PathOperations.join(
      projectRoot,
      'functions',
      'src',
      'index.ts'
    );

    if (!FileUtils.exists(functionsPath)) {
      return violations;
    }

    try {
      const content = FileUtils.readFile(functionsPath, { encoding: 'utf8' });
      const hasCorsMiddleware = CORSConstants.hasCorsMiddleware(content);

      if (!hasCorsMiddleware) {
        violations.push('Firebase Functions missing CORS middleware');
      } else {
        violations.push(...this.checkHttpFunctionsForCors(content));
      }
    } catch (_error) {
      // Continue
    }

    return violations;
  }

  /**
   * Check individual HTTP functions for CORS usage
   */
  private static checkHttpFunctionsForCors(content: string): string[] {
    const violations: string[] = [];
    const httpFunctions = this.extractHttpFunctions(content);

    // If corsHandler is defined OR cors is imported, assume CORS is properly configured
    const hasCorsHandler =
      content.includes('corsHandler') ||
      /const\s+\w*cors\w*\s*=\s*cors\s*\(/i.test(content);

    if (hasCorsHandler) {
      // CORS middleware is available and being used
      return violations;
    }

    // If no CORS setup found, flag all HTTP functions
    for (const funcName of httpFunctions) {
      violations.push(`${funcName}: HTTPS function missing CORS configuration`);
    }

    return violations;
  }

  /**
   * Check Firebase Functions health endpoints
   */
  private static checkHealthEndpoints(projectRoot: string): string[] {
    const violations: string[] = [];
    const healthPath = PathOperations.join(
      projectRoot,
      'functions',
      'src',
      'health.ts'
    );

    if (!FileUtils.exists(healthPath)) {
      return violations;
    }

    try {
      const content = FileUtils.readFile(healthPath, { encoding: 'utf8' });
      const hasHealthEndpoint = content.includes('export const health');
      const hasReadinessEndpoint = content.includes('export const readiness');
      const hasLivenessEndpoint = content.includes('export const liveness');
      const hasCors = CORSConstants.hasCorsMiddleware(content);

      if (
        (hasHealthEndpoint || hasReadinessEndpoint || hasLivenessEndpoint) &&
        !hasCors
      ) {
        if (hasHealthEndpoint)
          violations.push('health: HTTPS function missing CORS configuration');
        if (hasReadinessEndpoint)
          violations.push(
            'readiness: HTTPS function missing CORS configuration'
          );
        if (hasLivenessEndpoint)
          violations.push(
            'liveness: HTTPS function missing CORS configuration'
          );
      }
    } catch (_error) {
      // Continue
    }

    return violations;
  }

  /**
   * Check server files for CORS configuration
   */
  private static checkServerFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const violations: string[] = [];
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.js'],
      config
    );
    const serverFiles = allFiles.filter(f => {
      const name = PathOperations.getBasename(f).toLowerCase();
      return (
        name.includes('server') || name.includes('main') || name.includes('app')
      );
    });

    for (const file of serverFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const relativePath = PathOperations.getRelative(projectRoot, file);

        if (CORSConstants.isExpressServerMissingCors(content)) {
          violations.push(
            `${relativePath}: Express server missing CORS configuration`
          );
        }
      } catch (_error) {
        // Continue
      }
    }

    return violations;
  }

  /**
   * Extract HTTP function names from Firebase Functions code
   */
  private static extractHttpFunctions(content: string): string[] {
    const httpFunctions: string[] = [];
    const functionPattern =
      /export\s+const\s+(\w+)\s*=\s*functions\.https\.onRequest/g;

    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      if (match[1]) {
        httpFunctions.push(match[1]);
      }
    }

    return httpFunctions;
  }
}
