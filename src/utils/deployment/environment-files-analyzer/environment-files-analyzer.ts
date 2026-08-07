import type { RuleOfCodeConfig } from '../../../config/types';
import { EnvironmentFilesAnalyzerValidation } from './environment-files-analyzer-validation';
// Interfaces for environment analysis
interface EnvFileAnalysis {
  hasEnvExample: boolean;
  hasEnvInGit: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Environment Files Analyzer
 * Specialized utility for analyzing environment files and their consistency
 */
export class DeploymentEnvironmentAnalyzer {
  /**
   * Get environment files in the project
   */
  static getEnvironmentFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    return EnvironmentFilesAnalyzerValidation.validateEnvironmentFiles(
      projectRoot
    );
  }

  /**
   * Check environment consistency across different environment files
   */
  static checkEnvironmentConsistency(environmentFiles: string[]): {
    violations: string[];
    suggestions: string[];
  } {
    return EnvironmentFilesAnalyzerValidation.validateEnvironmentConsistency(
      environmentFiles
    );
  }

  /**
   * Analyze .env files setup and best practices
   */
  static analyzeEnvFiles(projectRoot: string): EnvFileAnalysis {
    return EnvironmentFilesAnalyzerValidation.validateEnvFiles(projectRoot);
  }
}
