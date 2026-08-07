import {
  ANGULAR_CONSTANTS,
  ANGULAR_DEPENDENCY_INJECTION,
  DIRECTORY_NAMES,
} from '../../constants';

/**
 * Angular Dependency Injection Configuration
 * Centralized configuration for dependency injection patterns analysis
 * Meta-dogfooding: Centralizes hardcoded constants and patterns
 */
export class AngularDependencyInjectionConfiguration {
  /**
   * File extensions for dependency injection analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
    ANGULAR_CONSTANTS.SERVICE_TS,
    ANGULAR_CONSTANTS.DIRECTIVE_TS,
  ];

  /**
   * Directory configuration for dependency injection analysis
   */
  static readonly DIRECTORIES = {
    SRC: DIRECTORY_NAMES.SRC,
  };

  /**
   * Helper: Apply fileName placeholder to message
   * RULE 2: Centralized message templating (eliminates duplicate .replace() calls)
   */
  private static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return message.replace('{fileName}', fileName);
  }

  /**
   * Helper: Apply count placeholder to message
   * RULE 2: Centralized message templating (eliminates duplicate .replace() calls)
   */
  private static applyCountPlaceholder(message: string, count: number): string {
    return message.replace('{count}', count.toString());
  }

  /**
   * Validation message builders for dependency injection patterns
   */
  static readonly VALIDATION_MESSAGES = {
    // Access modifiers messages
    ACCESS_MODIFIERS: {
      MISSING_MODIFIER: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.ACCESS_MODIFIERS
            .MISSING_MODIFIER,
          fileName
        ),
    },

    // Service count messages
    SERVICE_COUNT: {
      TOO_MANY_DEPENDENCIES: (count: number, fileName: string): string => {
        const baseMessage: string = ANGULAR_DEPENDENCY_INJECTION.MESSAGES
          .SERVICE_COUNT.TOO_MANY_DEPENDENCIES as string;
        const result =
          AngularDependencyInjectionConfiguration.applyCountPlaceholder(
            baseMessage,
            count
          );
        return AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          result,
          fileName
        );
      },
    },

    // Injectable decorator messages
    INJECTABLE: {
      MISSING_DECORATOR: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.INJECTABLE.MISSING_DECORATOR,
          fileName
        ),
      SUGGEST_PROVIDED_IN: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.INJECTABLE.SUGGEST_PROVIDED_IN,
          fileName
        ),
    },

    // Provider configuration messages
    PROVIDERS: {
      COMPONENT_LEVEL: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.PROVIDERS.COMPONENT_LEVEL,
          fileName
        ),
      SUGGEST_FOR_ROOT: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.PROVIDERS.SUGGEST_FOR_ROOT,
          fileName
        ),
    },

    // Circular dependencies messages
    CIRCULAR_DEPS: {
      HIGH_IMPORTS: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.CIRCULAR_DEPS.HIGH_IMPORTS,
          fileName
        ),
    },

    // Optional dependencies messages
    OPTIONAL_DEPS: {
      GOOD_USAGE: (fileName: string): string =>
        AngularDependencyInjectionConfiguration.applyFileNamePlaceholder(
          ANGULAR_DEPENDENCY_INJECTION.MESSAGES.OPTIONAL_DEPS.GOOD_USAGE,
          fileName
        ),
    },
  };

  /**
   * Get dependency injection thresholds from config
   */
  static getThresholds(config: {
    thresholds?: {
      angular?: {
        maxConstructorDependencies?: number;
        maxImportCount?: number;
      };
    };
  }) {
    return ANGULAR_DEPENDENCY_INJECTION.getThresholds(config);
  }

  /**
   * Pattern constants for dependency injection analysis
   */
  static readonly PATTERNS = {
    // Constructor patterns
    CONSTRUCTOR: ANGULAR_CONSTANTS.CONSTRUCTOR,
    CONSTRUCTOR_REGEX: ANGULAR_DEPENDENCY_INJECTION.PATTERNS.CONSTRUCTOR_REGEX,

    // Access modifiers patterns
    THIS: ANGULAR_CONSTANTS.THIS,
    PRIVATE: ANGULAR_CONSTANTS.PRIVATE,
    PUBLIC: ANGULAR_CONSTANTS.PUBLIC,

    // Type annotation patterns
    COLON: ANGULAR_CONSTANTS.COLON,
    ANY_TYPE: ANGULAR_CONSTANTS.ANY_TYPE,

    // Service patterns
    EXPORT_CLASS: ANGULAR_CONSTANTS.EXPORT_CLASS,
    SERVICE_SUFFIX: ANGULAR_CONSTANTS.SERVICE_SUFFIX,
    INJECTABLE: ANGULAR_CONSTANTS.INJECTABLE,
    PROVIDED_IN: ANGULAR_CONSTANTS.PROVIDED_IN,
    PROVIDED_IN_ROOT: ANGULAR_CONSTANTS.PROVIDED_IN_ROOT,

    // Component and module patterns
    COMPONENT_DECORATOR: ANGULAR_CONSTANTS.COMPONENT_DECORATOR,
    NG_MODULE_DECORATOR: ANGULAR_CONSTANTS.NG_MODULE_DECORATOR,
    PROVIDERS: ANGULAR_CONSTANTS.PROVIDERS,
    FOR_ROOT: ANGULAR_CONSTANTS.FOR_ROOT,

    // Import patterns
    IMPORT: ANGULAR_CONSTANTS.IMPORT,
    FROM: ANGULAR_CONSTANTS.FROM,
    IMPORT_REGEX: ANGULAR_DEPENDENCY_INJECTION.PATTERNS.IMPORT_REGEX,

    // Optional dependency patterns
    OPTIONAL: ANGULAR_CONSTANTS.OPTIONAL,
    HOST: ANGULAR_CONSTANTS.HOST,

    // Service count thresholds
    MAX_DEPENDENCIES: ANGULAR_DEPENDENCY_INJECTION.THRESHOLDS.MAX_DEPENDENCIES,
    HIGH_IMPORT_COUNT:
      ANGULAR_DEPENDENCY_INJECTION.THRESHOLDS.HIGH_IMPORT_COUNT,
  };

  /**
   * Analyze dependency injection patterns in content
   */
  static analyzeDependencyPatterns(
    content: string,
    filePath: string
  ): {
    fileName: string;
    hasConstructor: boolean;
    hasAccessModifiers: boolean;
    hasServiceClass: boolean;
    hasInjectableDecorator: boolean;
    hasProvidedIn: boolean;
    hasComponentDecorator: boolean;
    hasModuleDecorator: boolean;
    hasProviders: boolean;
    hasImports: boolean;
    hasOptionalDeps: boolean;
    importCount: number;
    constructorBlock?: string;
    dependencyCount: number;
  } {
    const fileName = filePath.split('/').pop() ?? filePath;
    const constructorMatch = content.match(this.PATTERNS.CONSTRUCTOR_REGEX);
    const constructorBlock = constructorMatch?.[0];
    const imports = content.match(this.PATTERNS.IMPORT_REGEX);

    // Count dependencies in constructor
    const dependencyCount = constructorBlock
      ? (constructorBlock.match(/:/g)?.length ?? 0)
      : 0;

    return {
      fileName,
      hasConstructor: content.includes(this.PATTERNS.CONSTRUCTOR),
      hasAccessModifiers: constructorBlock
        ? constructorBlock.includes(this.PATTERNS.PRIVATE) ||
          constructorBlock.includes(this.PATTERNS.PUBLIC)
        : false,
      hasServiceClass:
        content.includes(this.PATTERNS.EXPORT_CLASS) &&
        (content.includes(this.PATTERNS.SERVICE_SUFFIX) ||
          content.includes(this.PATTERNS.INJECTABLE)),
      hasInjectableDecorator: content.includes(this.PATTERNS.INJECTABLE),
      hasProvidedIn: content.includes(this.PATTERNS.PROVIDED_IN),
      hasComponentDecorator: content.includes(
        this.PATTERNS.COMPONENT_DECORATOR
      ),
      hasModuleDecorator: content.includes(this.PATTERNS.NG_MODULE_DECORATOR),
      hasProviders: content.includes(this.PATTERNS.PROVIDERS),
      hasImports:
        content.includes(this.PATTERNS.IMPORT) &&
        content.includes(this.PATTERNS.FROM),
      hasOptionalDeps:
        content.includes(this.PATTERNS.OPTIONAL) ||
        content.includes(this.PATTERNS.HOST),
      importCount: imports?.length ?? 0,
      constructorBlock,
      dependencyCount,
    };
  }
}
