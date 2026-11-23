import type * as TS from 'typescript';

import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
  PERFORMANCE_CONSTANTS,
} from '../../constants';
import { loadTypeScript } from '../../react/tsx-source';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * Configuration utility for NgRx Memoization Compliance Analysis
 * Meta-dogfooding: Centralized patterns, validation rules, and performance thresholds for memoization analysis
 */
export class NgRxMemoizationConfiguration extends SignalConfigurationBase {
  /**
   * File extensions for selector analysis - RULE 1: Inlined from getter method
   */
  static readonly SELECTOR_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.SELECTORS_TS,
    FILE_EXTENSIONS.SELECTOR_TS,
  ] as const;

  /**
   * File extensions for component analysis - RULE 1: Inlined from getter method
   */
  static readonly COMPONENT_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.COMPONENT_TS,
  ] as const;

  /**
   * Direct state access pattern: a raw exported selector defined as a plain
   * arrow that reads a property off its argument, instead of createSelector().
   * Matches any parameter name, with or without parentheses (e.g.
   * `export const getX = (s) => s.a.b`, `export const getY = state => state.a`).
   * Anchored on `export const NAME =` so it does not match createSelector()
   * projector arrows or inner array callbacks.
   */
  static readonly DIRECT_STATE_ACCESS_PATTERN =
    /export\s+const\s+\w+\s*=\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.[\w.[\]]+/g;

  /**
   * Single parameter selector pattern for createFeatureSelector recommendations - RULE 1: Inlined
   */
  static readonly SINGLE_PARAM_SELECTOR_PATTERN = new RegExp(
    `${NGRX_KEYWORDS.CREATE_SELECTOR}\\(\\s*state\\s*=>`,
    'g'
  );

  /**
   * Complex selector pattern for performance analysis - RULE 1: Inlined from getter method
   */
  static readonly COMPLEX_SELECTOR_PATTERN = new RegExp(
    `${NGRX_KEYWORDS.CREATE_SELECTOR}\\([^}]+\\}`,
    'g'
  );

  /**
   * Direct store.select pattern for validation - RULE 1: Inlined from getter method
   */
  static readonly DIRECT_SELECT_PATTERN = /store\.select\([^)]+\)/g;

  /**
   * Selector subscription pattern for validation - RULE 1: Inlined from getter method
   */
  static readonly SELECTOR_SUBSCRIPTION_PATTERN =
    /\.select\([^)]+\)\.subscribe/g;

  /**
   * Selector composition pattern for reusability analysis - RULE 1: Inlined from getter method
   */
  static readonly SELECTOR_COMPOSITION_PATTERN = /select\w+,\s*select\w+/g;

  /**
   * Validation messages for memoization compliance - RULE 2: Converted to templates with placeholders
   */
  static readonly VALIDATION_MESSAGES = {
    DIRECT_STATE_ACCESS:
      'Direct state access without memoization in {fileName}',
    WRAP_WITH_SELECTOR: 'Wrap state access with createSelector in {fileName}',
    USE_FEATURE_SELECTOR:
      'Use createFeatureSelector for single state parameter selectors in {fileName}',
    OPTIMIZE_COMPLEX_SELECTOR:
      'Complex computation in selector, consider optimization in {fileName}',
    MISSING_STORE_IMPORT:
      'createSelector used but @ngrx/store not imported in {fileName}',
    IMPORT_FROM_STORE: `Import createSelector from ${NGRX_KEYWORDS.NGRX_STORE} in {fileName}`,
    COMPOSE_SELECTORS:
      'Consider composing selectors for better reusability in {fileName}',
    DIRECT_STORE_SELECT:
      'Direct store.select usage instead of selector in {fileName}',
    USE_MEMOIZED_SELECTORS:
      'Use memoized selectors instead of direct store.select in {fileName}',
    USE_ASYNC_PIPE:
      'Multiple subscriptions detected, consider using async pipe in {fileName}',
    ENSURE_CLEANUP:
      'Ensure proper subscription cleanup for selectors in {fileName}',
  } as const;

  /**
   * File read options for analysis - RULE 1: Inlined from getter method
   */
  static readonly FILE_READ_OPTIONS = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
    fallbackToEmpty: true,
  } as const;

  /**
   * Component file read options (without fallback) - RULE 1: Inlined from getter method
   */
  static readonly COMPONENT_FILE_READ_OPTIONS = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
  } as const;

  /**
   * Check if content has direct state access patterns
   */
  static hasDirectStateAccess(content: string): string[] | null {
    const ts = loadTypeScript(process.cwd());
    if (!ts) return content.match(this.DIRECT_STATE_ACCESS_PATTERN);
    const names = this.rawSelectors(ts, content);
    return names.length > 0 ? names : null;
  }

  /**
   * The exported raw selectors of a file, read from its syntax tree (#530):
   * an exported `const` whose value is an arrow with one parameter — typed or
   * not — that reads a property of that parameter. A `createSelector(…)` or
   * `createFeatureSelector(…)` value is a call, not an arrow, and a projector
   * arrow inside one is not an exported declaration, so neither is read.
   */
  private static rawSelectors(ts: typeof TS, content: string): string[] {
    const source = ts.createSourceFile(
      'selectors.ts',
      content,
      ts.ScriptTarget.Latest,
      true
    );
    const names: string[] = [];
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const exported = ts
        .getModifiers(statement)
        ?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      for (const declaration of statement.declarationList.declarations) {
        const value = declaration.initializer;
        if (
          value &&
          ts.isArrowFunction(value) &&
          ts.isIdentifier(declaration.name) &&
          this.readsParameter(ts, value)
        ) {
          names.push(declaration.name.text);
        }
      }
    }
    return names;
  }

  /** Whether a one-parameter arrow reads a property of its parameter. */
  private static readsParameter(
    ts: typeof TS,
    arrow: TS.ArrowFunction
  ): boolean {
    const [parameter] = arrow.parameters;
    if (arrow.parameters.length !== 1 || !parameter) return false;
    if (!ts.isIdentifier(parameter.name)) return false;
    const name = parameter.name.text;
    let reads = false;
    const visit = (node: TS.Node): void => {
      if (
        (ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === name
      ) {
        reads = true;
      }
      if (!reads) ts.forEachChild(node, visit);
    };
    visit(arrow.body);
    return reads;
  }

  /**
   * Check if content has createSelector usage
   */
  static hasCreateSelector(content: string): boolean {
    return content.includes(NGRX_KEYWORDS.CREATE_SELECTOR);
  }

  /**
   * Find single parameter selectors
   */
  static findSingleParamSelectors(content: string): RegExpMatchArray | null {
    return content.match(this.SINGLE_PARAM_SELECTOR_PATTERN);
  }

  /**
   * Find complex selector computations
   */
  static findComplexSelectorComputations(
    content: string
  ): RegExpMatchArray | null {
    return content.match(this.COMPLEX_SELECTOR_PATTERN);
  }

  /**
   * Check if selector computation is complex
   */
  static isComplexSelectorComputation(selectorMatch: string): boolean {
    return (
      selectorMatch.length > PERFORMANCE_CONSTANTS.MAX_SELECTOR_LENGTH ||
      selectorMatch.includes('for (') ||
      selectorMatch.includes('while (')
    );
  }

  /**
   * Check if content has proper store imports
   */
  static hasProperStoreImports(content: string): boolean {
    return (
      !this.hasCreateSelector(content) ||
      content.includes(NGRX_KEYWORDS.NGRX_STORE)
    );
  }

  /**
   * Count createSelector usage
   */
  static countCreateSelectors(content: string): number {
    return (content.match(new RegExp(NGRX_KEYWORDS.CREATE_SELECTOR, 'g')) ?? [])
      .length;
  }

  /**
   * Count composed selectors
   */
  static countComposedSelectors(content: string): number {
    return (content.match(this.SELECTOR_COMPOSITION_PATTERN) ?? []).length;
  }

  /**
   * Check if content needs selector composition
   */
  static needsSelectorComposition(content: string): boolean {
    const selectorCount = this.countCreateSelectors(content);
    const composedSelectors = this.countComposedSelectors(content);

    return (
      selectorCount > PERFORMANCE_CONSTANTS.MAX_SELECTORS_BEFORE_COMPOSITION &&
      composedSelectors === 0
    );
  }

  /**
   * Find direct store.select patterns
   */
  static findDirectSelects(content: string): RegExpMatchArray | null {
    return content.match(this.DIRECT_SELECT_PATTERN);
  }

  /**
   * Check if content has valid direct select usage
   */
  static hasValidDirectSelectUsage(content: string): boolean {
    return (
      !content.includes('store.select') ||
      content.includes(NGRX_KEYWORDS.SELECT_PREFIX)
    );
  }

  /**
   * Check if direct select is invalid
   */
  static isInvalidDirectSelect(select: string): boolean {
    return (
      !select.includes('select') || select.includes("'") || select.includes('"')
    );
  }

  /**
   * Find selector subscriptions
   */
  static findSelectorSubscriptions(content: string): RegExpMatchArray | null {
    return content.match(this.SELECTOR_SUBSCRIPTION_PATTERN);
  }

  /**
   * Check if content has too many subscriptions
   */
  static hasTooManySubscriptions(content: string): boolean {
    const subscriptions = this.findSelectorSubscriptions(content);
    return (
      subscriptions !== null &&
      subscriptions.length >
        PERFORMANCE_CONSTANTS.MAX_SUBSCRIPTIONS_BEFORE_ASYNC
    );
  }

  /**
   * Check if content needs subscription cleanup
   */
  static needsSubscriptionCleanup(content: string): boolean {
    return (
      content.includes('.select(') &&
      !content.includes(ANGULAR_CONSTANTS.ASYNC_PIPE) &&
      !content.includes(ANGULAR_CONSTANTS.SUBSCRIPTION)
    );
  }

  /**
   * Analyze memoization patterns in selector content
   */
  static analyzeSelectorMemoizationPatterns(content: string): {
    hasDirectStateAccess: boolean;
    hasCreateSelector: boolean;
    hasSingleParamSelectors: boolean;
    hasComplexComputations: boolean;
    hasProperImports: boolean;
    needsComposition: boolean;
  } {
    return {
      hasDirectStateAccess: this.hasDirectStateAccess(content) !== null,
      hasCreateSelector: this.hasCreateSelector(content),
      hasSingleParamSelectors: this.findSingleParamSelectors(content) !== null,
      hasComplexComputations:
        this.findComplexSelectorComputations(content)?.some(match =>
          this.isComplexSelectorComputation(match)
        ) ?? false,
      hasProperImports: this.hasProperStoreImports(content),
      needsComposition: this.needsSelectorComposition(content),
    };
  }

  /**
   * Analyze component selector usage patterns
   */
  static analyzeComponentSelectorPatterns(content: string): {
    hasValidDirectSelects: boolean;
    hasTooManySubscriptions: boolean;
    needsCleanup: boolean;
  } {
    return {
      hasValidDirectSelects: this.hasValidDirectSelectUsage(content),
      hasTooManySubscriptions: this.hasTooManySubscriptions(content),
      needsCleanup: this.needsSubscriptionCleanup(content),
    };
  }
}
