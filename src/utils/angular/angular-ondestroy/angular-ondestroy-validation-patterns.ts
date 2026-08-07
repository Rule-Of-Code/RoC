import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularOnDestroyConfiguration } from './angular-ondestroy-configuration';

/**
 * Angular OnDestroy Validation Patterns
 * Specialized validation methods for OnDestroy implementation patterns
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated patterns
 */
export class AngularOnDestroyValidationPatterns {
  private static readonly Config = AngularOnDestroyConfiguration;
  /**
   * Analyze a single Angular file for OnDestroy violations
   * Meta-dogfooding: Centralizes Angular file analysis logic
   */
  static analyzeAngularFile(
    angularFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(angularFile, {
      encoding: this.Config.FILE_CONFIG.ENCODING,
      fallbackToEmpty: this.Config.FILE_CONFIG.FALLBACK_TO_EMPTY,
    });
    if (!content) return;

    const fileName = PathOperations.getBasename(angularFile);
    const patterns = this.Config.analyzeOnDestroyPatterns(content, fileName);

    // Run all validation checks
    this.validateOnDestroyInterface(patterns, violations, suggestions);
    this.validateEmptyOnDestroy(patterns, suggestions);
    this.validateCleanupPatterns(patterns, suggestions);
    this.validateDestroyPattern(patterns, suggestions);
    this.validateSubscriptionArray(patterns, suggestions);
    this.validateAsyncCleanup(patterns, suggestions);
  }

  /**
   * Check for proper OnDestroy interface implementation
   */
  static validateOnDestroyInterface(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    const config = this.Config.VALIDATION_MESSAGES;

    if (patterns.hasOnDestroyInterface && !patterns.hasNgOnDestroyMethod) {
      violations.push(config.INTERFACE.MISSING_METHOD(patterns.fileName));
      suggestions.push(config.SUGGESTIONS.IMPLEMENT_METHOD(patterns.fileName));
    }

    if (patterns.hasNgOnDestroyMethod && !patterns.hasOnDestroyInterface) {
      violations.push(config.INTERFACE.MISSING_INTERFACE(patterns.fileName));
      suggestions.push(
        config.SUGGESTIONS.IMPLEMENT_INTERFACE(patterns.fileName)
      );
    }
  }

  /**
   * Check for empty ngOnDestroy method
   */
  static validateEmptyOnDestroy(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasNgOnDestroyMethod || !patterns.ngOnDestroyMethodBody) {
      return;
    }

    const methodBody = patterns.ngOnDestroyMethodBody;
    if (
      methodBody === '' ||
      methodBody.length < this.Config.FILE_CONFIG.EMPTY_METHOD_THRESHOLD
    ) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.SUGGESTIONS.EMPTY_METHOD(
          patterns.fileName
        )
      );
    }
  }

  /**
   * Check for common cleanup patterns
   */
  static validateCleanupPatterns(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasNgOnDestroyMethod) return;

    const cleanupSuggestions = this.Config.buildCleanupSuggestions(patterns);
    suggestions.push(...cleanupSuggestions);
  }

  /**
   * Check for destroy$ pattern
   */
  static validateDestroyPattern(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasTakeUntil || !patterns.hasNgOnDestroyMethod) return;

    const config = this.Config.VALIDATION_MESSAGES.PATTERNS;

    if (!patterns.hasDestroySubject) {
      suggestions.push(config.DESTROY_SUBJECT(patterns.fileName));
    }

    if (patterns.hasDestroyNext && !patterns.hasDestroyComplete) {
      suggestions.push(config.DESTROY_COMPLETE(patterns.fileName));
    }
  }

  /**
   * Check for subscription array pattern
   */
  static validateSubscriptionArray(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasSubscriptionArray || !patterns.hasNgOnDestroyMethod)
      return;

    const config = this.Config;
    const hasForEach = patterns.ngOnDestroyMethodBody?.includes(
      config.ONDESTROY_PATTERNS.FOR_EACH
    );
    const hasUnsubscribe = patterns.ngOnDestroyMethodBody?.includes(
      config.ONDESTROY_PATTERNS.UNSUBSCRIBE
    );

    if (!hasForEach && !hasUnsubscribe) {
      suggestions.push(
        config.VALIDATION_MESSAGES.PATTERNS.SUBSCRIPTION_ARRAY(
          patterns.fileName
        )
      );
    }
  }

  /**
   * Check for async/await cleanup
   */
  static validateAsyncCleanup(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >,
    suggestions: string[]
  ): void {
    if (!patterns.hasAsync || !patterns.hasNgOnDestroyMethod) return;

    suggestions.push(
      this.Config.VALIDATION_MESSAGES.PATTERNS.ASYNC_CLEANUP(patterns.fileName)
    );
  }

  /**
   * Find Angular component and directive files
   * Meta-dogfooding: Uses centralized file extension configuration
   */
  static findAngularFiles(srcPath: string, config: RuleOfCodeConfig): string[] {
    return CheckerUtils.findFilesByExtension(
      srcPath,
      this.Config.ANGULAR_FILE_EXTENSIONS,
      config
    );
  }

  /**
   * Master validation orchestrator for all OnDestroy patterns
   * Meta-dogfooding: Complete OnDestroy pattern analysis using centralized utilities
   */
  static validateAllOnDestroyPatterns(
    srcPath: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    const angularFiles = this.findAngularFiles(srcPath, config);

    for (const angularFile of angularFiles) {
      this.analyzeAngularFile(angularFile, violations, suggestions);
    }
  }
}
