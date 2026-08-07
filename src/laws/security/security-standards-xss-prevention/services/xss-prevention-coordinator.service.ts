import type { RuleOfCodeConfig } from "../../../../types";
import { CSPConfigurationAnalyzer } from "./csp-configuration.analyzer";
import { DangerousPatternsAnalyzer } from "./dangerous-patterns.analyzer";
import { InputSanitizationAnalyzer } from "./input-sanitization.analyzer";
import { SecurityHeadersAnalyzer } from "./security-headers.analyzer";
import { TemplateSafetyAnalyzer } from "./template-safety.analyzer";


/**
 * XSSPreventionAnalyzerService
 *
 * Coordinator service that orchestrates 5 specialized analyzers.
 * Pure coordination without mixing responsibilities.
 * Each analyzer has single responsibility principle.
 */
export class XSSPreventionAnalyzerService {
  /**
   * Coordinate all XSS prevention analysis
   * Delegates to specialized analyzers and aggregates violations
   */
  static analyze(projectRoot: string, config: RuleOfCodeConfig): string[] {
    const violations: string[] = [];

    // Coordinate specialized analyzers
    violations.push(...CSPConfigurationAnalyzer.analyze(projectRoot));
    violations.push(...DangerousPatternsAnalyzer.analyze(projectRoot, config));
    violations.push(...InputSanitizationAnalyzer.analyze(projectRoot, config));
    violations.push(...SecurityHeadersAnalyzer.analyze(projectRoot, config));
    violations.push(...TemplateSafetyAnalyzer.analyze(projectRoot, config));

    return violations;
  }
}
