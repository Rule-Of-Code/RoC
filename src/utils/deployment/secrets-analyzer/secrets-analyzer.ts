import type { RuleOfCodeConfig } from '../../../config/types';
import { SecretsAnalyzerValidation } from './secrets-analyzer-validation';
// Interface for secrets analysis
interface SecretsAnalysis {
  hasHardcodedSecrets: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Secrets Analyzer
 */
export class SecretsAnalyzer {
  /**
   * Analyze secrets handling in the project
   */
  static analyzeSecretsHandling(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): SecretsAnalysis {
    return SecretsAnalyzerValidation.validateSecretsHandling(
      projectRoot,
      config
    );
  }
}
