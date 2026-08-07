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
    const messages = this.VALIDATION_MESSAGES as unknown as Record<
      string,
      string | ((...params: string[]) => string)
    >;
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
  static getAppConfigPath = NgRxPathOperations.getAppConfigPath;
  static getSourcePath = NgRxPathOperations.getSourcePath;
  static getPackageJsonData = NgRxDependencyAnalyzer.getPackageJsonData;
  static getAllProjectDependencies =
    NgRxDependencyAnalyzer.getAllProjectDependencies;
  static checkDevToolsDependencyInstalled =
    NgRxDependencyAnalyzer.checkDevToolsDependencyInstalled;
  static checkDevToolsConfigured = NgRxDevToolsChecker.checkDevToolsConfigured;
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
    const patterns = this.APP_MODULE_PATTERNS;
    const patternMap = this.PATTERN_TYPES as Record<string, string>;
    const mappedPattern = patternMap[patternType];
    if (!mappedPattern) return false;
    const actualPattern = patterns[
      mappedPattern as keyof typeof patterns
    ] as string;
    return actualPattern ? content.includes(actualPattern) : false;
  }

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
