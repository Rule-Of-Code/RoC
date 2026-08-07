/**
 * Environment Files Security Analyzer
 * Clean facade for environment files security analysis
 */

import * as Config from './environment-files-configuration';
import { validateEnvironmentFiles } from './environment-files-validation-patterns';

export class EnvironmentFilesAnalyzer {
  static checkEnvironmentFiles(projectRoot: string): Config.EnvCheckResult {
    return validateEnvironmentFiles(projectRoot);
  }

  static getEnvironmentSecurityRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }
}
