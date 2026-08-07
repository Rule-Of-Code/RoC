import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
} from '../../constants';
import { NgRxConfigurationBase } from '../ngrx-configuration-base';

/**
 * Configuration utility for NgRx Immutability Compliance Analysis
 * Meta-dogfooding: Centralized patterns, detection rules, and validation messages for immutability analysis
 */
export class NgRxImmutabilityConfiguration extends NgRxConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = NgRxImmutabilityConfiguration;

  /**
   * Direct state mutation patterns to detect - RULE 1: Inlined from getter method
   */
  static readonly STATE_MUTATION_PATTERNS = [
    /state\.\w+\s*=/,
    /state\[\w+\]\s*=/,
    /state\.\w+\.push\(/,
    /state\.\w+\.pop\(/,
    /state\.\w+\.shift\(/,
    /state\.\w+\.unshift\(/,
    /state\.\w+\.splice\(/,
    /state\.\w+\.sort\(/,
    /state\.\w+\.reverse\(/,
    /delete\s+state\./,
  ] as const;

  /**
   * Nested object mutation patterns to detect - RULE 1: Inlined from getter method
   */
  static readonly NESTED_UPDATE_PATTERNS = [
    /state\.\w+\.\w+\s*=/,
    /state\[\w+\]\[\w+\]\s*=/,
  ] as const;

  /**
   * Mutating array method keywords to check - RULE 1: Inlined from getter method
   */
  static readonly MUTATING_ARRAY_METHODS = [
    NGRX_KEYWORDS.PUSH_METHOD,
    NGRX_KEYWORDS.POP_METHOD,
    NGRX_KEYWORDS.SPLICE_METHOD,
  ] as const;

  /**
   * Immutable array pattern keywords to check - RULE 1: Inlined from getter method
   */
  static readonly IMMUTABLE_ARRAY_PATTERNS = [
    NGRX_KEYWORDS.SPREAD_DOTS,
    NGRX_KEYWORDS.CONCAT_METHOD,
    NGRX_KEYWORDS.SLICE_METHOD,
  ] as const;

  /**
   * Reducer file extensions for analysis - RULE 1: Inlined from getter method
   */
  static readonly REDUCER_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.REDUCER_TS,
  ] as const;

  /**
   * File read options for reducer analysis - RULE 1: Inlined from getter method
   */
  static readonly FILE_READ_OPTIONS = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
    fallbackToEmpty: true,
  } as const;

  /**
   * Validation messages for immutability compliance - RULE 2: Converted to templates with placeholders
   */
  static readonly VALIDATION_MESSAGES = {
    DIRECT_STATE_MUTATION: `${NGRX_KEYWORDS.DIRECT_STATE_MUTATION} {fileName}`,
    USE_IMMUTABLE_UPDATE: `Use immutable update patterns (${NGRX_KEYWORDS.IMMUTABLE_UPDATE_PATTERNS}) in {fileName}`,
    USE_SPREAD_OPERATOR: `${NGRX_KEYWORDS.USE_SPREAD_OPERATOR} {fileName}`,
    ENSURE_IMMER_IMPORT: `Ensure proper ${NGRX_KEYWORDS.IMMER} import when using produce() in {fileName}`,
    NESTED_OBJECT_MUTATION: `${NGRX_KEYWORDS.NESTED_OBJECT_MUTATION} {fileName}`,
    USE_NESTED_SPREAD: `${NGRX_KEYWORDS.USE_NESTED_SPREAD} {fileName}`,
    ARRAY_MUTATION: `${NGRX_KEYWORDS.ARRAY_MUTATION} {fileName}`,
    USE_IMMUTABLE_ARRAYS: `Use immutable array methods (${NGRX_KEYWORDS.IMMUTABLE_ARRAY_METHODS}) in {fileName}`,
    USE_OBJECT_LITERALS:
      'Use object literal returns for state updates in {fileName}',
    OBJECT_ASSIGN_MUTATION: `${NGRX_KEYWORDS.OBJECT_ASSIGN_MUTATION} {fileName}`,
    USE_PROPER_PATTERNS: `Use ${NGRX_KEYWORDS.OBJECT_ASSIGN_PATTERN} or ${NGRX_KEYWORDS.SPREAD_PATTERN} in {fileName}`,
  } as const;

  /**
   * Check if content matches any mutation patterns
   */
  static hasAnyMutationPattern(
    content: string,
    patterns: readonly RegExp[]
  ): boolean {
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has mutating array methods
   */
  static hasMutatingArrayMethods(content: string): boolean {
    return this.MUTATING_ARRAY_METHODS.some(method => content.includes(method));
  }

  /**
   * Check if content has immutable array patterns
   */
  static hasImmutableArrayPatterns(content: string): boolean {
    return this.IMMUTABLE_ARRAY_PATTERNS.some(pattern =>
      content.includes(pattern)
    );
  }

  /**
   * Check for proper spread operator usage conditions
   */
  static shouldUseSpreads(content: string): boolean {
    return (
      content.includes(NGRX_KEYWORDS.RETURN_STATE) &&
      !content.includes(NGRX_KEYWORDS.SPREAD_OPERATOR) &&
      content.includes(NGRX_KEYWORDS.ON_FUNCTION)
    );
  }

  /**
   * Check for Immer usage without proper imports
   */
  static hasImmerWithoutImport(content: string): boolean {
    return (
      content.includes(NGRX_KEYWORDS.PRODUCE) &&
      (!content.includes(NGRX_KEYWORDS.IMPORT_KEYWORD) ||
        !content.includes(NGRX_KEYWORDS.IMMER))
    );
  }

  /**
   * Check for improper return statements
   */
  static hasImproperReturns(content: string): boolean {
    const returnPattern = /return\s+{/;
    return (
      content.includes(NGRX_KEYWORDS.ON_FUNCTION) &&
      !returnPattern.test(content)
    );
  }

  /**
   * Check for Object.assign with state mutation
   */
  static hasObjectAssignMutation(content: string): boolean {
    return content.includes(NGRX_KEYWORDS.OBJECT_ASSIGN_STATE);
  }

  /**
   * Analyze immutability patterns in content
   * RULE 2: Optimized to cache pattern references and eliminate duplicate lookups
   */
  static analyzeImmutabilityPatterns(content: string): {
    hasDirectMutation: boolean;
    hasNestedMutation: boolean;
    hasArrayMutation: boolean;
    needsSpreadOperator: boolean;
    hasImmerWithoutImport: boolean;
    hasImproperReturns: boolean;
    hasObjectAssignMutation: boolean;
  } {
    return {
      hasDirectMutation: this.hasAnyMutationPattern(
        content,
        this.STATE_MUTATION_PATTERNS
      ),
      hasNestedMutation: this.hasAnyMutationPattern(
        content,
        this.NESTED_UPDATE_PATTERNS
      ),
      hasArrayMutation:
        this.hasMutatingArrayMethods(content) &&
        !this.hasImmutableArrayPatterns(content),
      needsSpreadOperator: this.shouldUseSpreads(content),
      hasImmerWithoutImport: this.hasImmerWithoutImport(content),
      hasImproperReturns: this.hasImproperReturns(content),
      hasObjectAssignMutation: this.hasObjectAssignMutation(content),
    };
  }

  /**
   * Get reducer file extensions for analysis - RULE 1: Removed getter, use readonly property directly
   */
  /**
   * Get file read options for reducer analysis - RULE 1: Removed getter, use readonly property directly
   */
}
