import type { RuleOfCodeConfig } from '../../../../types';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../../../utils/react/tsx-source';
import { API_FILES_NOT_READ } from './api-code-view';
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
    // Servers and HTTP services are read through the parser (#550); without
    // it they are not judged, and the law says so once.
    const ts = loadTypeScript(projectRoot);

    // Coordinate specialized analyzers
    violations.push(...HttpsEnforcementAnalyzer.analyze(projectRoot));
    violations.push(
      ...APIAuthenticationAnalyzer.analyze(projectRoot, config, ts)
    );
    violations.push(...RateLimitingAnalyzer.analyze(projectRoot, config));
    violations.push(
      ...InputValidationAnalyzer.analyze(projectRoot, config, ts)
    );
    violations.push(...CORSAnalyzer.analyze(projectRoot, config, ts));
    violations.push(...SecurityHeadersAnalyzer.analyze(projectRoot, config));
    if (!ts)
      violations.push(parserUnavailable(projectRoot, API_FILES_NOT_READ));

    return violations;
  }
}
