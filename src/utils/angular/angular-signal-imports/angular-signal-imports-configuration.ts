import { ANGULAR_CONSTANTS } from '../../constants';

/**
 * Angular Signal Imports Configuration
 * Meta-dogfooding: Centralized configuration for signal imports analysis
 */
export class AngularSignalImportsConfiguration {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularSignalImportsConfiguration;

  /**
   * Angular file extensions for signal analysis
   */
  static readonly FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
    ANGULAR_CONSTANTS.SERVICE_TS,
    ANGULAR_CONSTANTS.DIRECTIVE_TS,
  ] as const;

  /**
   * Signal and related imports to check
   */
  static readonly SIGNAL_CHECKS = [
    { usage: 'signal(', import: 'signal', function: 'signal()' },
    { usage: 'computed(', import: 'computed', function: 'computed()' },
    { usage: 'effect(', import: 'effect', function: 'effect()' },
    {
      usage: 'WritableSignal',
      import: 'WritableSignal',
      function: 'WritableSignal',
    },
    { usage: 'Signal<', import: 'Signal', function: 'Signal type' },
    { usage: 'inject(', import: 'inject', function: 'inject()' },
  ] as const;

  /**
   * Signal usage indicators for version compatibility
   */
  static readonly SIGNAL_USAGE_INDICATORS = ['signal(', 'computed('] as const;

  /**
   * RxJS interop function indicators
   */
  static readonly RXJS_INTEROP_FUNCTIONS = [
    'toSignal',
    'toObservable',
  ] as const;

  /**
   * Core imports package
   */
  static readonly ANGULAR_CORE_PACKAGE = '@angular/core' as const;

  /**
   * Pattern to detect core imports
   */
  static readonly ANGULAR_CORE_IMPORT_REGEX =
    /import\s*{[^}]+}\s*from\s*['"]@angular\/core['"]/g;

  /**
   * RxJS interop package
   */
  static readonly RXJS_INTEROP_PACKAGE = '@angular/core/rxjs-interop' as const;

  /**
   * Experimental signals package
   */
  static readonly EXPERIMENTAL_PACKAGE = '@angular/core/experimental' as const;

  /**
   * Helper: Apply fileName placeholder to validation messages
   * RULE 2: Centralized message templating for single placeholder
   */
  private static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return message.replace('{fileName}', fileName);
  }

  /**
   * Helper: Apply signal placeholder to validation messages
   * RULE 2: Centralized message templating for signal names
   */
  private static applySignalPlaceholder(
    message: string,
    signal: string
  ): string {
    return message.replace('{signal}', signal);
  }

  /**
   * Helper: Apply version placeholder to validation messages
   * RULE 2: Centralized message templating for version strings
   */
  private static applyVersionPlaceholder(
    message: string,
    version: string
  ): string {
    return message.replace('{version}', version);
  }

  /**
   * Build validation message with fileName placeholder
   * RULE 2: Consolidates message construction with single placeholder
   */
  static buildFileNameMessage(
    messageTemplate: string,
    fileName: string
  ): string {
    return this.applyFileNamePlaceholder(messageTemplate, fileName);
  }

  /**
   * Build validation message with signal and fileName placeholders
   * RULE 2: Consolidates message construction with multiple placeholders
   */
  static buildSignalMessage(
    messageTemplate: string,
    signal: string,
    fileName: string
  ): string {
    const result = this.applySignalPlaceholder(messageTemplate, signal);
    return this.applyFileNamePlaceholder(result, fileName);
  }

  /**
   * Build validation message with version and fileName placeholders
   * RULE 2: Consolidates message construction with version info
   */
  static buildVersionMessage(
    messageTemplate: string,
    version: string,
    fileName: string
  ): string {
    const result = this.applyVersionPlaceholder(messageTemplate, version);
    return this.applyFileNamePlaceholder(result, fileName);
  }

  /**
   * Angular versions supporting signals
   */
  static readonly COMPATIBLE_VERSIONS = ['16', '17', '18'] as const;

  /**
   * Effect cleanup related
   */
  static readonly EFFECT_CLEANUP_INDICATOR = 'onDestroy' as const;
  static readonly DESTROY_REF_IMPORT = 'DestroyRef' as const;

  /**
   * Validation messages
   * RULE 2: Centralized message templates with placeholder support
   */
  static readonly VALIDATION_MESSAGES = {
    SIGNAL_NOT_IMPORTED:
      '{signal} used but not imported from @angular/core in {fileName}',

    SUGGEST_IMPORT: 'Import {signal} from @angular/core in {fileName}',

    DESTROY_REF_SUGGESTION:
      'Import DestroyRef for effect cleanup in {fileName}',

    COMBINE_IMPORTS:
      'Combine multiple @angular/core imports into single import in {fileName}',

    RXJS_INTEROP_NOT_IMPORTED:
      'RxJS interop functions used but not imported in {fileName}',

    SUGGEST_RXJS_INTEROP_IMPORT:
      'Import toSignal/toObservable from @angular/core/rxjs-interop in {fileName}',

    SIGNALS_VERSION_INCOMPATIBLE:
      'Signals require Angular 16+ - current version: {version} in {fileName}',

    EXPERIMENTAL_SIGNALS_WARNING:
      'Using experimental signals API in {fileName}',

    UPGRADE_TO_STABLE:
      'Upgrade to stable signals API from @angular/core in {fileName}',
  } as const;
}
