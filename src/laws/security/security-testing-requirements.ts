import type { LawCheckContext, LawResult } from '../../types/law.types';
import { SecurityTestingRequirementsAnalyzerService } from './security-testing-requirements/services/security-testing-analyzer.service';

/**
 * SecurityTestingRequirementsLaw
 *
 * Ensures comprehensive security testing is implemented by validating:
 * - SAST (Static Application Security Testing) configuration
 * - Dependency vulnerability scanning setup
 * - Security test case coverage
 * - Authentication and authorization test implementation
 * - Input validation test coverage
 * - Security headers test implementation
 *
 * This law acts as a pure coordinator, delegating all analysis to specialized services.
 */
export class SecurityTestingRequirementsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for Static Application Security Testing (SAST)
    const sastResult =
      SecurityTestingRequirementsAnalyzerService.analyzeSASTImplementation(
        context.projectRoot
      );
    if (!sastResult.configured) {
      violations.push(
        'Static Application Security Testing (SAST) not configured'
      );
      suggestions.push(
        'Configure SAST tools like ESLint security rules, Semgrep, or CodeQL'
      );
      score -= 25;
    }

    // Check for Dependency Vulnerability Scanning
    const depResult =
      SecurityTestingRequirementsAnalyzerService.analyzeDependencyScanning(
        context.projectRoot
      );
    if (!depResult.configured) {
      violations.push('Dependency vulnerability scanning not automated');
      suggestions.push(
        'Configure npm audit, Snyk, or Dependabot for dependency scanning'
      );
      score -= 20;
    }

    // Check for Security Test Cases
    const securityTestsResult =
      SecurityTestingRequirementsAnalyzerService.analyzeSecurityTestCases(
        context.projectRoot,
        context.config
      );
    if (!securityTestsResult.hasTests) {
      violations.push('No dedicated security test cases found');
      suggestions.push('Implement security-focused unit and integration tests');
      score -= 20;
    }

    // Check for Authentication/Authorization Tests
    const authResult =
      SecurityTestingRequirementsAnalyzerService.analyzeAuthenticationTests(
        context.projectRoot,
        context.config
      );
    if (!authResult.hasTests) {
      violations.push('Authentication and authorization tests not implemented');
      suggestions.push('Implement comprehensive auth testing');
      score -= 15;
    }

    // Check for Input Validation Tests
    const inputValidationResult =
      SecurityTestingRequirementsAnalyzerService.analyzeInputValidationTests(
        context.projectRoot,
        context.config
      );
    if (!inputValidationResult.hasTests) {
      violations.push('Input validation security tests missing');
      suggestions.push(
        'Implement tests for XSS, injection attacks, and input sanitization'
      );
      score -= 10;
    }

    // Check for Security Headers Tests
    const securityHeadersResult =
      SecurityTestingRequirementsAnalyzerService.analyzeSecurityHeadersTests(
        context.projectRoot,
        context.config
      );
    if (!securityHeadersResult.hasTests) {
      violations.push('Security headers tests not implemented');
      suggestions.push(
        'Test CSP, HSTS, X-Frame-Options and other security headers'
      );
      score -= 10;
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Security testing requirements fully implemented'
          : `Security testing gaps found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }
}
