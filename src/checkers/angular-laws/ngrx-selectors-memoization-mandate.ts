/**
 * NgRx Selectors Memoization Mandate Law Implementation (SACRED LAW)
 * Enforces proper memoization patterns for NgRx selectors
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxMemoizationComplianceAnalyzer } from '../../utils/angular/ngrx-memoization';
import { NgRxSelectorPatternsAnalyzer } from '../../utils/angular/ngrx-selector-patterns';
import { NgRxSetupAnalyzer } from '../../utils/angular/ngrx-setup';

export class NgRxSelectorsMemoizationMandateLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for NgRx setup using specialized utility
    const ngrxSetupAnalysis = NgRxSetupAnalyzer.checkNgRxSetup(
      context.projectRoot,
      context.config
    );
    violations.push(...ngrxSetupAnalysis.violations);
    suggestions.push(...ngrxSetupAnalysis.suggestions);

    // Check for proper selector patterns using specialized utility
    const selectorAnalysis = NgRxSelectorPatternsAnalyzer.checkSelectorPatterns(
      context.projectRoot,
      context.config
    );
    violations.push(...selectorAnalysis.violations);
    suggestions.push(...selectorAnalysis.suggestions);

    // Check for memoization compliance using specialized utility
    const memoizationAnalysis =
      NgRxMemoizationComplianceAnalyzer.checkMemoizationCompliance(
        context.projectRoot,
        context.config
      );
    violations.push(...memoizationAnalysis.violations);
    suggestions.push(...memoizationAnalysis.suggestions);

    const score =
      violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10);

    return {
      passed: score >= 100,
      lawName: 'NgRx Selectors Memoization Mandate',
      message:
        score >= 100
          ? 'NgRx Selectors Memoization Mandate compliance verified'
          : `${violations.length} NgRx Selectors Memoization Mandate violations found`,
      violations,
      suggestions,
      score,
      config: context.config,
    };
  }
}
