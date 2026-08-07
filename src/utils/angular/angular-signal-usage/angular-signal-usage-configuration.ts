import { ANGULAR_CONSTANTS } from '../../constants';
import { SignalConfigurationBase } from '../signal-configuration-base';

/**
 * Angular Signal Usage Configuration
 * Meta-dogfooding: Centralized configuration, patterns, and detection logic for Angular Signal usage analysis
 */
export class AngularSignalUsageConfiguration extends SignalConfigurationBase {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularSignalUsageConfiguration;

  /**
   * Angular file extensions for signal usage analysis
   * Eliminates hardcoded extension arrays
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
  ] as const;

  /**
   * Signal usage validation messages - eliminates hardcoded strings
   * RULE 2: Centralized message templates with placeholder support
   */
  static readonly VALIDATION_MESSAGES = {
    CONSIDER_SUBJECT_MIGRATION: {
      suggestionMessage:
        'Consider migrating from Subject/BehaviorSubject to Angular Signals in {fileName}',
    },

    CONSIDER_REACTIVE_FORMS_MIGRATION: {
      suggestionMessage: 'Consider using signal-based forms in {fileName}',
    },

    CONSIDER_STATE_MANAGEMENT: {
      suggestionMessage:
        'Consider using signals for component state management in {fileName}',
    },

    CONSIDER_COMPUTED_OVER_GETTERS: {
      suggestionMessage:
        'Consider using computed() instead of getter methods in {fileName}',
    },

    CONSIDER_SIGNALS_OVER_ASYNC: {
      suggestionMessage:
        'Consider using signals instead of async pipe for better performance in {fileName}',
    },

    ELIMINATE_CHANGE_DETECTION: {
      suggestionMessage:
        'Signals can eliminate need for manual change detection in {fileName}',
    },

    OPTIMIZE_ONPUSH_WITH_SIGNALS: {
      suggestionMessage:
        'Use signals with OnPush for optimal performance in {fileName}',
    },
  } as const;

  /**
   * Signal usage pattern detectors - centralized detection logic
   */
  static readonly PATTERN_DETECTORS = {
    HAS_SIGNAL_USAGE: (content: string): boolean =>
      content.includes('signal(') ||
      content.includes('computed(') ||
      content.includes('effect('),

    HAS_SUBJECT_USAGE: (content: string): boolean =>
      content.includes('BehaviorSubject') || content.includes('Subject'),

    HAS_FORM_CONTROL: (content: string): boolean =>
      content.includes('FormControl'),

    HAS_COMPONENT_STATE: (content: string): boolean =>
      content.includes('private ') &&
      (content.includes(': boolean') ||
        content.includes(': string') ||
        content.includes(': number') ||
        content.includes(': any')),

    HAS_GETTER_METHODS: (content: string): boolean => {
      const getterMethods = content.match(/get\s+\w+\s*\(\s*\)/g);
      return !!(getterMethods && getterMethods.length > 0);
    },

    HAS_COMPUTED_USAGE: (content: string): boolean =>
      content.includes('computed('),

    HAS_ASYNC_PIPE: (content: string): boolean => content.includes('| async'),

    HAS_CHANGE_DETECTOR_REF: (content: string): boolean =>
      content.includes('ChangeDetectorRef'),

    HAS_ON_PUSH: (content: string): boolean => content.includes('OnPush'),

    EXTRACT_GETTER_METHODS: (content: string): string[] =>
      content.match(/get\s+\w+\s*\(\s*\)/g) ?? [],

    GET_TEMPLATE_FILE_PATH: (componentFile: string): string =>
      componentFile.replace(
        ANGULAR_CONSTANTS.COMPONENT_TS,
        ANGULAR_CONSTANTS.COMPONENT_HTML
      ),
  };

  /**
   * Analyze Angular component for signal usage patterns
   * RULE 2: Optimized to cache pattern detector calls and eliminate duplicates
   */
  static analyzePatterns(
    content: string,
    filePath: string,
    templateContent?: string
  ): {
    hasSignalUsage: boolean;
    hasSubjectUsage: boolean;
    hasFormControl: boolean;
    hasComponentState: boolean;
    hasGetterMethods: boolean;
    hasComputedUsage: boolean;
    hasAsyncPipe: boolean;
    hasChangeDetectorRef: boolean;
    hasOnPush: boolean;
    getterMethods: string[];
    fileName: string;
    filePath: string;
    templateContent?: string;
  } {
    // Cache detector references for reuse
    const detectors = this.PATTERN_DETECTORS;

    // Cache extracted patterns to avoid duplicate extraction calls
    const getterMethods = detectors.EXTRACT_GETTER_METHODS(content);

    const fileName = filePath.split('/').pop() ?? '';

    return {
      hasSignalUsage: detectors.HAS_SIGNAL_USAGE(content),
      hasSubjectUsage: detectors.HAS_SUBJECT_USAGE(content),
      hasFormControl: detectors.HAS_FORM_CONTROL(content),
      hasComponentState: detectors.HAS_COMPONENT_STATE(content),
      hasGetterMethods: detectors.HAS_GETTER_METHODS(content),
      hasComputedUsage: detectors.HAS_COMPUTED_USAGE(content),
      hasAsyncPipe: templateContent
        ? detectors.HAS_ASYNC_PIPE(templateContent)
        : false,
      hasChangeDetectorRef: detectors.HAS_CHANGE_DETECTOR_REF(content),
      hasOnPush: detectors.HAS_ON_PUSH(content),
      getterMethods,
      fileName,
      filePath,
      templateContent,
    };
  }
}
