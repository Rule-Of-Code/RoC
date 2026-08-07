/**
 * Constitutional Compliance Headers Law Implementation (Streamlined)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  FileHeaderComplianceAnalyzer,
  HeaderAutomationAnalyzer,
  HeaderConfigurationAnalyzer,
} from '../../utils/constitutional';

export class ConstitutionalComplianceHeadersLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for header templates and configuration using specialized utility
    const headerAnalysis = HeaderConfigurationAnalyzer.checkHeaderConfiguration(
      context.projectRoot
    );
    violations.push(...headerAnalysis.violations);
    suggestions.push(...headerAnalysis.suggestions);

    // Check sample files for header compliance using specialized utility
    const complianceAnalysis =
      FileHeaderComplianceAnalyzer.checkFileHeaderCompliance(
        context.projectRoot
      );
    violations.push(...complianceAnalysis.violations);
    suggestions.push(...complianceAnalysis.suggestions);

    // Check for automated header tools using specialized utility
    const automationAnalysis = HeaderAutomationAnalyzer.checkHeaderAutomation(
      context.projectRoot
    );
    violations.push(...automationAnalysis.violations);
    suggestions.push(...automationAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Constitutional Compliance Headers',
      message:
        violations.length === 0
          ? 'Constitutional Compliance Headers compliance verified'
          : `${violations.length} Constitutional Compliance Headers violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
