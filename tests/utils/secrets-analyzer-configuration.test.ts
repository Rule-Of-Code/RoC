/**
 * Tests for SecretsAnalyzerConfiguration
 *
 * Tests the secrets analyzer configuration patterns and methods.
 */
import { SecretsAnalyzerConfiguration } from '../../src/utils/deployment/secrets-analyzer/secrets-analyzer-configuration';

describe('SecretsAnalyzerConfiguration', () => {
  describe('SECRETS_INDICATORS', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(SecretsAnalyzerConfiguration.SECRETS_INDICATORS)
      ).toBe(true);
    });

    it('should contain hardcoded indicator', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS).toContain(
        'hardcoded'
      );
    });

    it('should contain secret indicator', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS).toContain(
        'secret'
      );
    });

    it('should contain credential indicator', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS).toContain(
        'credential'
      );
    });

    it('should contain api_key indicator', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS).toContain(
        'api_key'
      );
    });

    it('should contain token indicator', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS).toContain(
        'token'
      );
    });

    it('should have 5 indicators', () => {
      expect(SecretsAnalyzerConfiguration.SECRETS_INDICATORS.length).toBe(5);
    });
  });

  describe('ANALYSIS_COMPONENTS', () => {
    it('should have environmentFiles component', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_COMPONENTS.environmentFiles
      ).toBe('EnvironmentFilesAnalyzer');
    });

    it('should have secretManagement component', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_COMPONENTS.secretManagement
      ).toBe('SecretManagementAnalyzer');
    });

    it('should have environmentVariablesUsage component', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_COMPONENTS
          .environmentVariablesUsage
      ).toBe('EnvironmentVariablesUsageAnalyzer');
    });
  });

  describe('ANALYZER_METHODS', () => {
    it('should have checkEnvironmentFiles method', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYZER_METHODS.checkEnvironmentFiles
      ).toBe('checkEnvironmentFiles');
    });

    it('should have checkSecretManagement method', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYZER_METHODS.checkSecretManagement
      ).toBe('checkSecretManagement');
    });

    it('should have checkEnvironmentVariableUsage method', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYZER_METHODS
          .checkEnvironmentVariableUsage
      ).toBe('checkEnvironmentVariableUsage');
    });
  });

  describe('ANALYSIS_RETURN_STRUCTURE', () => {
    it('should have hasHardcodedSecretsKey', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_RETURN_STRUCTURE
          .hasHardcodedSecretsKey
      ).toBe('hasHardcodedSecrets');
    });

    it('should have violationsKey', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_RETURN_STRUCTURE.violationsKey
      ).toBe('violations');
    });

    it('should have suggestionsKey', () => {
      expect(
        SecretsAnalyzerConfiguration.ANALYSIS_RETURN_STRUCTURE.suggestionsKey
      ).toBe('suggestions');
    });
  });

  describe('getHardcodedSecretsPatterns', () => {
    it('should return object with secretsIndicators', () => {
      const result = SecretsAnalyzerConfiguration.getHardcodedSecretsPatterns();
      expect(result.secretsIndicators).toBeDefined();
    });

    it('should return same indicators as SECRETS_INDICATORS', () => {
      const result = SecretsAnalyzerConfiguration.getHardcodedSecretsPatterns();
      expect(result.secretsIndicators).toBe(
        SecretsAnalyzerConfiguration.SECRETS_INDICATORS
      );
    });

    it('should have all 5 indicators', () => {
      const result = SecretsAnalyzerConfiguration.getHardcodedSecretsPatterns();
      expect(result.secretsIndicators.length).toBe(5);
    });
  });

  describe('getAnalysisComponents', () => {
    it('should return ANALYSIS_COMPONENTS object', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisComponents();
      expect(result).toBe(SecretsAnalyzerConfiguration.ANALYSIS_COMPONENTS);
    });

    it('should have environmentFiles property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisComponents();
      expect(result.environmentFiles).toBe('EnvironmentFilesAnalyzer');
    });

    it('should have secretManagement property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisComponents();
      expect(result.secretManagement).toBe('SecretManagementAnalyzer');
    });

    it('should have environmentVariablesUsage property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisComponents();
      expect(result.environmentVariablesUsage).toBe(
        'EnvironmentVariablesUsageAnalyzer'
      );
    });
  });

  describe('getAnalyzerMethods', () => {
    it('should return ANALYZER_METHODS object', () => {
      const result = SecretsAnalyzerConfiguration.getAnalyzerMethods();
      expect(result).toBe(SecretsAnalyzerConfiguration.ANALYZER_METHODS);
    });

    it('should have checkEnvironmentFiles property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalyzerMethods();
      expect(result.checkEnvironmentFiles).toBe('checkEnvironmentFiles');
    });

    it('should have checkSecretManagement property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalyzerMethods();
      expect(result.checkSecretManagement).toBe('checkSecretManagement');
    });

    it('should have checkEnvironmentVariableUsage property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalyzerMethods();
      expect(result.checkEnvironmentVariableUsage).toBe(
        'checkEnvironmentVariableUsage'
      );
    });
  });

  describe('getAnalysisReturnStructure', () => {
    it('should return ANALYSIS_RETURN_STRUCTURE object', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisReturnStructure();
      expect(result).toBe(
        SecretsAnalyzerConfiguration.ANALYSIS_RETURN_STRUCTURE
      );
    });

    it('should have hasHardcodedSecretsKey property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisReturnStructure();
      expect(result.hasHardcodedSecretsKey).toBe('hasHardcodedSecrets');
    });

    it('should have violationsKey property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisReturnStructure();
      expect(result.violationsKey).toBe('violations');
    });

    it('should have suggestionsKey property', () => {
      const result = SecretsAnalyzerConfiguration.getAnalysisReturnStructure();
      expect(result.suggestionsKey).toBe('suggestions');
    });
  });
});
