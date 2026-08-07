import type { RuleOfCodeConfig } from '../../../config/types';
import { EnvironmentFilesAnalyzer } from '../../security/environment-files';
import { EnvironmentVariablesUsageAnalyzer } from '../../security/environment-variables-usage';
import { SecretManagementAnalyzer } from '../../security/secret-management';
import { SecretsAnalyzerConfiguration } from './secrets-analyzer-configuration';

// Interface for secrets analysis
interface SecretsAnalysis {
  hasHardcodedSecrets: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Secrets Analyzer Validation
 * Specialized validation utilities for secrets handling analysis
 */
export class SecretsAnalyzerValidation {
  /**
   * Validate secrets handling in the project
   */
  static validateSecretsHandling(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): SecretsAnalysis {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Perform all analyses using direct utility calls (RULE 1: no wrappers)
    const envAnalysis =
      EnvironmentFilesAnalyzer.checkEnvironmentFiles(projectRoot);
    const secretManagementAnalysis =
      SecretManagementAnalyzer.checkSecretManagement(projectRoot);
    const envUsageAnalysis =
      EnvironmentVariablesUsageAnalyzer.checkEnvironmentVariableUsage(
        projectRoot,
        config
      );

    // Collect all violations and suggestions using helper
    this.collectAnalysisResults(envAnalysis, violations, suggestions);
    this.collectAnalysisResults(
      secretManagementAnalysis,
      violations,
      suggestions
    );
    this.collectAnalysisResults(envUsageAnalysis, violations, suggestions);

    // Check for hardcoded secrets indicators
    const hasHardcodedSecrets = this.detectHardcodedSecrets(
      secretManagementAnalysis,
      envUsageAnalysis
    );

    return {
      hasHardcodedSecrets,
      violations,
      suggestions,
    };
  }

  /**
   * Generic helper: Collect violations and suggestions from analysis result
   * Eliminates duplicated push logic
   */
  private static collectAnalysisResults(
    analysis: { violations: string[]; suggestions: string[] },
    violations: string[],
    suggestions: string[]
  ): void {
    violations.push(...analysis.violations);
    suggestions.push(...analysis.suggestions);
  }

  /**
   * Detect hardcoded secrets based on analysis results
   */
  private static detectHardcodedSecrets(
    secretManagementAnalysis: { violations: string[] },
    envUsageAnalysis: { violations: string[] }
  ): boolean {
    const patterns = SecretsAnalyzerConfiguration.getHardcodedSecretsPatterns();

    const allViolations = [
      ...secretManagementAnalysis.violations,
      ...envUsageAnalysis.violations,
    ];

    return allViolations.some(violation =>
      patterns.secretsIndicators.some(indicator =>
        violation.includes(indicator)
      )
    );
  }
}
