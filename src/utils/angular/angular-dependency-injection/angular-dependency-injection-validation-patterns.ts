import { AngularDependencyInjectionConfiguration } from './angular-dependency-injection-configuration';

/**
 * Angular Dependency Injection Validation Patterns
 * Specialized validation methods for dependency injection patterns
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated patterns
 */
export class AngularDependencyInjectionValidationPatterns {
  private static readonly Config = AngularDependencyInjectionConfiguration;

  /**
   * Validate constructor injection patterns
   * RULE 1: Inline validateAccessModifiers & validateServiceCount (100% internal coverage)
   */
  static validateConstructorInjection(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    violations: string[],
    suggestions: string[],
    config: {
      thresholds?: { angular?: { maxConstructorDependencies?: number } };
    }
  ): void {
    if (!patterns.hasConstructor || !patterns.constructorBlock) return;

    // NOTE: the former "use access modifiers for DI" suggestion was removed in
    // v7.2.0 — it nudged toward constructor parameter-property DI, which the new
    // "Inject Over Constructor DI" law (inject-over-constructor-di) forbids.
    // Constructor count is still validated below.
    const { constructorBlock, fileName } = patterns;

    // ===== INLINED: validateServiceCount (RULE 1) =====
    const { dependencyCount } = patterns;
    if (
      constructorBlock.includes(this.Config.PATTERNS.COLON) &&
      !constructorBlock.includes(this.Config.PATTERNS.ANY_TYPE)
    ) {
      const thresholds = this.Config.getThresholds(config);
      if (dependencyCount > thresholds.MAX_DEPENDENCIES) {
        violations.push(
          this.Config.VALIDATION_MESSAGES.SERVICE_COUNT.TOO_MANY_DEPENDENCIES(
            dependencyCount,
            fileName
          )
        );
      }
    }
  }

  /**
   * Helper: Validate Injectable decorator
   * RULE 2: Private helper for cognitive complexity management
   */
  private static checkInjectableDecorator(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasServiceClass) return;

    if (!patterns.hasInjectableDecorator) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.INJECTABLE.MISSING_DECORATOR(
          patterns.fileName
        )
      );
    }

    if (!patterns.hasProvidedIn) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.INJECTABLE.SUGGEST_PROVIDED_IN(
          patterns.fileName
        )
      );
    }
  }

  /**
   * Helper: Validate provider configuration
   * RULE 2: Private helper for cognitive complexity management
   */
  private static checkProviderConfiguration(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    suggestions: string[]
  ): void {
    if (
      (!patterns.hasComponentDecorator && !patterns.hasModuleDecorator) ||
      !patterns.hasProviders
    ) {
      return;
    }

    if (patterns.hasComponentDecorator) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.PROVIDERS.COMPONENT_LEVEL(
          patterns.fileName
        )
      );
    }

    if (
      patterns.hasModuleDecorator &&
      !patterns.hasProviders.toString().includes(this.Config.PATTERNS.FOR_ROOT)
    ) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.PROVIDERS.SUGGEST_FOR_ROOT(
          patterns.fileName
        )
      );
    }
  }

  /**
   * Helper: Check circular dependencies
   * RULE 2: Private helper for cognitive complexity management
   */
  private static checkCircularDependencies(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    suggestions: string[],
    config: { thresholds?: { angular?: { maxImportCount?: number } } }
  ): void {
    if (!patterns.hasImports) return;

    const thresholds = this.Config.getThresholds(config);
    if (patterns.importCount > thresholds.HIGH_IMPORT_COUNT) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.CIRCULAR_DEPS.HIGH_IMPORTS(
          patterns.fileName
        )
      );
    }
  }

  /**
   * Helper: Check optional dependencies
   * RULE 2: Private helper for cognitive complexity management
   */
  private static checkOptionalDependencies(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasOptionalDeps) return;

    suggestions.push(
      this.Config.VALIDATION_MESSAGES.OPTIONAL_DEPS.GOOD_USAGE(
        patterns.fileName
      )
    );
  }

  /**
   * Master validation orchestrator for all dependency injection patterns
   * RULE 1 & 2: Delegated to private helpers, managed complexity (<15)
   */
  static validateAllDependencyInjectionPatterns(
    patterns: ReturnType<
      typeof AngularDependencyInjectionConfiguration.analyzeDependencyPatterns
    >,
    violations: string[],
    suggestions: string[],
    config: {
      thresholds?: {
        angular?: {
          maxConstructorDependencies?: number;
          maxImportCount?: number;
        };
      };
    }
  ): void {
    // Constructor injection validation
    this.validateConstructorInjection(
      patterns,
      violations,
      suggestions,
      config
    );

    // Injectable decorator validation - via RULE 2 helper
    this.checkInjectableDecorator(patterns, violations, suggestions);

    // Provider configuration validation - via RULE 2 helper
    this.checkProviderConfiguration(patterns, suggestions);

    // Circular dependencies validation - via RULE 2 helper
    this.checkCircularDependencies(patterns, suggestions, config);

    // Optional dependencies validation - via RULE 2 helper
    this.checkOptionalDependencies(patterns, suggestions);
  }
}
