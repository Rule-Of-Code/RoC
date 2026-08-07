import { ANGULAR_CONSTANTS } from '../../constants';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * Angular Signal Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and detection logic for Angular Signals
 */
export class AngularSignalConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularSignalConfiguration;

  /**
   * Angular file extensions for signal analysis
   * Eliminates hardcoded extension arrays
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
    ANGULAR_CONSTANTS.SERVICE_TS,
  ] as const;

  /**
   * Signal pattern constants
   * Eliminates hardcoded strings in validation logic
   */
  static readonly SIGNAL_PATTERNS = {
    SIGNAL_CALL: 'signal()',
    COMPUTED_CALL: 'computed(',
    EFFECT_CALL: 'effect(',
  } as const;

  /**
   * Get signal validation thresholds from config
   * Eliminates magic numbers in validation logic
   */
  static getThresholds(config: {
    thresholds?: { angular?: { maxSignalMutations?: number } };
  }) {
    return {
      MAX_MUTATIONS: config.thresholds?.angular?.maxSignalMutations ?? 5,
    };
  }

  /**
   * Signal validation messages - eliminates hardcoded strings
   * RULE 2: Centralized message templates with placeholder support
   */
  static readonly VALIDATION_MESSAGES = {
    SIGNAL_WITHOUT_VALUE: {
      violationMessage:
        'Signal should be initialized with a value in {fileName}',
      suggestionMessage:
        'Initialize signal with default value: signal(defaultValue) in {fileName}',
    },

    CONSIDER_READONLY_SIGNALS: {
      suggestionMessage:
        'Consider making signals readonly where appropriate in {fileName}',
    },

    COMPUTED_WITHOUT_DEPENDENCIES: {
      suggestionMessage:
        'Computed signals should depend on other signals in {fileName}',
    },

    COMPUTED_WITH_SIDE_EFFECTS: {
      violationMessage:
        'Computed signals should be pure functions in {fileName}',
      suggestionMessage:
        'Remove side effects from computed signals in {fileName}',
    },

    EFFECT_WITHOUT_CLEANUP: {
      suggestionMessage: 'Consider proper effect cleanup in {fileName}',
    },

    EFFECT_IN_CONSTRUCTOR: {
      suggestionMessage:
        'Move effects to ngOnInit or use inject context in {fileName}',
    },

    INCONSISTENT_UPDATE_PATTERN: {
      suggestionMessage:
        'Use consistent signal update pattern (.set() vs .update()) in {fileName}',
    },

    EXCESSIVE_MUTATIONS: {
      suggestionMessage:
        'Consider using computed signals for derived state in {fileName}',
    },

    CONSIDER_EQUALITY_FUNCTION: {
      suggestionMessage:
        'Consider custom equality function for object signals in {fileName}',
    },

    CONSIDER_EXPLICIT_TYPING: {
      suggestionMessage:
        'Consider explicit signal typing with WritableSignal<T> in {fileName}',
    },
  } as const;

  /**
   * Apply fileName placeholder to validation message object
   * RULE 2: Handles message objects with multiple properties containing placeholders
   */
  static buildMessageObject<T extends Record<string, string>>(
    messageTemplate: T,
    fileName: string
  ): T {
    return super.buildMessageObject(messageTemplate, fileName);
  }

  /**
   * Signal pattern detectors - centralized detection logic
   */
  static readonly PATTERN_DETECTORS = {
    HAS_SIGNAL: (content: string): boolean => content.includes('signal('),

    HAS_COMPUTED: (content: string): boolean => content.includes('computed('),

    HAS_EFFECT: (content: string): boolean => content.includes('effect('),

    HAS_READONLY: (content: string): boolean => content.includes('readonly'),

    HAS_ON_DESTROY: (content: string): boolean =>
      content.includes('onDestroy') || content.includes('DestroyRef'),

    HAS_CONSTRUCTOR: (content: string): boolean =>
      content.includes('constructor'),

    HAS_UPDATE_METHOD: (content: string): boolean =>
      content.includes('.update('),

    HAS_SET_METHOD: (content: string): boolean => content.includes('.set('),

    HAS_COMPLEX_OBJECTS: (content: string): boolean =>
      content.includes('complex') || content.includes('object'),

    HAS_EQUALITY_FUNCTION: (content: string): boolean =>
      content.includes('equal:'),

    HAS_EXPLICIT_TYPING: (content: string): boolean =>
      content.includes('signal<') && content.includes('WritableSignal'),

    EXTRACT_SIGNAL_INITIALIZATIONS: (content: string): string[] => {
      const signalInitPattern = /signal\(\s*[^)]*\s*\)/g;
      return content.match(signalInitPattern) ?? [];
    },

    EXTRACT_COMPUTED_BLOCKS: (content: string): string[] => {
      return content.match(/computed\([^}]+\}/g) ?? [];
    },

    EXTRACT_SIGNAL_MUTATIONS: (content: string): string[] => {
      const signalMutationPattern = /\w+\.set\([^)]+\)/g;
      return content.match(signalMutationPattern) ?? [];
    },

    CHECK_COMPUTED_WITHOUT_DEPENDENCIES: (content: string): boolean => {
      const computedPattern = /computed\(\s*\(\s*\)\s*=>/;
      return computedPattern.test(content);
    },

    CHECK_EFFECT_IN_CONSTRUCTOR: (content: string): boolean => {
      if (!content.includes('constructor')) return false;

      const constructorIndex = content.indexOf('constructor');
      const effectIndex = content.indexOf('effect(');

      return (
        effectIndex > constructorIndex &&
        effectIndex < content.indexOf('}', constructorIndex)
      );
    },

    CHECK_SIDE_EFFECTS_IN_COMPUTED: (matches: string[]): boolean => {
      return matches.some(
        match => match.includes('console.') || match.includes('alert')
      );
    },
  };

  /**
   * Analyze Angular signal patterns in content
   * RULE 2: Optimized to cache pattern detector calls and eliminate duplicates
   */
  static analyzePatterns(
    content: string,
    filePath: string
  ): {
    hasSignal: boolean;
    hasComputed: boolean;
    hasEffect: boolean;
    hasReadonly: boolean;
    hasOnDestroy: boolean;
    hasConstructor: boolean;
    hasUpdate: boolean;
    hasSet: boolean;
    hasComplexObjects: boolean;
    hasEqualityFunction: boolean;
    hasExplicitTyping: boolean;
    signalInitializations: string[];
    computedBlocks: string[];
    signalMutations: string[];
    fileName: string;
    filePath: string;
  } {
    // Cache detector references for reuse
    const detectors = this.PATTERN_DETECTORS;

    // Cache extracted patterns to avoid duplicate extraction calls
    const signalInitializations =
      detectors.EXTRACT_SIGNAL_INITIALIZATIONS(content);
    const computedBlocks = detectors.EXTRACT_COMPUTED_BLOCKS(content);
    const signalMutations = detectors.EXTRACT_SIGNAL_MUTATIONS(content);

    const fileName = filePath.split('/').pop() ?? '';

    return {
      hasSignal: detectors.HAS_SIGNAL(content),
      hasComputed: detectors.HAS_COMPUTED(content),
      hasEffect: detectors.HAS_EFFECT(content),
      hasReadonly: detectors.HAS_READONLY(content),
      hasOnDestroy: detectors.HAS_ON_DESTROY(content),
      hasConstructor: detectors.HAS_CONSTRUCTOR(content),
      hasUpdate: detectors.HAS_UPDATE_METHOD(content),
      hasSet: detectors.HAS_SET_METHOD(content),
      hasComplexObjects: detectors.HAS_COMPLEX_OBJECTS(content),
      hasEqualityFunction: detectors.HAS_EQUALITY_FUNCTION(content),
      hasExplicitTyping: detectors.HAS_EXPLICIT_TYPING(content),
      signalInitializations,
      computedBlocks,
      signalMutations,
      fileName,
      filePath,
    };
  }
}
