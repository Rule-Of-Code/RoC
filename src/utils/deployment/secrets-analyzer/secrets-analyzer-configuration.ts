/**
 * Secrets Analyzer Configuration
 * Centralized configuration for secrets analysis patterns and detection rules
 */
export class SecretsAnalyzerConfiguration {
  private static readonly Config = SecretsAnalyzerConfiguration;

  /**
   * Hardcoded secrets detection indicators (RULE 1: 100% internal coverage)
   */
  static readonly SECRETS_INDICATORS = [
    'hardcoded',
    'secret',
    'credential',
    'api_key',
    'token',
  ] as readonly string[];

  /**
   * Secrets analysis components configuration (RULE 1: 100% internal coverage)
   */
  static readonly ANALYSIS_COMPONENTS = {
    environmentFiles: 'EnvironmentFilesAnalyzer',
    secretManagement: 'SecretManagementAnalyzer',
    environmentVariablesUsage: 'EnvironmentVariablesUsageAnalyzer',
  } as const;

  /**
   * Analyzer method names (RULE 1: 100% internal coverage)
   */
  static readonly ANALYZER_METHODS = {
    checkEnvironmentFiles: 'checkEnvironmentFiles',
    checkSecretManagement: 'checkSecretManagement',
    checkEnvironmentVariableUsage: 'checkEnvironmentVariableUsage',
  } as const;

  /**
   * Secrets analysis return structure keys (RULE 1: 100% internal coverage)
   */
  static readonly ANALYSIS_RETURN_STRUCTURE = {
    hasHardcodedSecretsKey: 'hasHardcodedSecrets',
    violationsKey: 'violations',
    suggestionsKey: 'suggestions',
  } as const;

  /**
   * Get hardcoded secrets detection patterns
   */
  static getHardcodedSecretsPatterns(): {
    secretsIndicators: readonly string[];
  } {
    return {
      secretsIndicators: this.SECRETS_INDICATORS,
    };
  }

  /**
   * Get secrets analysis components configuration
   */
  static getAnalysisComponents(): {
    environmentFiles: string;
    secretManagement: string;
    environmentVariablesUsage: string;
  } {
    return this.ANALYSIS_COMPONENTS;
  }

  /**
   * Get analyzer method names
   */
  static getAnalyzerMethods(): {
    checkEnvironmentFiles: string;
    checkSecretManagement: string;
    checkEnvironmentVariableUsage: string;
  } {
    return this.ANALYZER_METHODS;
  }

  /**
   * Get secrets analysis return structure
   */
  static getAnalysisReturnStructure(): {
    hasHardcodedSecretsKey: string;
    violationsKey: string;
    suggestionsKey: string;
  } {
    return this.ANALYSIS_RETURN_STRUCTURE;
  }
}
