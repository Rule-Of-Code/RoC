import { HeaderConfigurationAnalyzerValidation } from './header-configuration-analyzer-validation';

/**
 * Header Configuration Analyzer
 * Specialized utility for analyzing constitutional compliance header configuration
 */
export class HeaderConfigurationAnalyzer {
  /**
   * Check for header templates and configuration
   */
  static checkHeaderConfiguration(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    return HeaderConfigurationAnalyzerValidation.executeHeaderConfigurationAnalysisWorkflow(
      projectRoot
    );
  }
}

