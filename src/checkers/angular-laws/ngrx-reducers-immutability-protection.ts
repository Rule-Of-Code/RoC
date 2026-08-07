/**
 * NgRx Reducers Immutability Protection Law Implementation (SACRED LAW)
 * Enforces immutable state updates in NgRx reducers
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxActionHandlingAnalyzer } from '../../utils/angular/ngrx-action-handling';
import { NgRxImmutabilityComplianceAnalyzer } from '../../utils/angular/ngrx-immutability';
import { NgRxReducerPatternsAnalyzer } from '../../utils/angular/ngrx-reducer-patterns';

export class NgRxReducersImmutabilityProtectionLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for proper reducer patterns using specialized utility
    const reducerAnalysis = NgRxReducerPatternsAnalyzer.checkReducerPatterns(
      context.projectRoot,
      context.config
    );
    violations.push(...reducerAnalysis.violations);
    suggestions.push(...reducerAnalysis.suggestions);

    // Check for immutability compliance using specialized utility
    const immutabilityAnalysis =
      NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
        context.projectRoot,
        context.config
      );
    violations.push(...immutabilityAnalysis.violations);
    suggestions.push(...immutabilityAnalysis.suggestions);

    // Check for action handling patterns using specialized utility
    const actionAnalysis = NgRxActionHandlingAnalyzer.checkActionHandling(
      context.projectRoot,
      context.config
    );
    violations.push(...actionAnalysis.violations);
    suggestions.push(...actionAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'NgRx Reducers Immutability Protection',
      message:
        violations.length === 0
          ? 'NgRx Reducers Immutability Protection compliance verified'
          : `${violations.length} NgRx Reducers Immutability Protection violations found`,
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
