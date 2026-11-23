import { AngularLifecycleConfiguration } from './angular-lifecycle-configuration';

/**
 * Angular lifecycle hooks validation patterns
 * Meta-dogfooding: Centralized lifecycle validation logic for Angular components
 */
export class AngularLifecycleValidationPatterns {
  private static readonly config = AngularLifecycleConfiguration;
  /**
   * Check interface implementation violations
   */
  static validateInterfaceImplementation(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const implementedInterfaces = this.config.getImplementedInterfaces(content);

    for (const hookInterface of implementedInterfaces) {
      const methodName = this.config.getMethodForInterface(hookInterface);

      if (!this.config.hasLifecycleMethod(content, methodName)) {
        const messages =
          this.config.VALIDATION_MESSAGES.INTERFACE_WITHOUT_METHOD(
            hookInterface,
            methodName,
            fileName
          );
        violations.push(messages.violationMessage);
        suggestions.push(messages.suggestionMessage);
      }
    }
  }

  /**
   * Check method without interface violations
   */
  static validateMethodWithoutInterface(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    for (const { method, interface: hookInterface } of this.config
      .HOOK_MAPPINGS) {
      if (
        this.config.hasLifecycleMethod(content, method) &&
        !this.config.PATTERN_DETECTORS.hasInterfaceImplementation(
          content,
          hookInterface
        )
      ) {
        const messages =
          this.config.VALIDATION_MESSAGES.METHOD_WITHOUT_INTERFACE(
            method,
            hookInterface,
            fileName
          );
        violations.push(messages.violationMessage);
        suggestions.push(messages.suggestionMessage);
      }
    }
  }

  /**
   * Check ngOnInit constructor violations
   */
  static validateOnInitUsage(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!this.config.PATTERN_DETECTORS.hasOnInitAndConstructor(content)) return;
    if (!this.config.PATTERN_DETECTORS.hasHttpOrServiceUsage(content)) return;

    const constructorIndex = this.config.findConstructorIndex(content);
    const ngOnInitIndex = this.config.findNgOnInitIndex(content);

    if (constructorIndex > -1 && ngOnInitIndex > -1) {
      const constructorContent = this.config.extractConstructorContent(
        content,
        constructorIndex
      );

      if (
        this.config.PATTERN_DETECTORS.hasAsyncOperationsInConstructor(
          constructorContent
        )
      ) {
        const messages =
          this.config.VALIDATION_MESSAGES.HTTP_IN_CONSTRUCTOR(fileName);
        violations.push(messages.violationMessage);
        suggestions.push(messages.suggestionMessage);
      }
    }
  }

  /**
   * Check ngOnChanges SimpleChanges violations
   */
  static validateOnChangesImplementation(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (
      this.config.PATTERN_DETECTORS.hasNgOnChanges(content) &&
      !this.config.PATTERN_DETECTORS.hasSimpleChanges(content)
    ) {
      const messages =
        this.config.VALIDATION_MESSAGES.ONCHANGES_WITHOUT_SIMPLECHANGES(
          fileName
        );
      violations.push(messages.violationMessage);
      suggestions.push(messages.suggestionMessage);
    }
  }
}
