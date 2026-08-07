import { FileHeaderComplianceValidation } from './file-header-compliance-validation';

/**
 * File Header Compliance Analyzer
 * Specialized utility for analyzing constitutional compliance in file headers
 */
export class FileHeaderComplianceAnalyzer {
  /**
   * Check sample files for header compliance
   */
  static checkFileHeaderCompliance(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    return FileHeaderComplianceValidation.executeAnalysisWorkflow(projectRoot);
  }
}
