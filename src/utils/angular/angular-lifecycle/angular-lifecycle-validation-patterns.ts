import { CodeText } from '../../code-text';
import { AngularLifecycleConfiguration } from './angular-lifecycle-configuration';

/**
 * Angular lifecycle hooks validation patterns
 * Meta-dogfooding: Centralized lifecycle validation logic for Angular components
 */
export class AngularLifecycleValidationPatterns {
  private static readonly Config = AngularLifecycleConfiguration;
  /**
   * Check interface implementation violations
   */
  static validateInterfaceImplementation(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const implementedInterfaces = this.Config.getImplementedInterfaces(content);

    for (const hookInterface of implementedInterfaces) {
      const methodName = this.Config.getMethodForInterface(hookInterface);

      if (!this.Config.hasLifecycleMethod(content, methodName)) {
        const messages =
          this.Config.VALIDATION_MESSAGES.INTERFACE_WITHOUT_METHOD(
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
    for (const { method, interface: hookInterface } of this.Config
      .HOOK_MAPPINGS) {
      if (
        this.Config.hasLifecycleMethod(content, method) &&
        !this.Config.PATTERN_DETECTORS.hasInterfaceImplementation(
          content,
          hookInterface
        )
      ) {
        const messages =
          this.Config.VALIDATION_MESSAGES.METHOD_WITHOUT_INTERFACE(
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
    if (!this.Config.PATTERN_DETECTORS.hasOnInitAndConstructor(content)) return;
    if (!this.Config.PATTERN_DETECTORS.hasHttpOrServiceUsage(content)) return;

    const constructorIndex = this.Config.findConstructorIndex(content);
    const ngOnInitIndex = this.Config.findNgOnInitIndex(content);

    if (constructorIndex > -1 && ngOnInitIndex > -1) {
      const constructorContent = this.Config.extractConstructorContent(
        content,
        constructorIndex
      );

      if (
        this.Config.PATTERN_DETECTORS.hasAsyncOperationsInConstructor(
          constructorContent
        )
      ) {
        const messages =
          this.Config.VALIDATION_MESSAGES.HTTP_IN_CONSTRUCTOR(fileName);
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
      this.Config.PATTERN_DETECTORS.hasNgOnChanges(content) &&
      !this.Config.PATTERN_DETECTORS.hasSimpleChanges(content)
    ) {
      const messages =
        this.Config.VALIDATION_MESSAGES.ONCHANGES_WITHOUT_SIMPLECHANGES(
          fileName
        );
      violations.push(messages.violationMessage);
      suggestions.push(messages.suggestionMessage);
    }
  }

  /**
   * `ngDoCheck` runs on every change-detection pass of the app, so whatever
   * it does runs for every event anywhere (#562; checked before only by an
   * unregistered analyzer reached through Lazy Loading). Read from the code:
   * a mention in a comment or a string is not the hook.
   */
  static validateDoCheck(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!/\bngDoCheck\s*\(/.test(CodeText.stripCommentsAndStrings(content)))
      return;
    violations.push(
      `ngDoCheck found in ${fileName} - can cause performance issues`
    );
    suggestions.push(
      `Consider alternatives to ngDoCheck in ${fileName}: OnPush with inputs or signals, or ngOnChanges`
    );
  }
}
