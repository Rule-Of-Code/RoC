/**
 * NgRx RxJS Operators Selection Mandate Law Implementation
 * Enforces proper RxJS operator selection in NgRx effects
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxEffectPatternsAnalyzer } from '../../utils/angular/ngrx-effect-patterns';
import { NgRxErrorHandlingAnalyzer } from '../../utils/angular/ngrx-error-handling';
import { RxJSOperatorUsageAnalyzer } from '../../utils/angular/rxjs-operator-usage';

export class NgRxRxJSOperatorsSelectionMandateLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for proper operator usage using specialized utility
    const operatorAnalysis = RxJSOperatorUsageAnalyzer.checkOperatorUsage(
      context.projectRoot,
      context.config
    );
    violations.push(...operatorAnalysis.violations);
    suggestions.push(...operatorAnalysis.suggestions);

    // Check for error handling patterns using specialized utility
    const errorHandlingAnalysis = NgRxErrorHandlingAnalyzer.checkErrorHandling(
      context.projectRoot,
      context.config
    );
    violations.push(...errorHandlingAnalysis.violations);
    suggestions.push(...errorHandlingAnalysis.suggestions);

    // Check for effect patterns using specialized utility
    const effectPatternsAnalysis =
      NgRxEffectPatternsAnalyzer.checkEffectPatterns(
        context.projectRoot,
        context.config
      );
    violations.push(...effectPatternsAnalysis.violations);
    suggestions.push(...effectPatternsAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'NgRx RxJS Operators Selection Mandate',
      message:
        violations.length === 0
          ? 'NgRx RxJS Operators Selection Mandate compliance verified'
          : `${violations.length} NgRx RxJS Operators Selection Mandate violations found`,
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
