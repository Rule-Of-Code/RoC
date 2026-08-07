import { ANGULAR_CONSTANTS } from '../../constants';
import { FileSystemOperations } from '../../file-system-operations';
// Direct file import (not the '../ngrx-setup' barrel) to avoid an
// ngrx-module <-> ngrx-setup module-init cycle.
import { NgRxSetupConfiguration } from '../ngrx-setup/ngrx-setup-configuration';
import { NgRxModuleValidationPatterns } from './ngrx-module-validation-patterns';

/** Dependencies state type */
export interface DependenciesState {
  hasStore: boolean;
  hasEffects: boolean;
  hasDevTools: boolean;
}

/** Shared validation options type to eliminate duplication */
interface NgRxValidationOptions {
  moduleContent: string;
  dependencies: DependenciesState;
  violations: string[];
  suggestions: string[];
  patterns: typeof NgRxSetupConfiguration.APP_MODULE_PATTERNS;
  patternTypes: typeof NgRxSetupConfiguration.PATTERN_TYPES;
}

/**
 * NgRx Module Configuration
 * Centralized configuration for NgRx module setup analysis
 */
export class NgRxModuleConfiguration {
  // Lazy getter, not a static field: under the (now-broken) import cycle a static
  // initializer could capture NgRxSetupConfiguration before it was defined,
  // leaving Config === undefined. A getter resolves it at call time.
  private static get Config(): typeof NgRxSetupConfiguration {
    return NgRxSetupConfiguration;
  }
  private static readonly Patterns = NgRxModuleValidationPatterns;

  /**
   * RULE 2: Centralized setup recommendations to eliminate duplication
   */
  private static readonly SETUP_RECOMMENDATIONS = {
    STORE_MODULE_SETUP: (moduleFile: string, storeModule: string) =>
      `Add ${storeModule} to imports in ${moduleFile}`,
    EFFECTS_MODULE_SETUP: (moduleFile: string, effectsModule: string) =>
      `Add ${effectsModule} to imports in ${moduleFile}`,
    DEVTOOLS_INTEGRATION: `Configure store devtools for debugging`,
  } as const;

  /**
   * RULE 2: Extract configuration caching into helper to eliminate duplication
   */
  private static getCachedConfiguration() {
    return {
      messages: this.Config.VALIDATION_MESSAGES,
      patterns: this.Config.APP_MODULE_PATTERNS,
      patternTypes: this.Config.PATTERN_TYPES,
      readingConfig: {
        encoding: ANGULAR_CONSTANTS.ENCODING_UTF8 as BufferEncoding,
        fallbackToEmpty: true,
      },
    };
  }

  /**
   * RULE 1: Core analysis logic moved from NgRxModuleAnalyzer (100% coverage)
   * RULE 2: Optimized with cached configuration and early returns
   */
  static analyzeModuleSetup(
    projectRoot: string,
    dependencies: DependenciesState
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // RULE 2: Use centralized configuration helper to eliminate duplication
    const { messages, patterns } = this.getCachedConfiguration();
    const appModulePath = this.Config.getAppModulePath(projectRoot);

    // RULE 2: Early return for missing module (no violation for standalone architecture)
    if (!FileSystemOperations.exists(appModulePath)) {
      // In modern Angular standalone architecture, app.module.ts is not required
      return { violations, suggestions };
    }

    // RULE 2: Cache DevTools analysis results
    const devToolsAnalysis = this.getDevToolsAnalysis(projectRoot);

    // Analyze module content
    const moduleResults = this.analyzeModuleContent(
      appModulePath,
      dependencies
    );
    violations.push(...moduleResults.violations);
    suggestions.push(...moduleResults.suggestions);

    // RULE 2: Simplified DevTools integration check
    if (devToolsAnalysis.installed && !devToolsAnalysis.configured) {
      suggestions.push(
        this.Config.buildMessage(
          'MISSING_DEVTOOLS_CONFIG',
          patterns.storeDevtoolsModule,
          patterns.appModuleFile
        )
      );
    }

    return { violations, suggestions };
  }

