import type { RuleOfCodeConfig } from '../../../config/types';
import { ANGULAR_CONSTANTS, DIRECTORY_NAMES } from '../../constants';
import { StringTemplateUtils } from '../../string-template-utils';
import { AngularConfigurationBase } from '../angular-configuration-base';

/**
 * RxJS Operator Usage Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and validation rules for RxJS operator analysis
 */
export class RxJSOperatorUsageConfiguration extends AngularConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = RxJSOperatorUsageConfiguration;

  /**
   * Operator analysis configuration - RULE 1: Inlined from getter method
   */
  static readonly OPERATOR_ANALYSIS_CONFIG = {
    checkFlatteningOperators: true,
    checkDeprecatedOperators: true,
    checkTransformationOperators: true,
    enableAdvancedPatternChecks: true,
    strictErrorHandling: true,
  } as const;

  /**
   * NgRx file patterns for detection - RULE 1: Inlined from getter method
   */
  static readonly NGRX_FILE_PATTERNS = {
    effectsSuffixes: [
      ANGULAR_CONSTANTS.EFFECTS_SUFFIX,
      ANGULAR_CONSTANTS.EFFECT_SUFFIX,
    ],
    effectsKeywords: [ANGULAR_CONSTANTS.EFFECTS],
    fileExtensions: [ANGULAR_CONSTANTS.TS_EXTENSION],
    requiredContent: ['@Injectable', 'Actions', 'createEffect'],
  } as const;

  /**
   * Flattening operators configuration - RULE 1: Inlined from getter method
   */
  static readonly FLATTENING_OPERATORS_CONFIG = {
    operators: [
      ANGULAR_CONSTANTS.SWITCH_MAP,
      'mergeMap',
      'concatMap',
      ANGULAR_CONSTANTS.EXHAUST_MAP,
    ],
    errorHandlingRequired: [ANGULAR_CONSTANTS.CATCH_ERROR, 'catchError'],
    httpOperations: [
      ANGULAR_CONSTANTS.HTTP_POST,
      ANGULAR_CONSTANTS.HTTP_PUT,
      ANGULAR_CONSTANTS.HTTP_DELETE,
      'http.post',
      'http.put',
      'http.delete',
    ],
    recommendations: {
      POST: ANGULAR_CONSTANTS.EXHAUST_MAP,
      PUT: ANGULAR_CONSTANTS.EXHAUST_MAP,
      DELETE: 'concatMap',
      GET: ANGULAR_CONSTANTS.SWITCH_MAP,
    },
  } as const;

  /**
   * Deprecated operators mapping - RULE 1: Inlined from getter method
   */
  // Modern (RxJS 7+) deprecated operators/methods, matched as call expressions
  // (`name(`) so they avoid the keyword false positives of the old RxJS-5 list
  // (`catch(`/`switch(` matched try/catch and switch statements).
  static readonly DEPRECATED_OPERATORS_MAPPING = {
    deprecated: {
      flatMap: 'mergeMap',
      mapTo: 'map',
      switchMapTo: 'switchMap',
      mergeMapTo: 'mergeMap',
      concatMapTo: 'concatMap',
      exhaustMapTo: 'exhaustMap',
      pluck: 'map',
      toPromise: 'firstValueFrom / lastValueFrom',
    },
    warnings: [
      'Deprecated operators should be replaced with modern equivalents',
      'Update RxJS to latest version for better performance',
    ],
    replacements: {
      flatMap: 'mergeMap',
      mapTo: 'map',
      switchMapTo: 'switchMap',
      mergeMapTo: 'mergeMap',
      concatMapTo: 'concatMap',
      exhaustMapTo: 'exhaustMap',
      pluck: 'map',
      toPromise: 'firstValueFrom / lastValueFrom',
    },
  } as const;

  /**
   * Transformation operators configuration - RULE 1: Inlined from getter method
   */
  static readonly TRANSFORMATION_OPERATORS_CONFIG = {
    operators: [
      ANGULAR_CONSTANTS.MAP,
      'filter',
      ANGULAR_CONSTANTS.TAP,
      ANGULAR_CONSTANTS.PLUCK,
    ],
    pipeRequired: true,
    deprecatedOperators: [ANGULAR_CONSTANTS.PLUCK],
    modernAlternatives: {
      [ANGULAR_CONSTANTS.PLUCK]: ANGULAR_CONSTANTS.MAP,
    },
    pipeSyntax: ANGULAR_CONSTANTS.PIPE_SYNTAX,
  } as const;

  /**
   * Directory filtering configuration - RULE 1: Inlined from getter method
   */
  static readonly DIRECTORY_FILTER_CONFIG = {
    skipDirectories: [
      DIRECTORY_NAMES.NODE_MODULES,
      DIRECTORY_NAMES.DIST,
      DIRECTORY_NAMES.GIT,
      DIRECTORY_NAMES.COVERAGE,
      DIRECTORY_NAMES.NX,
      '.angular',
      'tmp',
    ],
    includeDirectories: [
      DIRECTORY_NAMES.SRC,
      DIRECTORY_NAMES.APP,
      'effects',
      'store',
    ],
    recursiveSearch: true,
  } as const;

  /**
   * File reading configuration - RULE 1: Inlined from getter method
   */
  static readonly FILE_READING_CONFIG = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8,
    fallbackToEmpty: false,
    skipEmptyFiles: true,
    handleErrors: true,
  } as const;

  /**
   * Analysis thresholds - RULE 1: Inlined from getter method
   */
  static readonly ANALYSIS_THRESHOLDS = {
    maxFlatteningOperatorsPerEffect: 3,
    minErrorHandlingCoverage: 0.8, // 80% of operators should have error handling
    deprecatedOperatorTolerance: 0, // No deprecated operators allowed
  } as const;

  /**
   * Operator recommendations - RULE 1: Inlined from getter method
   */
  static readonly OPERATOR_RECOMMENDATIONS = {
    FLATTENING_BEST_PRACTICES:
      'Use appropriate flattening operators: switchMap for cancellable operations, exhaustMap for non-cancellable operations, concatMap for ordered execution, mergeMap for parallel execution',
    ERROR_HANDLING_IMPORTANCE:
      'Always include error handling with catchError operator in RxJS chains to prevent effect crashes',
    MODERN_OPERATOR_USAGE:
      'Use modern RxJS operators and avoid deprecated ones for better performance and maintainability',
    PIPE_OPERATOR_PATTERN:
      'Always use operators within pipe() method for better readability and chainability',
  } as const;

  /**
   * Build validation message with flexible placeholder support
   * RULE 1: Uses centralized StringTemplateUtils instead of duplicate logic
   */
  static buildMessage(
    messageTemplate: string,
    ...placeholders: string[]
  ): string {
    return StringTemplateUtils.formatTemplate(messageTemplate, ...placeholders);
  }

  /**
   * Validation messages for RxJS operators - RULE 2: Converted to templates with placeholders
   */
  static readonly VALIDATION_MESSAGES = {
    SWITCH_MAP_WITHOUT_ERROR_HANDLING: `${ANGULAR_CONSTANTS.SWITCH_MAP} without error handling in {0}`,
    DEPRECATED_OPERATOR_FOUND: `Deprecated operator '{0}' found in {1}`,
    OPERATOR_OUTSIDE_PIPE: `Operator '{0}' used outside ${ANGULAR_CONSTANTS.PIPE} in {1}`,
    DEPRECATED_PLUCK_USAGE: `Consider using ${ANGULAR_CONSTANTS.MAP} with property access instead of ${ANGULAR_CONSTANTS.PLUCK}`,
    RECOMMEND_EXHAUST_MAP: `Consider ${ANGULAR_CONSTANTS.EXHAUST_MAP} instead of ${ANGULAR_CONSTANTS.SWITCH_MAP} for {0} operations`,
    ADD_ERROR_HANDLING: `Add ${ANGULAR_CONSTANTS.CATCH_ERROR} operator after {0}`,
    USE_PIPE_METHOD: `Use operators inside ${ANGULAR_CONSTANTS.PIPE}() method`,
    REPLACE_DEPRECATED: `Replace '{0}' with '{1}'`,
    MAP_RETURNS_OBSERVABLE: `map() returns an Observable in {0} — use a flattening operator (switchMap/concatMap/mergeMap/exhaustMap) instead`,
    USE_FLATTENING_OPERATOR: `Replace map() that returns an Observable with switchMap/concatMap/mergeMap/exhaustMap in {0}`,
  } as const;

  /**
   * A map() whose arrow body is solely a service/HTTP call (returns an
   * Observable) — the classic "should be a flattening operator" anti-pattern.
   * Conservative: the called method name must look async (get/post/load/...),
   * so plain value transforms like map(x => this.label(x)) are not flagged.
   */
  static readonly MAP_RETURNS_OBSERVABLE_PATTERN =
    /\bmap\s*\(\s*(?:\([^)]*\)|[\w$]+)\s*=>\s*this\.[\w$.]*\b(?:get|post|put|delete|patch|load|fetch|save|create|update|remove|list|query|request|send|call|http)\w*\s*\(/i;

  /**
   * Check if file matches NgRx file patterns
   * RULE 2: Optimized to cache pattern references
   */
  static isNgRxEffectsFile(fileName: string): boolean {
    // Cache pattern references for reuse
    const patterns = this.NGRX_FILE_PATTERNS;

    const hasSuffix = patterns.effectsSuffixes.some(suffix =>
      fileName.includes(suffix)
    );

    const hasKeyword = patterns.effectsKeywords.some(keyword =>
      fileName.includes(keyword)
    );

    const hasExtension = patterns.fileExtensions.some(ext =>
      fileName.endsWith(ext)
    );

    return (hasSuffix || hasKeyword) && hasExtension;
  }

  /**
   * Check if directory should be skipped
   * RULE 2: Optimized to cache config references
   */
  static shouldSkipDirectory(dirname: string): boolean {
    // Cache config reference for reuse
    const config = this.DIRECTORY_FILTER_CONFIG;
    return (config.skipDirectories as readonly string[]).includes(dirname);
  }

  /**
   * Get operator replacement for deprecated operator
   * RULE 2: Optimized to cache mapping references
   */
  static getOperatorReplacement(deprecatedOperator: string): string {
    // Cache mapping reference for reuse
    const mapping = this.DEPRECATED_OPERATORS_MAPPING;
    return (
      (mapping.replacements as Record<string, string>)[deprecatedOperator] ??
      deprecatedOperator
    );
  }

  /**
   * Validate project configuration for operator analysis
   */
  static validateProjectConfig(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.validateProjectRootPath(projectRoot);
  }
}
