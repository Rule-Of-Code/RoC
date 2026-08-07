/**
 * NgRx State Normalization Pattern Constants
 * Contains all regular expressions, messages, and scores
 */

import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

export class NgRxStateNormalizationPatternConstants {
  static readonly NGRX_ENTITY_PACKAGE = '@ngrx/entity';

  static readonly ENTITY_PATTERNS = {
    CREATE_ENTITY_ADAPTER: /createEntityAdapter/,
    ENTITY_ADAPTER_CLASS: /EntityAdapter/,
    ENTITY_STATE_INTERFACE: /EntityState/,
  };

  static readonly NORMALIZATION_PATTERNS = {
    FLAT_STATE: /ids:\s*(?:number|string)\[\].*entities:\s*{/s,
    ENTITY_ADAPTER_USAGE: /createEntityAdapter|EntityAdapter/,
  };

  static readonly NESTED_STATE_ANTIPATTERNS = {
    THREE_LEVELS_DEEP: /\w+\s*:\s*\{[^}]*\{[^}]*\{/,
    USER_NESTED_PROFILE: /user\s*:\s*\{[^}]*profile\s*:\s*\{/,
    ARRAY_IN_STATE: /\w+\s*:\s*\w+\[\]/,
  };

  static readonly SELECTOR_PATTERNS = {
    CREATE_SELECTOR: /createSelector/,
    SELECT_ALL: /selectAll|selectIds|selectEntities/,
    MANUAL_ENTITY_ACCESS: /state\.entities|state\.ids/,
    MAP_WITH_FIND: /\.map\([^)]*\.find\(/,
  };

  static readonly VIOLATION_MESSAGES = {
    NO_ENTITY_ADAPTER: '@ngrx/entity adapters are not being used',
    NO_NORMALIZATION_PATTERNS: 'Normalization patterns are not implemented',
    NESTED_STATE_DETECTED: 'Nested state detected',
    NO_SELECTOR_COMPOSITION: 'Selectors do not follow best practices',
    INCONSISTENT_STATE_SHAPES: 'Inconsistent state shapes',
  };

  static readonly SUGGESTION_MESSAGES = {
    USE_ENTITY_ADAPTER: 'Use @ngrx/entity EntityAdapter',
    IMPLEMENT_FLAT_STATE: 'Implement flat, normalized state',
    FLATTEN_STATE: 'Flatten the nested state',
    USE_ENTITY_SELECTORS: 'Compose selectors with entity selectors',
    STANDARDIZE_STATE_SHAPES: 'Standardize state shapes',
  };

  static readonly SCORE_DEDUCTIONS = {
    NO_ENTITY_ADAPTER: 30,
    NO_NORMALIZATION_PATTERNS: 25,
    NESTED_STATE_DETECTED: 20,
    NO_SELECTOR_COMPOSITION: 15,
    INCONSISTENT_STATE_SHAPES: 10,
  };

  static hasEntityAdapter(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.ENTITY_PATTERNS.CREATE_ENTITY_ADAPTER
      ) ||
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.ENTITY_PATTERNS.ENTITY_ADAPTER_CLASS
      )
    );
  }

  static hasNestedState(content: string): boolean {
    return Object.values(this.NESTED_STATE_ANTIPATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  static hasSelectorCompositionIssues(content: string): boolean {
    const hasCreateSelector = PatternMatchingUtils.hasRegexPattern(
      content,
      this.SELECTOR_PATTERNS.CREATE_SELECTOR
    );

    if (!hasCreateSelector) return false;

    return Object.values(this.SELECTOR_PATTERNS)
      .slice(2)
      .some(pattern => PatternMatchingUtils.hasRegexPattern(content, pattern));
  }

  static followsNormalizationPatterns(content: string): boolean {
    return (
      PatternMatchingUtils.hasRegexPattern(
        content,
        this.NORMALIZATION_PATTERNS.FLAT_STATE
      ) ||
      (PatternMatchingUtils.hasRegexPattern(
        content,
        this.NORMALIZATION_PATTERNS.ENTITY_ADAPTER_USAGE
      ) &&
        !this.hasNestedState(content))
    );
  }
}
