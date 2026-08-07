/**
 * Encryption Implementation Analyzer
 * Clean facade for encryption implementation analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import * as Config from './encryption-implementation-configuration';
import { validateEncryptionImplementation } from './encryption-implementation-validation-patterns';

export class EncryptionImplementationAnalyzer {
  static checkEncryptionImplementation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): Config.EncryptionCheckResult {
    return validateEncryptionImplementation(projectRoot, config);
  }

  static getEncryptionRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }
}
