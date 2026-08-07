/**
 * Pattern constants for NgRx DevTools integration checks
 * Configuration: All rules, patterns, messages, and thresholds
 */

export class NgRxDevToolsPatternConstants {
  // DevTools package name
  static readonly STORE_DEVTOOLS_PACKAGE = '@ngrx/store-devtools';

  // DevTools integration patterns
  static readonly DEVTOOLS_PATTERNS = {
    MODULE_IMPORT: /StoreDevtoolsModule/,
    PROVIDER_FUNCTION: /provideStoreDevtools/,
    PACKAGE_REFERENCE: /store-devtools/,
  };

  // Environment conditions
  static readonly ENV_PATTERNS = {
    ENVIRONMENT_CHECK: /environment/,
    PRODUCTION_CHECK: /production|!environment\.production/,
    IS_DEV_MODE: /isDevMode/,
  };

  // DevTools configuration options
  static readonly CONFIG_OPTIONS = {
    MAX_AGE: /maxAge/,
    LOG_ONLY: /logOnly/,
    NAME: /name/,
    TRACE: /trace|actionSanitizer|stateSanitizer/,
  };

  // Violation messages
  static readonly VIOLATION_MESSAGES = {
    NOT_INSTALLED: '@ngrx/store-devtools package not installed',
    NOT_CONFIGURED: 'StoreDevtools not configured in application',
    NO_ENV_CHECK: 'DevTools not configured with environment-specific settings',
    MISSING_OPTIONS: 'DevTools configuration lacks proper options',
  };

  // Suggestion messages
  static readonly SUGGESTION_MESSAGES = {
    INSTALL_PACKAGE:
      'Install @ngrx/store-devtools: npm install --save-dev @ngrx/store-devtools',
    ADD_MODULE:
      'Add StoreDevtoolsModule.instrument() or provideStoreDevtools() to your app configuration',
    ADD_ENV_CHECK:
      'Configure DevTools to only enable in development environment',
    ADD_OPTIONS:
      'Configure DevTools with maxAge, logOnly, name, and trace options',
  };

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    NOT_INSTALLED: 40,
    NOT_CONFIGURED: 30,
    NO_ENV_CHECK: 20,
    MISSING_OPTIONS: 10,
  };

  // Pattern detection helper methods
  static hasDevToolsIntegration(content: string): boolean {
    return (
      this.DEVTOOLS_PATTERNS.MODULE_IMPORT.test(content) ||
      this.DEVTOOLS_PATTERNS.PROVIDER_FUNCTION.test(content)
    );
  }

  static hasEnvironmentCondition(content: string): boolean {
    return (
      this.ENV_PATTERNS.ENVIRONMENT_CHECK.test(content) ||
      this.ENV_PATTERNS.PRODUCTION_CHECK.test(content) ||
      this.ENV_PATTERNS.IS_DEV_MODE.test(content)
    );
  }

  static hasConfigOptions(content: string): boolean {
    const hasOptions =
      this.CONFIG_OPTIONS.MAX_AGE.test(content) ||
      this.CONFIG_OPTIONS.LOG_ONLY.test(content) ||
      this.CONFIG_OPTIONS.NAME.test(content) ||
      this.CONFIG_OPTIONS.TRACE.test(content);

    return hasOptions && content.includes('{') && content.includes('}');
  }
}
