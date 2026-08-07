/**
 * NgRx State Normalization Mandate Law
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxStateNormalizationPatternConstants as Patterns } from './ngrx-state-normalization-mandate/constants/patterns';
import { NgRxStateNormalizationEntityUsageService } from './ngrx-state-normalization-mandate/services/entity-usage.service';
import { NgRxStateNormalizationAnalyzerService } from './ngrx-state-normalization-mandate/services/normalization-analyzer.service';
import { NgRxStateNormalizationSelectorAnalyzerService } from './ngrx-state-normalization-mandate/services/selector-analyzer.service';

export class NgRxStateNormalizationMandateLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const projectRoot = context.projectRoot || process.cwd();

    // Entity Usage Check
    const entityUsage =
      NgRxStateNormalizationEntityUsageService.checkEntityUsage(projectRoot);
    if (!entityUsage.hasEntityAdapter) {
      violations.push(Patterns.VIOLATION_MESSAGES.NO_ENTITY_ADAPTER);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.USE_ENTITY_ADAPTER);
      score -= Patterns.SCORE_DEDUCTIONS.NO_ENTITY_ADAPTER;
    }

    // Normalization Patterns Check
    const normalizationPatterns =
      await NgRxStateNormalizationAnalyzerService.checkNormalizationPatterns(
        projectRoot,
        context.config
      );
    if (!normalizationPatterns.followsPatterns) {
      violations.push(Patterns.VIOLATION_MESSAGES.NO_NORMALIZATION_PATTERNS);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.IMPLEMENT_FLAT_STATE);
      score -= Patterns.SCORE_DEDUCTIONS.NO_NORMALIZATION_PATTERNS;
    }

    // Nested State Check
    const nestedStateCheck =
      NgRxStateNormalizationAnalyzerService.checkNestedStateAntiPatterns(
        projectRoot
      );
    if (nestedStateCheck.hasNestedState) {
      violations.push(Patterns.VIOLATION_MESSAGES.NESTED_STATE_DETECTED);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.FLATTEN_STATE);
      score -= Patterns.SCORE_DEDUCTIONS.NESTED_STATE_DETECTED;
    }

    // State Consistency Check
    const consistencyCheck =
      NgRxStateNormalizationAnalyzerService.checkStateShapeConsistency(
        projectRoot
      );
    if (!consistencyCheck.isConsistent) {
      violations.push(Patterns.VIOLATION_MESSAGES.INCONSISTENT_STATE_SHAPES);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.STANDARDIZE_STATE_SHAPES);
      score -= Patterns.SCORE_DEDUCTIONS.INCONSISTENT_STATE_SHAPES;
    }

    // Selector Composition Check
    const selectorCheck =
      NgRxStateNormalizationSelectorAnalyzerService.checkSelectorComposition(
        projectRoot
      );
    if (!selectorCheck.followsBestPractices) {
      violations.push(Patterns.VIOLATION_MESSAGES.NO_SELECTOR_COMPOSITION);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.USE_ENTITY_SELECTORS);
      score -= Patterns.SCORE_DEDUCTIONS.NO_SELECTOR_COMPOSITION;
    }

    score = Math.max(0, score);

    return {
      passed: violations.length === 0,
      violations,
      suggestions,
      score,
      message:
        violations.length === 0
          ? 'State normalization OK'
          : `Issues found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      fixable: true,
      config: context.config,
    };
  }
}

export default NgRxStateNormalizationMandateLaw;
