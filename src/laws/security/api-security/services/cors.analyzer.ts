import type * as TS from 'typescript';
import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { loadTypeScript } from '../../../../utils/react/tsx-source';
import { CORSConstants } from '../constants';
import { readApiCodeView } from './api-code-view';

/**
 * CORSAnalyzer
 *
 * Specialized analyzer for CORS configuration.
 * Single Responsibility: CORS headers and middleware validation
 */
export class CORSAnalyzer {
  /**
   * `ts` is the parser the server files are read with; without it they are
   * not judged (the coordinator says so once for the law).
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig,
    ts: typeof TS | null = loadTypeScript(projectRoot)
  ): string[] {
    const violations: string[] = [];

    violations.push(...this.checkProxyConfiguration(projectRoot));
    violations.push(...this.checkFirebaseFunctions(projectRoot));
    violations.push(...this.checkHealthEndpoints(projectRoot));
    if (ts) violations.push(...this.checkServerFiles(projectRoot, config, ts));

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
   * Express servers without CORS (#550, #559). A server is a file that
   * imports express and creates or starts the app — read in code, whatever
   * the file is called. The file name (`server`, `main`, `app` — which also
   * matched `mapper.ts`) and the word "express" anywhere in the text (inside
   * `isExpressionStatement`, in a law's prose) made a server of any file.
   */
  private static checkServerFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    ts: typeof TS
  ): string[] {
    const violations: string[] = [];
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.js'],
      config
    );

    for (const file of allFiles) {
      let content: string;
      try {
        content = FileUtils.readFile(file, { encoding: 'utf8' });
      } catch (_error) {
        continue;
      }
      // Only a file that names the module is parsed.
      if (!content.includes('express')) continue;
      const view = readApiCodeView(ts, file, content);
      if (view && CORSConstants.isExpressServerMissingCors(view)) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: Express server missing CORS configuration`
        );
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
