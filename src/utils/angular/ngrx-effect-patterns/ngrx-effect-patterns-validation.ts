import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { AnalysisResult } from '../rxjs-operator-usage';
import { NgRxEffectPatternsConfiguration } from './ngrx-effect-patterns-configuration';

/**
 * NgRx Effect Patterns Validation
 * Centralized validation methods for effect pattern analysis
 */
export class NgRxEffectPatternsValidation {
  private static readonly Config = NgRxEffectPatternsConfiguration;
  private static readonly Messages = this.Config.VALIDATION_MESSAGES;
  private static readonly FILENAME_PLACEHOLDER = '{fileName}';
  private static readonly EffectAnalysis = Object.create(null) as Record<string, unknown>;

  private static formatMessage(message: string, fileName: string): string {
    return message.replace(this.FILENAME_PLACEHOLDER, fileName);
  }

  /**
   * Validate all effect patterns in a project
   */
  static validateAllEffectPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AnalysisResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const effectFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      [
        this.Config.EFFECT_PATTERNS.FILE_EXTENSIONS.EFFECTS_TS,
        this.Config.EFFECT_PATTERNS.FILE_EXTENSIONS.EFFECT_TS,
      ],
      config
    ).filter(file =>
      this.Config.isEffectFile(PathOperations.getBasename(file))
    );

    for (const file of effectFiles) {
      this.analyzeEffectFile(file, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze a single effect file
   */
  private static analyzeEffectFile(
    file: string,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(file, {
        encoding: this.Config.EFFECT_PATTERNS.ANGULAR_CONSTANTS.ENCODING_UTF8,
        fallbackToEmpty: true,
      });
      if (!content) return;

      const fileName = PathOperations.getBasename(file);
      const patterns: typeof this.EffectAnalysis =
        this.Config.analyzeEffectPatterns(content);

      this.validateInjectableDecorator(patterns, fileName, violations);
      this.validateCreateEffectUsage(patterns, suggestions);
      this.validateDispatchFalsePattern(patterns, suggestions);
      this.validateErrorHandling(patterns, fileName, violations);
      this.validateDependencyInjection(patterns, suggestions);
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  /**
   * Validate @Injectable decorator presence
   */
  private static validateInjectableDecorator(
    patterns: typeof this.EffectAnalysis,
    fileName: string,
    violations: string[]
  ): void {
    if (!patterns.hasInjectable) {
      violations.push(
        this.formatMessage(this.Messages.MISSING_INJECTABLE_VIOLATION, fileName)
      );
    }
  }

  /**
   * Validate createEffect usage
   */
  private static validateCreateEffectUsage(
    patterns: typeof this.EffectAnalysis,
    suggestions: string[]
  ): void {
    if (!patterns.hasCreateEffect) {
      suggestions.push(this.Messages.USE_CREATE_EFFECT_SUGGESTION);
    }
  }

  /**
   * Validate dispatch: false pattern with tap
   */
  private static validateDispatchFalsePattern(
    patterns: typeof this.EffectAnalysis,
    suggestions: string[]
  ): void {
    if (patterns.hasDispatchFalse && patterns.hasTap) {
      suggestions.push(this.Messages.TAP_WITH_DISPATCH_FALSE_SUGGESTION);
    }
  }

  /**
   * Validate error handling in effects
   */
  private static validateErrorHandling(
    patterns: typeof this.EffectAnalysis,
    fileName: string,
    violations: string[]
  ): void {
    if (patterns.hasCreateEffect && !patterns.hasCatchError) {
      violations.push(
        this.formatMessage(
          this.Messages.MISSING_ERROR_HANDLING_VIOLATION,
          fileName
        )
      );
    }
  }

  /**
   * Validate dependency injection pattern
   */
  private static validateDependencyInjection(
    patterns: typeof this.EffectAnalysis,
    suggestions: string[]
  ): void {
    if (patterns.hasHttp && !patterns.hasInject) {
      suggestions.push(this.Messages.USE_INJECT_SUGGESTION);
    }
  }
}
