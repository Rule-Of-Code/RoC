import { ANGULAR_CONSTANTS } from '../../constants';
import { AngularValidationUtils } from './angular-validation-utils';

/**
 * Common Angular module validation patterns
 * Meta-dogfooding: Centralized validation patterns for Angular modules
 */
export class AngularValidationPatterns {
  private static readonly constants = ANGULAR_CONSTANTS;
  private static readonly validationUtils = AngularValidationUtils;
  // Lazily resolved: a static field initialized here would run BEFORE
  // VALIDATION_MESSAGES (declared below) is set, yielding undefined. A getter
  // defers to call-time when VALIDATION_MESSAGES is ready.
  private static get messages(): ReturnType<
    typeof AngularValidationPatterns.createValidationMessages
  > {
    return AngularValidationPatterns.createValidationMessages();
  }
  /**
   * Validation message builders - eliminates hardcoded strings
   */
  private static readonly VALIDATION_MESSAGES = {
    COMMON_MODULE_MISSING: (moduleName: string) => ({
      violationMessage: `Feature module should import ${moduleName}`,
      suggestionMessage: `Add ${moduleName} to imports`,
    }),
    BROWSER_MODULE_IN_FEATURE: (
      commonModule: string,
      browserModule: string
    ) => ({
      violationMessage: `Feature module should not import ${browserModule}`,
      suggestionMessage: `Use ${commonModule} instead of ${browserModule} in feature modules`,
    }),
    STANDALONE_NO_IMPORTS: () => ({
      violationMessage: 'Standalone component should define imports',
      suggestionMessage: 'Add imports array to standalone component',
    }),
    ROUTES_CONSTANT_MISSING: (routerModule: string) => ({
      suggestionMessage: `Define routes constant for ${routerModule}`,
    }),
    PROVIDERS_INSTEAD_OF_ROOT: (providedInRoot: string) => ({
      suggestionMessage: `Consider using ${providedInRoot} instead of module providers`,
    }),
  };

  /**
   * Factory method to create validation messages
   */
  private static createValidationMessages() {
    return this.VALIDATION_MESSAGES;
  }

  /**
   * Validate module structure with common patterns
   */
  static validateModuleStructure(
    content: string,
    fileName: string,
    isAppModule: boolean,
    violations: string[],
    suggestions: string[]
  ): void {
    this.validateModuleImports(
      content,
      fileName,
      isAppModule,
      violations,
      suggestions
    );
    this.validateStandaloneComponents(
      content,
      fileName,
      violations,
      suggestions
    );
    this.validateRouterConfiguration(content, fileName, suggestions);
    this.validateProviders(content, fileName, isAppModule, suggestions);
  }

  /**
   * Validate module imports (CommonModule vs BrowserModule)
   */
  private static validateModuleImports(
    content: string,
    fileName: string,
    isAppModule: boolean,
    violations: string[],
    suggestions: string[]
  ): void {
    if (isAppModule) return;

    this.validationUtils.validateContent(
      fileName,
      [
        {
          condition:
            content.includes(this.constants.IMPORTS) &&
            !content.includes(this.constants.COMMON_MODULE),
          ...this.messages.COMMON_MODULE_MISSING(this.constants.COMMON_MODULE),
        },
        {
          condition: content.includes(this.constants.BROWSER_MODULE),
          ...this.messages.BROWSER_MODULE_IN_FEATURE(
            this.constants.COMMON_MODULE,
            this.constants.BROWSER_MODULE
          ),
        },
      ],
      violations,
      suggestions
    );
  }

  /**
   * Validate standalone components
   */
  private static validateStandaloneComponents(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.validationUtils.validateContent(
      fileName,
      [
        {
          condition:
            content.includes(this.constants.STANDALONE_TRUE) &&
            !content.includes(this.constants.IMPORTS),
          ...this.messages.STANDALONE_NO_IMPORTS(),
        },
      ],
      violations,
      suggestions
    );
  }

  /**
   * Validate router configuration
   */
  private static validateRouterConfiguration(
    content: string,
    fileName: string,
    suggestions: string[]
  ): void {
    this.validationUtils.validateAndSuggest(
      fileName,
      [
        {
          condition:
            content.includes(this.constants.ROUTER_MODULE_FOR_CHILD) &&
            !content.includes(this.constants.CONST_ROUTES),
          ...this.messages.ROUTES_CONSTANT_MISSING(
            this.constants.ROUTER_MODULE_FOR_CHILD
          ),
        },
      ],
      suggestions
    );
  }

  /**
   * Validate providers configuration
   */
  private static validateProviders(
    content: string,
    fileName: string,
    isAppModule: boolean,
    suggestions: string[]
  ): void {
    if (isAppModule) return;

    this.validationUtils.validateAndSuggest(
      fileName,
      [
        {
          condition: content.includes(this.constants.PROVIDERS),
          ...this.messages.PROVIDERS_INSTEAD_OF_ROOT(
            this.constants.PROVIDED_IN_ROOT
          ),
        },
      ],
      suggestions
    );
  }
}
