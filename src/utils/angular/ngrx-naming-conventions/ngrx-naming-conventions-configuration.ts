import {
  ANGULAR_CONSTANTS,
  FILE_EXTENSIONS,
  NGRX_KEYWORDS,
  PATH_CONSTANTS,
  REGEX_PATTERNS,
} from '../../constants';
import { StringTemplateUtils } from '../../string-template-utils';

/**
 * Configuration utility for NgRx Naming Conventions Analysis
 * Meta-dogfooding: Centralized patterns, validation rules, and convention standards for naming analysis
 */
export class NgRxNamingConventionsConfiguration {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = NgRxNamingConventionsConfiguration;

  /**
   * NgRx file extensions for analysis - RULE 1: Inlined from getter method
   */
  static readonly NGRX_FILE_EXTENSIONS = [
    FILE_EXTENSIONS.ACTIONS_TS,
    FILE_EXTENSIONS.REDUCER_TS,
    FILE_EXTENSIONS.SELECTORS_TS,
    FILE_EXTENSIONS.EFFECTS_TS,
    FILE_EXTENSIONS.FACADE_TS,
    FILE_EXTENSIONS.MODELS_TS,
  ] as const;

  /**
   * File read options for analysis - RULE 1: Inlined from getter method
   */
  static readonly FILE_READ_OPTIONS = {
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
    fallbackToEmpty: true,
  } as const;

  /**
   * Extract feature name from file path
   */
  static extractFeatureName(featurePath: string): string {
    const pathParts = featurePath.split(PATH_CONSTANTS.SEPARATOR);
    const stateIndex = pathParts.lastIndexOf(NGRX_KEYWORDS.STATE_FOLDER);
    return stateIndex > 0 ? (pathParts[stateIndex - 1] ?? '') : '';
  }

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
   * Validation messages for naming conventions - RULE 2: Converted to templates with placeholders
   */
  static readonly VALIDATION_MESSAGES = {
    ACTION_PREFIX_VIOLATION:
      "Action '{0}' should start with '[{1}]' prefix in {2}",
    ACTION_PREFIX_SUGGESTION: "Rename action to '[{0}] {1}'",
    ACTION_CASE_SUGGESTION:
      "Action text '{0}' should use PascalCase or Capitalized Words in {1}",
    ACTION_CREATOR_CASE_SUGGESTION:
      "Action creator '{0}' should use camelCase in {1}",
    REDUCER_NAME_SUGGESTION: "Reducer should be named '{0}' in {1}",
    INITIAL_STATE_SUGGESTION: `Initial state should be named 'initial{0}${NGRX_KEYWORDS.STATE_SUFFIX}' in {1}`,
    STATE_INTERFACE_SUGGESTION: "State interface should be named '{0}' in {1}",
    FEATURE_SELECTOR_SUGGESTION:
      "Feature selector should be named '{0}' in {1}",
    SELECTOR_PREFIX_SUGGESTION: `Selector '{0}' should start with '${NGRX_KEYWORDS.SELECT_PREFIX}' prefix in {1}`,
    EFFECTS_CLASS_SUGGESTION: "Effects class should be named '{0}' in {1}",
    EFFECT_NAMING_SUGGESTION: `Effect '{0}' should end with '$' or '${NGRX_KEYWORDS.EFFECT_SUFFIX}' in {1}`,
  } as const;

