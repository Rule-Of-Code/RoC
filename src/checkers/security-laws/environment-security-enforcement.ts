/**
 * Environment Security Enforcement Law - Streamlined
 * Enforces proper environment variable security and configuration management
 * Delegates to specialized analyzers for SRP compliance
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { EnvironmentFilesAnalyzer } from '../../utils/security/environment-files';
import { EnvironmentVariablesUsageAnalyzer } from '../../utils/security/environment-variables-usage';
import { SecretManagementAnalyzer } from '../../utils/security/secret-management';
import { SecurityLawResultBuilder } from './security-law-result-builder';

export class EnvironmentSecurityEnforcementLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Delegate to specialized analyzers
    const envFileAnalysis = EnvironmentFilesAnalyzer.checkEnvironmentFiles(
      context.projectRoot
    );
    violations.push(...envFileAnalysis.violations);
    suggestions.push(...envFileAnalysis.suggestions);

    const envUsageAnalysis =
      EnvironmentVariablesUsageAnalyzer.checkEnvironmentVariableUsage(
        context.projectRoot,
        context.config
      );
    violations.push(...envUsageAnalysis.violations);
    suggestions.push(...envUsageAnalysis.suggestions);

    const secretAnalysis = SecretManagementAnalyzer.checkSecretManagement(
      context.projectRoot
    );
    violations.push(...secretAnalysis.violations);
    suggestions.push(...secretAnalysis.suggestions);

    // Collect recommendations from all analyzers
    suggestions.push(
      ...EnvironmentFilesAnalyzer.getEnvironmentSecurityRecommendations()
    );
    suggestions.push(
      ...EnvironmentVariablesUsageAnalyzer.getEnvironmentUsageRecommendations()
    );
    suggestions.push(
      ...SecretManagementAnalyzer.getSecretManagementRecommendations()
    );

    return SecurityLawResultBuilder.createResult(
      violations,
      'Environment Security Enforcement Law',
      Array.from(new Set(suggestions)), // Remove duplicates
      context
    );
  }
}
