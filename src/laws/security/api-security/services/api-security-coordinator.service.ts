import type { RuleOfCodeConfig } from '../../../../types';
import { APIAuthenticationAnalyzer } from './api-authentication.analyzer';
import { CORSAnalyzer } from './cors.analyzer';
import { HttpsEnforcementAnalyzer } from './https-enforcement.analyzer';
import { InputValidationAnalyzer } from './input-validation.analyzer';
import { RateLimitingAnalyzer } from './rate-limiting.analyzer';
import { SecurityHeadersAnalyzer } from './security-headers.analyzer';

/**
 * APISecurityAnalyzerService
 *
 * Coordinator service that orchestrates 6 specialized analyzers.
 * Pure coordination without mixing responsibilities.
 */
export class APISecurityAnalyzerService {
  /**
   * Coordinate all API security analysis
   * Delegates to specialized analyzers and aggregates violations
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    // Coordinate specialized analyzers
    violations.push(...HttpsEnforcementAnalyzer.analyze(projectRoot));
    violations.push(...APIAuthenticationAnalyzer.analyze(projectRoot, config));
    violations.push(...RateLimitingAnalyzer.analyze(projectRoot, config));
    violations.push(...InputValidationAnalyzer.analyze(projectRoot, config));
    violations.push(...CORSAnalyzer.analyze(projectRoot, config));
    violations.push(...SecurityHeadersAnalyzer.analyze(projectRoot, config));

    return violations;
  }
}
