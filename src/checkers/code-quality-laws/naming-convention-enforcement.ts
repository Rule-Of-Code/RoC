/**
 * Naming Convention Enforcement Law (Streamlined)
 * CodeNamingAnalyzer: Enforces consistent naming conventions across the codebase
 */

import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import {
  CodeNamingAnalyzer,
  ESLintNamingConfigAnalyzer,
  FileNamingAnalyzer,
} from '../../utils/naming';

export class NamingConventionEnforcementLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const violationDetails: ViolationDetail[] = [];

    // Check naming convention configuration using specialized utility
    const conventionConfig =
      ESLintNamingConfigAnalyzer.checkNamingConventionConfig(
        context.projectRoot
      );
    violations.push(...conventionConfig.violations);
    suggestions.push(...conventionConfig.suggestions);

    // Add structured violation for ESLint config if missing
    if (conventionConfig.violations.length > 0) {
      violationDetails.push({
        file: 'eslint.config.mjs',
        message:
          'No naming convention rules configured (@typescript-eslint/naming-convention)',
      });
    }

    // Analyze file and directory naming using specialized utility
    const fileNamingAnalysis = FileNamingAnalyzer.analyzeFileNaming(
      context.projectRoot,
      context.config
    );
    violations.push(...fileNamingAnalysis.violations);
    suggestions.push(...fileNamingAnalysis.suggestions);

    // Check code naming patterns using specialized utility
    const codeNamingAnalysis = CodeNamingAnalyzer.analyzeCodeNaming(
      context.projectRoot,
      context.config
    );
    violations.push(...codeNamingAnalysis.violations);
    suggestions.push(...codeNamingAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Naming Convention Enforcement',
      message:
        violations.length === 0
          ? 'Naming Convention Enforcement compliance verified'
          : `${violations.length} Naming Convention Enforcement violations found`,
      violations,
      suggestions,
      violationDetails,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
