import { SecurityLawBase } from '../../checkers/security-laws/security-law-base';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { XSSPreventionAnalyzerService } from './security-standards-xss-prevention/services/xss-prevention-coordinator.service';

/**
 * Security Standards (XSS Prevention) Policy Law
 *
 * Pure coordinator law that delegates to specialized analyzers:
 * - CSP configuration validation
 * - Dangerous Angular pattern detection
 * - Input sanitization verification
 * - Security headers validation
 * - HTML template safety analysis
 *
 * Following OWASP XSS Prevention standards with SRP architecture
 */
export class SecurityStandardsXssPreventionLaw extends SecurityLawBase {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const { projectRoot, config } = context;

    // Delegate to coordinator service
    violations.push(
      ...XSSPreventionAnalyzerService.analyze(projectRoot, config)
    );

    const suggestions = [
      'Configure Content Security Policy headers',
      'Remove dangerous innerHTML usage',
      'Implement proper input sanitization',
      'Add security headers middleware',
      'Sanitize HTML template bindings',
    ];

    return Promise.resolve(
      this.createResult(
        violations,
        'XSS Prevention Standards',
        'SECURITY',
        suggestions,
        context
      )
    );
  }
}
