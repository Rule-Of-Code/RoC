import { HeaderAutomationAnalyzerValidation } from './header-automation-analyzer-validation';

/**
 * Header Automation Analyzer
 * Specialized utility for analyzing automated header management tools
 */
export class HeaderAutomationAnalyzer {
  /**
   * Check for automated header tools
   */
  static checkHeaderAutomation(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    return HeaderAutomationAnalyzerValidation.executeHeaderAutomationAnalysisWorkflow(
      projectRoot
    );
  }
}
