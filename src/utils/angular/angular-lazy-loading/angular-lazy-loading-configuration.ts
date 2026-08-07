import {
  ANGULAR_CONSTANTS,
  DIRECTORY_NAMES,
  FILE_EXTENSIONS,
} from '../../constants';
import { PatternMatchingUtils } from '../../pattern-matching-utils';

/**
 * Angular Lazy Loading Configuration
 * Centralized configuration for lazy loading patterns analysis
 * Meta-dogfooding: Centralizes hardcoded constants and lazy loading patterns
 */
export class AngularLazyLoadingConfiguration {
  /**
   * Config alias for cleaner internal references (RULE 2 pattern)
   */
  private static readonly Config = AngularLazyLoadingConfiguration;

  /**
   * File extensions for lazy loading analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [FILE_EXTENSIONS.MODULE_TS];

  /**
   * Routing file extensions for lazy loading detection
   */
  static readonly ROUTING_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.ROUTING_SUFFIX,
    ANGULAR_CONSTANTS.ROUTING_ALT_SUFFIX,
  ];

  /**
   * Directory configuration for lazy loading analysis
   */
  static readonly DIRECTORIES = {
    SRC: DIRECTORY_NAMES.SRC,
  };

  /**
   * Lazy loading patterns and constants
   */
  static readonly LAZY_LOADING_PATTERNS = {
    // Module patterns
    NG_MODULE: ANGULAR_CONSTANTS.NG_MODULE,
    APP_MODULE: ANGULAR_CONSTANTS.APP_MODULE,
    INDEX_TS: ANGULAR_CONSTANTS.INDEX_TS,

    // Routing patterns
    LOAD_CHILDREN: ANGULAR_CONSTANTS.LOAD_CHILDREN,
    // Standalone lazy route: `loadComponent: () => import(...)`. No NgModule, no
    // module reference — the whole reason a standalone app was reported as having
    // no lazy loading (FE finding, the wired law never knew this form existed).
    LOAD_COMPONENT: 'loadComponent',
    ROUTING_SUFFIX: ANGULAR_CONSTANTS.ROUTING_SUFFIX,
    ROUTING_ALT_SUFFIX: ANGULAR_CONSTANTS.ROUTING_ALT_SUFFIX,
  };

  /**
   * File processing configuration
   */
  static readonly FILE_CONFIG = {
    ENCODING: ANGULAR_CONSTANTS.ENCODING_UTF8,
    FALLBACK_TO_EMPTY: true,
  };

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
   * Helper: Apply directoryName placeholder to validation messages
   * RULE 2: Centralized message templating for directory names
   */
  private static applyDirectoryNamePlaceholder(
    message: string,
    directoryName: string
  ): string {
    return message.replace('{directoryName}', directoryName);
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
   * Build validation message with directoryName placeholder
   * RULE 2: Consolidates message construction with directory name
   */
  static buildDirectoryNameMessage(
    messageTemplate: string,
    directoryName: string
  ): string {
    return this.applyDirectoryNamePlaceholder(messageTemplate, directoryName);
  }

  /**
   * Validation message builders for lazy loading patterns
   * RULE 2: Centralized message templates with placeholder support
   */
  static readonly VALIDATION_MESSAGES = {
    LAZY_LOADING_SUGGESTION:
      'Consider making {fileName} lazy loaded for better performance',
    BARREL_EXPORT_SUGGESTION:
      'Create barrel export (index.ts) for {directoryName} module',
  } as const;

  /**
   * Analyze lazy loading patterns in module content
   * RULE 2: Optimized to eliminate duplicate pattern checks via caching
   */
  static analyzeLazyLoadingPatterns(
    content: string,
    fileName: string,
    moduleFile: string
  ): {
    fileName: string;
    moduleFile: string;
    isAppModule: boolean;
    hasNgModule: boolean;
    shouldCheckLazyLoading: boolean;
  } {
    // Cache patterns for reuse
    const appModule = this.LAZY_LOADING_PATTERNS.APP_MODULE;
    const ngModule = this.LAZY_LOADING_PATTERNS.NG_MODULE;

    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    const isAppModule = fileName.includes(appModule);
    const hasNgModule = PatternMatchingUtils.hasPattern(content, ngModule);

    return {
      fileName,
      moduleFile,
      isAppModule,
      hasNgModule,
      shouldCheckLazyLoading: !isAppModule,
    };
  }

  /**
   * Analyze routing file for lazy loading patterns
   * RULE 2: Optimized to eliminate duplicate pattern checks via caching
   */
  static analyzeRoutingPatterns(
    content: string,
    moduleClassName: string,
    moduleName: string
  ): {
    hasLoadChildren: boolean;
    hasModuleReference: boolean;
    isLazyLoaded: boolean;
  } {
    // Cache pattern for reuse
    const loadChildren = this.LAZY_LOADING_PATTERNS.LOAD_CHILDREN;

    // RULE 1: Use centralized PatternMatchingUtils instead of duplicate logic
    const hasLoadChildren = PatternMatchingUtils.hasPattern(
      content,
      loadChildren
    );
    const hasModuleReference =
      PatternMatchingUtils.hasPattern(content, moduleClassName) ||
      PatternMatchingUtils.hasPattern(content, moduleName);
    // A standalone `loadComponent` route is lazy on its own — it loads a
    // component, so it needs neither an NgModule nor a module reference.
    const hasLoadComponent = PatternMatchingUtils.hasPattern(
      content,
      this.LAZY_LOADING_PATTERNS.LOAD_COMPONENT
    );

    return {
      hasLoadChildren,
      hasModuleReference,
      isLazyLoaded:
        (hasLoadChildren && hasModuleReference) || hasLoadComponent,
    };
  }

  /**
   * Build lazy loading suggestions configuration
   * RULE 2: Uses centralized message helpers for consistent formatting
   */
  static buildLazyLoadingSuggestions(
    patterns: ReturnType<
      typeof AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns
    >,
    isLazyLoaded: boolean,
    hasBarrelExport: boolean
  ): string[] {
    const suggestions: string[] = [];

    // Lazy loading suggestion
    if (patterns.shouldCheckLazyLoading && !isLazyLoaded) {
      suggestions.push(
        this.buildFileNameMessage(
          this.VALIDATION_MESSAGES.LAZY_LOADING_SUGGESTION,
          patterns.fileName
        )
      );
    }

    // Barrel export suggestion
    if (!patterns.isAppModule && !hasBarrelExport) {
      const directoryName = patterns.fileName.replace('.module.ts', '');
      suggestions.push(
        this.buildDirectoryNameMessage(
          this.VALIDATION_MESSAGES.BARREL_EXPORT_SUGGESTION,
          directoryName
        )
      );
    }

    return suggestions;
  }
}
