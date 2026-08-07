import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularModuleUtils } from '../angular-module-utils';
import { AngularValidationPatterns } from '../angular-validation';
import { AngularLazyLoadingConfiguration } from './angular-lazy-loading-configuration';

/**
 * Angular Lazy Loading Validation Patterns
 * Specialized validation methods for lazy loading patterns
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated file processing
 */
export class AngularLazyLoadingValidationPatterns {
  private static readonly Config = AngularLazyLoadingConfiguration;

  /**
   * Helper: Read file with centralized config
   * RULE 2: Centralized file reading (eliminates duplicate config)
   */
  private static readFileWithConfig(filePath: string): string {
    return FileUtils.readFile(filePath, {
      encoding: this.Config.FILE_CONFIG.ENCODING,
      fallbackToEmpty: this.Config.FILE_CONFIG.FALLBACK_TO_EMPTY,
    });
  }

  /**
   * Analyze a single module file for lazy loading patterns
   * RULE 1: Cache patterns analysis to eliminate duplicate calls (100% internal coverage)
   * RULE 2: Delegates to private helpers for organized complexity management
   */
  static analyzeModuleFile(
    moduleFile: string,
    srcPath: string,
    violations: string[],
    suggestions: string[],
    config: RuleOfCodeConfig
  ): void {
    const content = this.readFileWithConfig(moduleFile);
    if (!content) return;

    const fileName = PathOperations.getBasename(moduleFile);
    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeLazyLoadingPatterns(
      content,
      fileName,
      moduleFile
    );

    // Delegate to private validation helpers with pre-computed patterns (RULE 2)
    this.checkLazyLoadingPotential({
      patterns,
      fileName,
      moduleFile,
      srcPath,
      suggestions,
      config,
    });
    this.checkModuleStructure(
      patterns,
      fileName,
      content,
      violations,
      suggestions
    );
  }

  /**
   * Helper: Check lazy loading potential for modules
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkLazyLoadingPotential(options: {
    patterns: ReturnType<
      typeof AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns
    >;
    fileName: string;
    moduleFile: string;
    srcPath: string;
    suggestions: string[];
    config: RuleOfCodeConfig;
  }): void {
    const { patterns, fileName, moduleFile, srcPath, suggestions, config } =
      options;
    if (!patterns.shouldCheckLazyLoading) {
      return;
    }

    const moduleCategory = AngularModuleUtils.getModuleCategory(fileName);
    if (!moduleCategory.shouldCheckLazyLoading) {
      return;
    }

    const isLazyLoaded = this.isModuleLazyLoaded(moduleFile, srcPath, config);
    const hasBarrelExport = AngularModuleUtils.hasBarrelExport(moduleFile);

    const lazySuggestions = this.Config.buildLazyLoadingSuggestions(
      patterns,
      isLazyLoaded,
      hasBarrelExport
    );

    suggestions.push(...lazySuggestions);
  }

  /**
   * Helper: Check module structure validation
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkModuleStructure(
    patterns: ReturnType<typeof this.Config.analyzeLazyLoadingPatterns>,
    fileName: string,
    content: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasNgModule) {
      return;
    }

    AngularValidationPatterns.validateModuleStructure(
      content,
      fileName,
      patterns.isAppModule,
      violations,
      suggestions
    );
  }

  /**
   * Helper: Check if module is lazy loaded using centralized routing analysis
   * RULE 1: Optimized to use routing analysis when available (eliminates dead code)
   * RULE 2: Private helper for lazy loading detection
   */
  private static isModuleLazyLoaded(
    moduleFile: string,
    srcPath: string,
    config: RuleOfCodeConfig
  ): boolean {
    const moduleName = PathOperations.getBasename(moduleFile);
    const moduleClassName = AngularModuleUtils.getModuleClassName(moduleName);

    // Use centralized routing files detection
    const routingFiles = CheckerUtils.findFilesByExtension(
      srcPath,
      this.Config.ROUTING_FILE_EXTENSIONS,
      config
    );

    for (const routingFile of routingFiles) {
      const result = this.checkFileForLazyLoading(
        routingFile,
        moduleClassName,
        moduleName
      );

      if (result) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check single file for lazy loading patterns
   * RULE 1: Uses pre-computed file reading (eliminates duplicate config)
   * RULE 2: Private helper for lazy loading detection
   */
  private static checkFileForLazyLoading(
    routingFile: string,
    moduleClassName: string,
    moduleName: string
  ): boolean {
    const content = this.readFileWithConfig(routingFile);
    if (!content) return false;

    const routingPatterns = this.Config.analyzeRoutingPatterns(
      content,
      moduleClassName,
      moduleName
    );

    return routingPatterns.isLazyLoaded;
  }

  /**
   * Master validation orchestrator for all lazy loading patterns
   * Meta-dogfooding: Complete lazy loading pattern analysis using centralized utilities
   */
  static validateAllLazyLoadingPatterns(
    srcPath: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    const moduleFiles = CheckerUtils.findFilesByExtension(
      srcPath,
      this.Config.ANGULAR_FILE_EXTENSIONS,
      config
    );

    for (const moduleFile of moduleFiles) {
      this.analyzeModuleFile(
        moduleFile,
        srcPath,
        violations,
        suggestions,
        config
      );
    }
  }
}
