import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { AngularSignalAnalyzerBase } from '../angular-signal-base/angular-signal-analyzer-base';
import { AngularDependencyInjectionConfiguration } from './angular-dependency-injection-configuration';
import { AngularDependencyInjectionValidationPatterns } from './angular-dependency-injection-validation-patterns';
/**
 * Angular Dependency Injection Analyzer
 * Specialized utility for analyzing Angular dependency injection patterns
 */
export class AngularDependencyInjectionAnalyzer extends AngularSignalAnalyzerBase {
  private config?: RuleOfCodeConfig;

  /**
   * Check dependency injection patterns
   * Meta-dogfooding: Uses centralized configuration and delegated analysis
   */
  static checkDependencyInjection(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const analyzer = new AngularDependencyInjectionAnalyzer();
    analyzer.config = config;
    return analyzer.commonCheck(projectRoot, config);
  }

  protected getFileExtensions(): string[] {
    return AngularDependencyInjectionConfiguration.ANGULAR_FILE_EXTENSIONS;
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzeDependencyFile(filePath, violations, suggestions);
  }

  /**
   * Analyze file for dependency injection patterns
   * Meta-dogfooding: Delegates to centralized configuration and validation patterns
   */
  private analyzeDependencyFile(
    filePath: string,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(filePath, {
        encoding: 'utf8',
      });

      const patterns =
        AngularDependencyInjectionConfiguration.analyzeDependencyPatterns(
          content,
          filePath
        );

      AngularDependencyInjectionValidationPatterns.validateAllDependencyInjectionPatterns(
        patterns,
        violations,
        suggestions,
        this.config || { thresholds: {} }
      );
    } catch (_error) {
      // Skip files that can't be read
    }
  }
}
