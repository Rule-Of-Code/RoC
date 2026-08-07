/**
 * Environment Variables Usage Analyzer
 * Clean facade for environment variables usage analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import * as Config from './environment-variables-usage-configuration';
import { validateEnvironmentVariablesUsage } from './environment-variables-usage-validation-patterns';

export class EnvironmentVariablesUsageAnalyzer {
  static checkEnvironmentVariableUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): Config.EnvUsageCheckResult {
    return validateEnvironmentVariablesUsage(projectRoot, config);
  }

  static getEnvironmentUsageRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }

  static getEnvironmentBestPractices(): {
    good: readonly string[];
    bad: readonly string[];
  } {
    return Config.BEST_PRACTICES;
  }
}
