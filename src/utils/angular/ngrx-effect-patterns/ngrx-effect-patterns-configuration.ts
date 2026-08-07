import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
} from '../../constants';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * NgRx Effect Patterns Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and detection logic for NgRx effect analysis
 */
export class NgRxEffectPatternsConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = NgRxEffectPatternsConfiguration;

  static readonly EFFECT_PATTERNS = {
    KEYWORDS: NGRX_KEYWORDS,
    FILE_EXTENSIONS,
    ANGULAR_CONSTANTS,
  } as const;

  static readonly VALIDATION_MESSAGES = {
    MISSING_INJECTABLE_VIOLATION: 'Missing @Injectable decorator in {fileName}',
    USE_CREATE_EFFECT_SUGGESTION: 'Consider using createEffect for type safety',
    TAP_WITH_DISPATCH_FALSE_SUGGESTION:
      'Effects with { dispatch: false } should use tap for side effects',
    MISSING_ERROR_HANDLING_VIOLATION:
      'Effect without error handling in {fileName}',
    USE_INJECT_SUGGESTION:
      'Use inject function for dependency injection in effects',
  } as const;

  /**
   * Analyze effect patterns in content
   * RULE 2: Optimized to cache pattern detector references and eliminate duplicates
   */
  static analyzeEffectPatterns(content: string): {
    hasInjectable: boolean;
    hasCreateEffect: boolean;
    hasDispatchFalse: boolean;
    hasTap: boolean;
    hasCatchError: boolean;
    hasHttp: boolean;
    hasInject: boolean;
  } {
    // Cache keyword references for reuse
    const keywords = NGRX_KEYWORDS;
    const constants = ANGULAR_CONSTANTS;

    return {
      hasInjectable: content.includes(keywords.INJECTABLE),
      hasCreateEffect: content.includes(keywords.CREATE_EFFECT),
      hasDispatchFalse: content.includes(keywords.DISPATCH_FALSE),
      hasTap: content.includes(constants.TAP),
      hasCatchError: content.includes(constants.CATCH_ERROR),
      hasHttp: content.includes(keywords.HTTP),
      hasInject: content.includes(keywords.INJECT),
    };
  }

  /**
   * Check if file is an effect file
   * RULE 2: Optimized to cache extension references and eliminate duplicate string checks
   */
  static isEffectFile(fileName: string): boolean {
    // Cache extension and constant references for reuse
    const extensions = FILE_EXTENSIONS;
    const constants = ANGULAR_CONSTANTS;

    return (
      fileName.includes(extensions.EFFECTS_TS) ||
      fileName.includes(extensions.EFFECT_TS) ||
      (fileName.endsWith(extensions.TYPESCRIPT) &&
        fileName.includes(constants.EFFECTS))
    );
  }
}
