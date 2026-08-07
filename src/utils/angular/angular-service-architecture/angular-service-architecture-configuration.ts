import { PatternMatchingUtils } from '../../pattern-matching-utils';

/**
 * Angular Service Architecture Configuration
 * Centralized configuration for service architecture analysis patterns and validation messages
 * Meta-dogfooding: Centralizes hardcoded constants and service architecture patterns
 */
export class AngularServiceArchitectureConfiguration {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularServiceArchitectureConfiguration;

  /**
   * Service architecture detection patterns
   */
  static readonly SERVICE_PATTERNS = {
    INJECTABLE_DECORATOR: '@Injectable',
    PROVIDED_IN_ROOT: 'providedIn',
    CONSTRUCTOR_KEYWORD: 'constructor',
    ACCESS_MODIFIERS: ['private', 'protected'],
    SERVICE_CLASS: 'export class',
    IMPLEMENTS_KEYWORD: 'implements',
    OBSERVABLE_CLASS: 'Observable',
    OBSERVABLE_IMPORT: 'import { Observable }',
    HTTP_CLIENT: 'HttpClient',
    HTTP_CLIENT_INJECTION: 'private http: HttpClient',
    CATCH_ERROR_OPERATOR: 'catchError',
    HTTP_THIS_REFERENCE: 'this.http',
    METHOD_PATTERN: /\s+\w+\s*\(/g,
  } as const;

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
   * Helper: Apply methodCount placeholder to validation messages
   * RULE 2: Centralized message templating for method count
   */
  private static applyMethodCountPlaceholder(
    message: string,
    methodCount: number
  ): string {
    return message.replace('{methodCount}', methodCount.toString());
  }

  /**
   * Build validation message with fileName placeholder
   * RULE 2: Consolidates message construction with fileName
   */
  static buildFileNameMessage(
    messageTemplate: string,
    fileName: string
  ): string {
    return this.applyFileNamePlaceholder(messageTemplate, fileName);
  }

  /**
   * Build validation message with methodCount placeholder
   * RULE 2: Consolidates message construction with method count
   */
  static buildMethodCountMessage(
    messageTemplate: string,
    methodCount: number
  ): string {
    return this.applyMethodCountPlaceholder(messageTemplate, methodCount);
  }

  /**
   * Build validation message with both fileName and methodCount placeholders
   * RULE 2: Consolidates message construction with multiple placeholders
   */
  static buildFullMessage(
    messageTemplate: string,
    fileName: string,
    methodCount?: number
  ): string {
    let result = this.applyFileNamePlaceholder(messageTemplate, fileName);
    if (methodCount !== undefined) {
      result = this.applyMethodCountPlaceholder(result, methodCount);
    }
    return result;
  }

  /**
   * Service architecture validation messages
   * RULE 2: Centralized message templates with placeholder support
   */
  static readonly VALIDATION_MESSAGES = {
    NO_SERVICES_SUGGESTION: 'Create services for business logic separation',
    MISSING_INJECTABLE_VIOLATION:
      'Service {fileName} missing @Injectable decorator',
    MISSING_INJECTABLE_SUGGESTION:
      'Add @Injectable() decorator to service class in {fileName}',
    PROVIDED_IN_ROOT_SUGGESTION:
      "Consider using providedIn: 'root' for singleton services in {fileName}",
    ACCESS_MODIFIERS_SUGGESTION:
      'Use private/protected access modifiers for injected dependencies in {fileName}',
    INTERFACE_IMPLEMENTATION_SUGGESTION:
      'Consider defining interfaces for service contracts in {fileName}',
    SINGLE_RESPONSIBILITY_SUGGESTION:
      'Service {fileName} has many methods ({methodCount}), consider splitting',
    OBSERVABLE_IMPORT_VIOLATION:
      'Observable used but not imported in {fileName}',
    OBSERVABLE_IMPORT_SUGGESTION: 'Import Observable from rxjs in {fileName}',
    HTTP_CLIENT_INJECTION_SUGGESTION:
      'Inject HttpClient as private readonly parameter in {fileName}',
    ERROR_HANDLING_SUGGESTION:
      'Add error handling with catchError operator in {fileName}',
  } as const;

  /**
   * Get service architecture thresholds from config
   */
  static getThresholds(config: {
    thresholds?: { angular?: { maxMethodsPerService?: number } };
  }) {
    return {
      MAX_METHODS_PER_SERVICE:
        config.thresholds?.angular?.maxMethodsPerService ?? 10,
    };
  }

  /**
   * Analyze service architecture patterns in content
   * RULE 2: Optimized to eliminate duplicate pattern checks via array caching
   */
  static analyzeServicePatterns(content: string): {
    hasInjectableDecorator: boolean;
    hasProvidedIn: boolean;
    hasConstructor: boolean;
    hasAccessModifiers: boolean;
    hasServiceClass: boolean;
    hasImplementsKeyword: boolean;
    hasObservable: boolean;
    hasObservableImport: boolean;
    hasHttpClient: boolean;
    hasHttpClientInjection: boolean;
    hasCatchError: boolean;
    hasHttpReference: boolean;
    methodCount: number;
  } {
    // Cache patterns for reuse
    const injectableDecorator = this.SERVICE_PATTERNS.INJECTABLE_DECORATOR;
    const providedIn = this.SERVICE_PATTERNS.PROVIDED_IN_ROOT;
    const constructorKw = this.SERVICE_PATTERNS.CONSTRUCTOR_KEYWORD;
    const accessModifiers = this.SERVICE_PATTERNS.ACCESS_MODIFIERS;
    const serviceClass = this.SERVICE_PATTERNS.SERVICE_CLASS;
    const implementsKw = this.SERVICE_PATTERNS.IMPLEMENTS_KEYWORD;
    const observable = this.SERVICE_PATTERNS.OBSERVABLE_CLASS;
    const httpClient = this.SERVICE_PATTERNS.HTTP_CLIENT;
    const httpClientInjection = this.SERVICE_PATTERNS.HTTP_CLIENT_INJECTION;
    const catchError = this.SERVICE_PATTERNS.CATCH_ERROR_OPERATOR;
    const httpReference = this.SERVICE_PATTERNS.HTTP_THIS_REFERENCE;
    const methodPattern = this.SERVICE_PATTERNS.METHOD_PATTERN;

    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    return {
      hasInjectableDecorator: PatternMatchingUtils.hasPattern(
        content,
        injectableDecorator
      ),
      hasProvidedIn: PatternMatchingUtils.hasPattern(content, providedIn),
      hasConstructor: PatternMatchingUtils.hasPattern(content, constructorKw),
      hasAccessModifiers: PatternMatchingUtils.hasAnyPattern(
        content,
        accessModifiers
      ),
      hasServiceClass: PatternMatchingUtils.hasPattern(content, serviceClass),
      hasImplementsKeyword: PatternMatchingUtils.hasPattern(
        content,
        implementsKw
      ),
      hasObservable: PatternMatchingUtils.hasPattern(content, observable),
      // `import { Observable, of } from 'rxjs'` is the ordinary form. Testing
      // for the exact substring 'import { Observable }' matched only an import
      // of that one symbol, so every grouped or `import type` form was read as
      // "Observable not imported" — a false failure the author could only
      // silence by splitting a correct import in two.
      hasObservableImport:
        /import\s+(?:type\s+)?\{[^}]*\bObservable\b[^}]*\}\s*from/.test(content),
      hasHttpClient: PatternMatchingUtils.hasPattern(content, httpClient),
      hasHttpClientInjection: PatternMatchingUtils.hasPattern(
        content,
        httpClientInjection
      ),
      hasCatchError: PatternMatchingUtils.hasPattern(content, catchError),
      hasHttpReference: PatternMatchingUtils.hasPattern(content, httpReference),
      methodCount: (content.match(methodPattern) ?? []).length,
    };
  }
}
