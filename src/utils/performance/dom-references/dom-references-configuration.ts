/**
 * DOM References Configuration
 * Centralized patterns, messages and thresholds for DOM reference memory leak detection
 */

import { ANGULAR_CONSTANTS } from '../../angular-constants';
import { PatternMatchingUtils } from '../../pattern-matching-utils';

export class DOMReferencesConfiguration {
  static readonly DOM_PATTERNS = {
    GET_ELEMENT_BY_ID: /document\.getElementById/g,
    QUERY_SELECTOR: /document\.querySelector/g,
    QUERY_SELECTOR_ALL: /document\.querySelectorAll/g,
    NATIVE_ELEMENT: /\.nativeElement/g,
  } as const;

  static readonly CIRCULAR_PATTERNS = {
    SELF_ASSIGNMENT: /this\.(\w+)\s*=.*?this\./g,
    PARENT_CHILD: /(?:parent.*?child|child.*?parent)/gi,
  } as const;

  static readonly CLEANUP_INDICATORS = {
    NULL_ASSIGNMENT: '= null',
    NG_ON_DESTROY: ANGULAR_CONSTANTS.NG_ON_DESTROY,
  } as const;

  static readonly DECORATORS = {
    VIEW_CHILD: /@ViewChild\([^)]+\)\s+(\w+)/g,
  } as const;

  static readonly IMPORTS = {
    ELEMENT_REF: 'ElementRef',
    VIEW_CHILD: 'ViewChild',
    ON_DESTROY: 'OnDestroy',
  } as const;

  static readonly EVENT_PATTERNS = {
    ADD_EVENT_LISTENER: ANGULAR_CONSTANTS.ADD_EVENT_LISTENER,
  } as const;

  static readonly VALIDATION_MESSAGES = {
    DOM_REFERENCE_LEAK:
      '{file}: DOM reference may cause memory leak - {pattern}',
    CIRCULAR_REFERENCE: '{file}: Potential circular reference detected',
    VIEW_CHILD_NEEDS_CLEANUP: `ViewChild {name} may need cleanup in ${ANGULAR_CONSTANTS.NG_ON_DESTROY}`,
    SET_NULL_IN_ONDESTROY: `Set this.{name} = null in ${ANGULAR_CONSTANTS.NG_ON_DESTROY}`,
    CIRCULAR_IN_PROPERTY:
      'Potential circular reference in property: {property}',
    PARENT_CHILD_CIRCULAR: 'Potential parent-child circular reference detected',
    IMPLEMENT_ONDESTROY: `Consider implementing ${ANGULAR_CONSTANTS.NG_ON_DESTROY} to clean up ElementRef references`,
    REMOVE_EVENT_LISTENERS:
      'Ensure event listeners added to nativeElement are properly removed',
  } as const;

  static readonly RECOMMENDATIONS = [
    `Set DOM references to null in ${ANGULAR_CONSTANTS.NG_ON_DESTROY}`,
    'Use ViewChild with static: false for dynamic references',
    'Avoid storing large DOM trees in component properties',
    'Consider using WeakMap for DOM element associations',
  ] as const;

  /**
   * RULE 2: Helper to check ngOnDestroy presence (eliminates duplicate logic)
   */
  private static hasNgOnDestroy(content: string): boolean {
    return PatternMatchingUtils.hasPattern(
      content,
      this.CLEANUP_INDICATORS.NG_ON_DESTROY
    );
  }

  /**
   * RULE 2: Helper to check nativeElement usage (eliminates duplicate logic)
   */
  private static hasNativeElementPattern(content: string): boolean {
    return PatternMatchingUtils.hasRegexPattern(
      content,
      this.DOM_PATTERNS.NATIVE_ELEMENT
    );
  }

  /**
   * Analyzes content for DOM reference patterns
   */
  static analyzeDOMPatterns(content: string): {
    hasGetElementById: boolean;
    hasQuerySelector: boolean;
    hasQuerySelectorAll: boolean;
    hasNativeElement: boolean;
    hasCleanupIndicators: boolean;
  } {
    return {
      hasGetElementById: PatternMatchingUtils.hasRegexPattern(
        content,
        this.DOM_PATTERNS.GET_ELEMENT_BY_ID
      ),
      hasQuerySelector: PatternMatchingUtils.hasRegexPattern(
        content,
        this.DOM_PATTERNS.QUERY_SELECTOR
      ),
      hasQuerySelectorAll: PatternMatchingUtils.hasRegexPattern(
        content,
        this.DOM_PATTERNS.QUERY_SELECTOR_ALL
      ),
      hasNativeElement: this.hasNativeElementPattern(content),
      hasCleanupIndicators: PatternMatchingUtils.hasAnyPattern(content, [
        this.CLEANUP_INDICATORS.NULL_ASSIGNMENT,
        this.CLEANUP_INDICATORS.NG_ON_DESTROY,
      ]),
    };
  }

  /**
   * Analyzes content for circular reference patterns
   */
  static analyzeCircularPatterns(content: string): {
    hasSelfAssignment: boolean;
    hasParentChildPattern: boolean;
  } {
    return {
      hasSelfAssignment: PatternMatchingUtils.hasRegexPattern(
        content,
        this.CIRCULAR_PATTERNS.SELF_ASSIGNMENT
      ),
      hasParentChildPattern: PatternMatchingUtils.hasRegexPattern(
        content,
        this.CIRCULAR_PATTERNS.PARENT_CHILD
      ),
    };
  }

  /**
   * Analyzes content for ViewChild usage
   */
  static analyzeViewChildPatterns(content: string): {
    hasViewChild: boolean;
    hasNgOnDestroy: boolean;
  } {
    return {
      hasViewChild: PatternMatchingUtils.hasRegexPattern(
        content,
        this.DECORATORS.VIEW_CHILD
      ),
      hasNgOnDestroy: this.hasNgOnDestroy(content),
    };
  }

  /**
   * Analyzes content for ElementRef usage
   */
  static analyzeElementRefPatterns(content: string): {
    hasElementRef: boolean;
    hasNativeElement: boolean;
    hasNgOnDestroy: boolean;
    hasEventListener: boolean;
  } {
    return {
      hasElementRef: PatternMatchingUtils.hasPattern(
        content,
        this.IMPORTS.ELEMENT_REF
      ),
      hasNativeElement: this.hasNativeElementPattern(content),
      hasNgOnDestroy: this.hasNgOnDestroy(content),
      hasEventListener: PatternMatchingUtils.hasPattern(
        content,
        this.EVENT_PATTERNS.ADD_EVENT_LISTENER
      ),
    };
  }
}
