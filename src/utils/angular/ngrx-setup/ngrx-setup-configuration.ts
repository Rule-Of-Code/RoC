import { NGRX_KEYWORDS, NGRX_MESSAGES } from '../../constants';
import { StringTemplateUtils } from '../../string-template-utils';
import { NgRxDependencyAnalyzer } from '../ngrx-dependency-analyzer';
import { NgRxDevToolsChecker } from '../ngrx-devtools-checker';
// Direct file import (not the '../ngrx-module' barrel) to avoid an
// ngrx-setup <-> ngrx-module module-init cycle.
import { NgRxModuleValidator } from '../ngrx-module/ngrx-module-validator';
import { NgRxPathOperations } from '../ngrx-path-operations';
import { NgRxResultsProcessor } from '../ngrx-results-processor';

/**
 * NgRx Setup Configuration
 * SRP: Coordination layer for NgRx setup analysis
 */
export class NgRxSetupConfiguration {
  /**
   * Setup analysis configuration
   */
  static readonly SETUP_ANALYSIS_CONFIG = {
    checkDependencies: true,
    checkAppModule: true,
    checkFeatureStores: true,
    checkDevToolsIntegration: true,
    enableAdvancedSetupChecks: true,
  } as const;

  /**
   * App module configuration patterns
   */
  static readonly APP_MODULE_PATTERNS = {
    storeModuleForRoot: NGRX_KEYWORDS.STORE_MODULE_FOR_ROOT,
    effectsModuleForRoot: NGRX_KEYWORDS.EFFECTS_MODULE_FOR_ROOT,
    storeDevtoolsModule: NGRX_KEYWORDS.STORE_DEVTOOLS_MODULE,
    appModuleFile: NGRX_KEYWORDS.APP_MODULE_TS,
  } as const;

  /**
   * NgRx pattern types
   */
  static readonly PATTERN_TYPES = {
    storeModule: NGRX_KEYWORDS.PATTERN_TYPES.STORE_MODULE,
    effectsModule: NGRX_KEYWORDS.PATTERN_TYPES.EFFECTS_MODULE,
    devtoolsModule: NGRX_KEYWORDS.PATTERN_TYPES.DEVTOOLS_MODULE,
  } as const;

  /**
   * Public message builder API
   * RULE 2: Optimized with cached template access
   */
  static buildMessage(templateKey: string, ...args: string[]): string {
    const messages: Readonly<
      Record<string, string | ((...params: string[]) => string)>
    > = this.VALIDATION_MESSAGES;
    const template = messages[templateKey];

    // RULE 2: Cache type check result
    if (typeof template === 'function') {
      return (template as (...params: string[]) => string)(...args);
    }

    return StringTemplateUtils.formatTemplate(template as string, ...args);
  }

  /**
   * Essential validation messages for coordination
   */
  static readonly VALIDATION_MESSAGES = {
    MISSING_STORE_MODULE_CONFIG: `{0} should be configured in {1}`,
    MISSING_EFFECTS_MODULE_CONFIG: `{0} should be added to imports in {1}`,
    MISSING_DEVTOOLS_CONFIG: `{0} should be configured in {1}`,
    APP_MODULE_NOT_FOUND: NGRX_MESSAGES.APP_MODULE_NOT_FOUND,
    PACKAGE_JSON_NOT_FOUND: NGRX_MESSAGES.PACKAGE_JSON_NOT_FOUND,
  } as const;

  /**
   * Core coordination methods - delegate to specialized classes
   */
  static getAppModulePath = NgRxPathOperations.getAppModulePath;
  static getAppConfigPath =
    NgRxPathOperations.getAppConfigPath.bind(NgRxPathOperations);
  static getSourcePath =
    NgRxPathOperations.getSourcePath.bind(NgRxPathOperations);
  static getPackageJsonData = NgRxDependencyAnalyzer.getPackageJsonData;
  static getAllProjectDependencies =
    NgRxDependencyAnalyzer.getAllProjectDependencies;
  static checkDevToolsDependencyInstalled =
    NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled.bind(
      NgRxDependencyAnalyzer
    );
  static checkDevToolsConfigured =
    NgRxDevToolsChecker.checkDevToolsConfigured.bind(NgRxDevToolsChecker);
  static analyzeDependencies(packageJson: Record<string, unknown>) {
    return NgRxDependencyAnalyzer.analyzeDependencies(packageJson);
  }
  static calculateSeverity = NgRxResultsProcessor.calculateSeverity;
  static countIssuesByCategory = NgRxResultsProcessor.countIssuesByCategory;
  static getSetupAnalysisSummary = NgRxResultsProcessor.getSetupAnalysisSummary;

  /**
   * Check if content contains specific NgRx patterns
   */
  static containsNgRxPattern(content: string, patternType: string): boolean {
    // A pattern type names the APP_MODULE_PATTERNS entry it looks for. The
    // lookup used the type's own value ('storeModule') as that key, which no
    // entry has, so the answer was always false and every NgModule project was
    // told to add the StoreModule.forRoot it already imports (#511 — hidden
    // until the TypeError in front of it was fixed).
    const key = this.PATTERN_FOR_TYPE[patternType];
    return key ? content.includes(this.APP_MODULE_PATTERNS[key]) : false;
  }

  /** The APP_MODULE_PATTERNS entry each pattern type looks for. */
  private static readonly PATTERN_FOR_TYPE: Readonly<
    Record<string, keyof typeof NgRxSetupConfiguration.APP_MODULE_PATTERNS>
  > = {
    [NGRX_KEYWORDS.PATTERN_TYPES.STORE_MODULE]: 'storeModuleForRoot',
    [NGRX_KEYWORDS.PATTERN_TYPES.EFFECTS_MODULE]: 'effectsModuleForRoot',
    [NGRX_KEYWORDS.PATTERN_TYPES.DEVTOOLS_MODULE]: 'storeDevtoolsModule',
  };

  /**
   * Check module standards (delegate to specialized validator)
   */
  static checkModuleStandards(
    content: string,
    filePath: string,
    violations: string[]
  ): void {
    NgRxModuleValidator.checkModuleStandards(content, filePath, violations);
  }
}