  /**
   * RULE 2: Extract DevTools analysis into helper method
   */
  private static getDevToolsAnalysis(projectRoot: string): {
    installed: boolean;
    configured: boolean;
  } {
    return {
      installed: this.Config.checkDevToolsDependencyInstalled(projectRoot),
      configured: this.Config.checkDevToolsConfigured(projectRoot),
    };
  }

  /**
   * Analyze app module file content
   * RULE 2: Optimized with cached configuration and centralized recommendations
   */
  private static analyzeModuleContent(
    appModulePath: string,
    dependencies: DependenciesState
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // RULE 2: Use centralized configuration helper to eliminate duplicate caching
    const { readingConfig, patterns, patternTypes } =
      this.getCachedConfiguration();

    const moduleContent = FileSystemOperations.readFile(appModulePath, {
      encoding: readingConfig.encoding,
      fallbackToEmpty: readingConfig.fallbackToEmpty,
    });

    // RULE 2: Early return for empty content
    if (!moduleContent) return { violations, suggestions };

    // RULE 2: Use helper method for comprehensive module validation
    this.performModuleValidation({
      moduleContent,
      dependencies,
      violations,
      suggestions,
      patterns,
      patternTypes,
    });

    return { violations, suggestions };
  }

  /**
   * RULE 2: Extract comprehensive module validation to centralize logic
   */
  private static performModuleValidation(options: NgRxValidationOptions): void {
    const {
      moduleContent,
      dependencies,
      violations,
      suggestions,
      patterns,
      patternTypes,
    } = options;
    // RULE 2: Direct call to configuration utility
    this.Config.checkModuleStandards(
      moduleContent,
      patterns.appModuleFile,
      violations
    );

    // RULE 2: Delegate NgRx-specific validation
    this.validateNgRxPatterns({
      moduleContent,
      dependencies,
      violations,
      suggestions,
      patterns,
      patternTypes,
    });
  }

  /**
   * Validate NgRx module configuration patterns
   * RULE 2: Simplified with centralized recommendations and reduced parameters
   */
  private static validateNgRxPatterns(options: NgRxValidationOptions): void {
    const {
      moduleContent,
      dependencies,
      violations,
      suggestions,
      patterns,
      patternTypes,
    } = options;
    // RULE 2: Store module validation with early return optimization
    if (
      dependencies.hasStore &&
      !this.Config.containsNgRxPattern(moduleContent, patternTypes.storeModule)
    ) {
      violations.push(
        this.Config.buildMessage(
          'MISSING_STORE_MODULE_CONFIG',
          patterns.storeModuleForRoot,
          patterns.appModuleFile
        )
      );
      suggestions.push(
        this.SETUP_RECOMMENDATIONS.STORE_MODULE_SETUP(
          patterns.appModuleFile,
          patterns.storeModuleForRoot
        )
      );
    }

    // RULE 2: Effects module validation with early return optimization
    if (
      dependencies.hasEffects &&
      !this.Config.containsNgRxPattern(
        moduleContent,
        patternTypes.effectsModule
      )
    ) {
      suggestions.push(
        this.SETUP_RECOMMENDATIONS.EFFECTS_MODULE_SETUP(
          patterns.appModuleFile,
          patterns.effectsModuleForRoot
        )
      );
    }
  }

  /**
   * Get module validation patterns
   */
  static getValidationPatterns() {
    return this.Patterns;
  }

  /**
   * Validate module configuration prerequisites
   * RULE 2: Optimized with better error messaging using constants
   */
  static validateModulePrerequisites(projectRoot: string): {
    valid: boolean;
    appModulePath?: string;
    errors?: string[];
  } {
    const appModulePath = this.Config.getAppModulePath(projectRoot);

    // RULE 2: Early return with centralized error message
    if (!FileSystemOperations.exists(appModulePath)) {
      const { messages } = this.getCachedConfiguration();
      return {
        valid: false,
        errors: [messages.APP_MODULE_NOT_FOUND],
      };
    }

    return {
      valid: true,
      appModulePath,
    };
  }
}
