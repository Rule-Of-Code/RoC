import { SecurityLawBase } from '../../checkers/security-laws/security-law-base';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { APISecurityAnalyzerService } from './api-security/services';

/**
 * API Security Standards Law
 *
 * Pure coordinator law that delegates to specialized analyzers:
 * - HTTPS/TLS enforcement validation
 * - API authentication verification
 * - Rate limiting detection
 * - Input validation checking
 * - CORS configuration validation
 * - Security headers implementation
 *
 * Following OWASP API Security standards with SRP architecture
 */
export class ApiSecurityStandardsLaw extends SecurityLawBase {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const { projectRoot } = context;

    // Delegate to coordinator service
    violations.push(
      ...APISecurityAnalyzerService.analyze(projectRoot, context.config)
    );

    const suggestions = [
      'Implement HTTPS redirect and enforce TLS 1.2+',
      'Implement JWT-based authentication with refresh tokens',
      'Add rate limiting to prevent API abuse',
      'Implement comprehensive input validation and sanitization',
      'Configure CORS properly with specific allowed origins',
      'Add security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options',
      'Regular security audits and penetration testing',
      'Implement API versioning and deprecation strategy',
    ];

    return Promise.resolve(
      this.createResult(
        violations,
        'API Security Standards',
        'SECURITY',
        suggestions,
        context
      )
    );
  }
}
