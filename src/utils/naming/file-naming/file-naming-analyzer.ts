import type { RuleOfCodeConfig } from '../../../config/types';
import { FileNamingValidation } from './file-naming-validation';

/**
 * File Naming Analyzer
 * Specialized utility for analyzing file and directory naming conventions
 */
export class FileNamingAnalyzer {
  /**
   * Analyze file naming patterns
   */
  static analyzeFileNaming(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return FileNamingValidation.analyzeFileNamingPatterns(projectRoot, config);
  }
}
