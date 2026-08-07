/**
 * Secret Management Analyzer
 * Clean facade for secret management analysis
 */

import * as Config from './secret-management-configuration';
import { validateSecretManagement } from './secret-management-validation-patterns';

export class SecretManagementAnalyzer {
  static checkSecretManagement(projectRoot: string): Config.SecretCheckResult {
    return validateSecretManagement(projectRoot);
  }

  static getSecretManagementRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }

  static getSecretManagementPatterns(): {
    secure: readonly string[];
    insecure: readonly string[];
  } {
    return Config.PATTERNS;
  }
}
