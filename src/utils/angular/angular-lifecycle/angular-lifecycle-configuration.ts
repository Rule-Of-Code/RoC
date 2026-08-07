import { ANGULAR_LIFECYCLE_KEYWORDS } from '../../constants';

/**
 * Angular lifecycle hooks configuration
 * Meta-dogfooding: Centralized lifecycle hooks management for Angular analyzers
 */
export class AngularLifecycleConfiguration {
  /**
   * Lifecycle hooks interfaces
   */
  static readonly LIFECYCLE_INTERFACES = [
    ANGULAR_LIFECYCLE_KEYWORDS.ON_INIT,
    ANGULAR_LIFECYCLE_KEYWORDS.ON_DESTROY,
    ANGULAR_LIFECYCLE_KEYWORDS.ON_CHANGES,
    ANGULAR_LIFECYCLE_KEYWORDS.DO_CHECK,
    ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_INIT,
    ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_CHECKED,
    ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_INIT,
    ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_CHECKED,
  ] as const;

  /**
   * Lifecycle hooks method mappings
   */
  static readonly HOOK_MAPPINGS = [
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_INIT,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.ON_INIT,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_DESTROY,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.ON_DESTROY,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_CHANGES,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.ON_CHANGES,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_DO_CHECK,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.DO_CHECK,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_CONTENT_INIT,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_INIT,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_CONTENT_CHECKED,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_CHECKED,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_INIT,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_INIT,
    },
    {
      method: ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_CHECKED,
      interface: ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_CHECKED,
    },
  ] as const;

  /**
   * Interface to method mapping - made partial for proper optional handling
   */
  private static readonly INTERFACE_TO_METHOD_MAP: Partial<
    Record<string, string>
  > = {
    [ANGULAR_LIFECYCLE_KEYWORDS.ON_INIT]: ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_INIT,
    [ANGULAR_LIFECYCLE_KEYWORDS.ON_DESTROY]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_DESTROY,
    [ANGULAR_LIFECYCLE_KEYWORDS.ON_CHANGES]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_CHANGES,
    [ANGULAR_LIFECYCLE_KEYWORDS.DO_CHECK]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_DO_CHECK,
    [ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_INIT]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_CONTENT_INIT,
    [ANGULAR_LIFECYCLE_KEYWORDS.AFTER_CONTENT_CHECKED]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_CONTENT_CHECKED,
    [ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_INIT]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_INIT,
    [ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_CHECKED]:
      ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_CHECKED,
  } as const;

  /**
   * Angular file extensions for lifecycle analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_LIFECYCLE_KEYWORDS.COMPONENT_TS,
    ANGULAR_LIFECYCLE_KEYWORDS.DIRECTIVE_TS,
    ANGULAR_LIFECYCLE_KEYWORDS.SERVICE_TS,
  ] as const;

  /**
   * Get method name for lifecycle interface
   * Meta-dogfooding: Centralized interface-to-method mapping
   */
  static getMethodForInterface(interfaceName: string): string {
    return (
      this.INTERFACE_TO_METHOD_MAP[interfaceName] ??
      ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_CHECKED
    );
  }

  /**
   * Get implemented interfaces from content
   * Meta-dogfooding: Centralized interface detection logic
   */
  static getImplementedInterfaces(content: string): string[] {
    return this.LIFECYCLE_INTERFACES.filter(
      hook =>
        content.includes(`${ANGULAR_LIFECYCLE_KEYWORDS.IMPLEMENTS}${hook}`) ||
        content.includes(`${ANGULAR_LIFECYCLE_KEYWORDS.COMMA_SPACE}${hook}`)
    );
  }

  /**
   * Check if content has lifecycle method
   * Meta-dogfooding: Centralized method detection logic
   */
  static hasLifecycleMethod(content: string, methodName: string): boolean {
    return content.includes(
      `${methodName}${ANGULAR_LIFECYCLE_KEYWORDS.OPENING_PAREN}`
    );
  }

  /**
   * Pattern detectors for lifecycle hooks analysis
   * Meta-dogfooding: Centralized pattern detection logic
   */
  static readonly PATTERN_DETECTORS = {
    hasOnInitAndConstructor: (content: string): boolean =>
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_INIT) &&
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.CONSTRUCTOR),

    hasHttpOrServiceUsage: (content: string): boolean =>
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.THIS_HTTP) ||
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.THIS_SERVICE) ||
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.SUBSCRIBE),

    hasAsyncOperationsInConstructor: (content: string): boolean =>
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.SUBSCRIBE) ||
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.HTTP),

    hasInterfaceImplementation: (
      content: string,
      hookInterface: string
    ): boolean =>
      content.includes(
        `${ANGULAR_LIFECYCLE_KEYWORDS.IMPLEMENTS}${hookInterface}`
      ) ||
      content.includes(
        `${ANGULAR_LIFECYCLE_KEYWORDS.COMMA_SPACE}${hookInterface}`
      ),

    hasNgOnChanges: (content: string): boolean =>
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_CHANGES),

    hasSimpleChanges: (content: string): boolean =>
      content.includes(ANGULAR_LIFECYCLE_KEYWORDS.SIMPLE_CHANGES),
  } as const;

  /**
   * Extract constructor content for analysis
   * Meta-dogfooding: Centralized string extraction logic
   */
  static extractConstructorContent(
    content: string,
    constructorIndex: number
  ): string {
    return content.substring(
      constructorIndex,
      content.indexOf(
        ANGULAR_LIFECYCLE_KEYWORDS.CLOSING_BRACE,
        constructorIndex
      )
    );
  }

  /**
   * Find constructor index in content
   * Meta-dogfooding: Centralized index finding logic
   */
  static findConstructorIndex(content: string): number {
    return content.indexOf(ANGULAR_LIFECYCLE_KEYWORDS.CONSTRUCTOR);
  }

  /**
   * Find ngOnInit index in content
   * Meta-dogfooding: Centralized index finding logic
   */
  static findNgOnInitIndex(content: string): number {
    return content.indexOf(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_INIT);
  }

  /**
   * Validation message builders for lifecycle hooks
   * Meta-dogfooding: Centralized validation messages
   */
  static readonly VALIDATION_MESSAGES = {
    INTERFACE_WITHOUT_METHOD: (
      hookInterface: string,
      methodName: string,
      fileName: string
    ) => ({
      violationMessage: `${hookInterface} interface implemented but ${methodName} method missing in ${fileName}`,
      suggestionMessage: `Implement ${methodName} method for ${hookInterface} interface in ${fileName}`,
    }),

    METHOD_WITHOUT_INTERFACE: (
      methodName: string,
      hookInterface: string,
      fileName: string
    ) => ({
      violationMessage: `${methodName} method found but ${hookInterface} interface not implemented in ${fileName}`,
      suggestionMessage: `Implement ${hookInterface} interface when using ${methodName} in ${fileName}`,
    }),

    HTTP_IN_CONSTRUCTOR: (fileName: string) => ({
      violationMessage: `HTTP calls or subscriptions in constructor should be moved to ngOnInit in ${fileName}`,
      suggestionMessage: `Move initialization logic from constructor to ngOnInit in ${fileName}`,
    }),

    ONCHANGES_WITHOUT_SIMPLECHANGES: (fileName: string) => ({
      violationMessage: `ngOnChanges should use SimpleChanges parameter in ${fileName}`,
      suggestionMessage: `Add SimpleChanges parameter to ngOnChanges method in ${fileName}`,
    }),
  } as const;
}