  /**
   * RegExp patterns for naming analysis - RULE 1: Inlined from getter method
   */
  static readonly NAMING_PATTERNS = {
    createAction: new RegExp(
      `${NGRX_KEYWORDS.CREATE_ACTION}\\s*\\(\\s*['\`"']([^'\`"']+)['\`"']`,
      'g'
    ),
    exportConst: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CONST}\\s+(\\w+)\\s*=`,
      'g'
    ),
    exportInterface: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_INTERFACE}\\s+(\\w+${NGRX_KEYWORDS.STATE_SUFFIX})`,
      'g'
    ),
    exportClass: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CLASS}\\s+(\\w+${NGRX_KEYWORDS.EFFECTS_SUFFIX_WORD})`,
      'g'
    ),
    effectAssignment: new RegExp(
      `(\\w+)\\s*=\\s*${NGRX_KEYWORDS.CREATE_EFFECT}`,
      'g'
    ),
    featureSelector: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CONST}\\s+(${NGRX_KEYWORDS.SELECT_PREFIX}\\w+${NGRX_KEYWORDS.FEATURE_SUFFIX})`,
      'g'
    ),
    generalSelector: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CONST}\\s+(${NGRX_KEYWORDS.SELECT_PREFIX}\\w+)`,
      'g'
    ),
    reducer: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CONST}\\s+(\\w+${NGRX_KEYWORDS.REDUCER_SUFFIX_WORD})`,
      'g'
    ),
    effectClass: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_CLASS}\\s+(\\w+${NGRX_KEYWORDS.EFFECTS_SUFFIX_WORD})`,
      'g'
    ),
    stateInterface: new RegExp(
      `${NGRX_KEYWORDS.EXPORT_INTERFACE}\\s+(\\w+${NGRX_KEYWORDS.STATE_SUFFIX})`,
      'g'
    ),
  } as const;

  /**
   * Check if file is a specific NgRx file type
   */
  static isFileType(fileName: string, type: string): boolean {
    return fileName.includes(type);
  }

  /**
   * Check if action has proper prefix
   */
  static hasProperActionPrefix(
    actionName: string,
    featureName: string
  ): boolean {
    return actionName.startsWith(`[${featureName}`);
  }

  /**
   * Check if action text has proper case
   */
  static hasProperActionCase(actionText: string): boolean {
    return (
      REGEX_PATTERNS.PASCAL_CASE.test(actionText) ||
      REGEX_PATTERNS.CAPITALIZED_WORDS.test(actionText)
    );
  }

  /**
   * Check if action creator has proper case
   */
  static hasProperActionCreatorCase(creatorName: string): boolean {
    return REGEX_PATTERNS.CAMEL_CASE.test(creatorName);
  }

  /**
   * Check if selector has proper prefix
   */
  static hasProperSelectorPrefix(selectorName: string): boolean {
    return selectorName.startsWith(NGRX_KEYWORDS.SELECT_PREFIX);
  }

  /**
   * Check if state interface has proper case
   */
  static hasProperStateInterfaceCase(stateName: string): boolean {
    return REGEX_PATTERNS.PASCAL_CASE.test(stateName);
  }

  /**
   * Check if effect has valid naming
   */
  static hasValidEffectNaming(effectName: string): boolean {
    return (
      effectName.endsWith('$') ||
      effectName.endsWith(NGRX_KEYWORDS.EFFECT_SUFFIX)
    );
  }

  /**
   * Generate expected names for NgRx entities
   */
  static generateExpectedNames(featureName: string): {
    reducer: string;
    initialState: string;
    stateInterface: string;
    featureSelector: string;
    effectsClass: string;
  } {
    return {
      reducer: `${featureName}${NGRX_KEYWORDS.REDUCER_SUFFIX_WORD}`,
      initialState: `initial${featureName}${NGRX_KEYWORDS.STATE_SUFFIX}`,
      stateInterface: `${featureName}${NGRX_KEYWORDS.STATE_SUFFIX}`,
      featureSelector: `${NGRX_KEYWORDS.SELECT_PREFIX}${featureName}${NGRX_KEYWORDS.FEATURE_SUFFIX}`,
      effectsClass: `${featureName}${NGRX_KEYWORDS.EFFECTS_SUFFIX_WORD}`,
    };
  }

  /**
   * Find matches in content using patterns
   */
  static findMatches(
    content: string,
    pattern: RegExp
  ): RegExpMatchArray | null {
    return content.match(pattern);
  }

  /**
   * Clean action name by removing prefix pattern
   */
  static cleanActionName(actionName: string): string {
    return actionName.replace(REGEX_PATTERNS.ACTION_PREFIX_PATTERN, '');
  }

  /**
   * Check if content has initial state with feature name
   */
  static hasProperInitialState(content: string, featureName: string): boolean {
    return (
      content.includes(NGRX_KEYWORDS.INITIAL_STATE) &&
      content.includes(`initial${featureName}${NGRX_KEYWORDS.STATE_SUFFIX}`)
    );
  }

  /**
   * Analyze naming patterns for actions
   */
  static analyzeActionNaming(
    content: string,
    _featureName: string
  ): {
    actionMatches: RegExpMatchArray | null;
    actionCreatorMatches: RegExpMatchArray | null;
  } {
    // Cache pattern reference for reuse
    const patterns = this.NAMING_PATTERNS;
    return {
      actionMatches: this.findMatches(content, patterns.createAction),
      actionCreatorMatches: this.findMatches(content, patterns.exportConst),
    };
  }

  /**
   * Analyze naming patterns for reducers
   */
  static analyzeReducerNaming(content: string): {
    reducerMatches: RegExpMatchArray | null;
    interfaceMatches: RegExpMatchArray | null;
  } {
    // Cache pattern reference for reuse
    const patterns = this.NAMING_PATTERNS;
    return {
      reducerMatches: this.findMatches(content, patterns.reducer),
      interfaceMatches: this.findMatches(content, patterns.stateInterface),
    };
  }

  /**
   * Analyze naming patterns for selectors
   */
  static analyzeSelectorNaming(content: string): {
    featureSelectorMatches: RegExpMatchArray | null;
    generalSelectorMatches: RegExpMatchArray | null;
  } {
    // Cache pattern reference for reuse
    const patterns = this.NAMING_PATTERNS;
    return {
      featureSelectorMatches: this.findMatches(
        content,
        patterns.featureSelector
      ),
      generalSelectorMatches: this.findMatches(
        content,
        patterns.generalSelector
      ),
    };
  }

  /**
   * Extract name from match using specified regex pattern
   * Centralizes the common pattern: match.match(REGEX)?.[1]
   */
  static extractNameFromMatch(
    match: string,
    pattern: RegExp
  ): string | undefined {
    return match.match(pattern)?.[1];
  }

  /**
   * Process matches array and extract names, filtering out undefined
   */
  static extractNamesFromMatches(
    matches: RegExpMatchArray | null,
    pattern: RegExp
  ): string[] {
    if (!matches) return [];
    return matches
      .map(match => this.extractNameFromMatch(match, pattern))
      .filter((name): name is string => name !== undefined);
  }

  /**
   * Analyze naming patterns for effects
   */
  static analyzeEffectNaming(content: string): {
    classMatches: RegExpMatchArray | null;
    effectMatches: RegExpMatchArray | null;
  } {
    // Cache pattern reference for reuse
    const patterns = this.NAMING_PATTERNS;
    return {
      classMatches: this.findMatches(content, patterns.effectClass),
      effectMatches: this.findMatches(content, patterns.effectAssignment),
    };
  }
}
