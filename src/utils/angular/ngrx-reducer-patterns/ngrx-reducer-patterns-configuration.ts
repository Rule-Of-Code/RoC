import type { RuleOfCodeConfig } from '../../../config/types';
import { DIRECTORY_NAMES } from '../../constants';
import { FileSystemOperations } from '../../file-system-operations';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';

/**
 * NgRx Reducer Patterns Configuration
 * Centralized configuration for NgRx reducer pattern analysis
 */
export class NgRxReducerPatternsConfiguration extends AngularConfigurationBase {
  private static readonly Config = NgRxReducerPatternsConfiguration;

  /**
   * Analyzer orchestration configuration (RULE 1: 100% internal coverage)
   */
  static readonly ANALYZER_ORCHESTRATION_CONFIG = {
    actionHandling: {
      enabled: true,
      priority: 1,
      description: 'Analyze action handling patterns in reducers',
    },
    immutabilityCompliance: {
      enabled: true,
      priority: 2,
      description: 'Analyze immutability compliance in reducer implementations',
    },
  } as const;

  /**
   * Analysis result aggregation configuration (RULE 1: 100% internal coverage)
   */
  static readonly RESULT_AGGREGATION_CONFIG = {
    mergeViolations: true,
    mergeSuggestions: true,
    deduplicateResults: true,
    prioritizeViolations: true,
  } as const;

  /**
   * Default analysis options (RULE 1: 100% internal coverage)
   */
  static readonly DEFAULT_ANALYSIS_OPTIONS = {
    includeActionHandling: true,
    includeImmutabilityCheck: true,
    enableDeepAnalysis: true,
    reportDetailLevel: 'detailed' as const,
  } as const;

  /**
   * Get analyzer orchestration configuration (RULE 2: Caching)
   */
  static getAnalyzerOrchestration(): {
    actionHandling: {
      enabled: boolean;
      priority: number;
      description: string;
    };
    immutabilityCompliance: {
      enabled: boolean;
      priority: number;
      description: string;
    };
  } {
    return this.Config.ANALYZER_ORCHESTRATION_CONFIG;
  }

  /**
   * Get analysis result aggregation configuration (RULE 2: Caching)
   */
  static getResultAggregationConfig(): {
    mergeViolations: boolean;
    mergeSuggestions: boolean;
    deduplicateResults: boolean;
    prioritizeViolations: boolean;
  } {
    return this.Config.RESULT_AGGREGATION_CONFIG;
  }

  /**
   * Get default analysis options (RULE 2: Caching)
   */
  static getDefaultAnalysisOptions(): {
    includeActionHandling: boolean;
    includeImmutabilityCheck: boolean;
    enableDeepAnalysis: boolean;
    reportDetailLevel: 'detailed' | 'summary' | 'verbose';
  } {
    return this.Config.DEFAULT_ANALYSIS_OPTIONS;
  }

  /**
   * Get the source path for analysis
   */
  static getSourcePath(projectRoot: string): string | null {
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    return FileSystemOperations.exists(srcPath) ? srcPath : null;
  }

  /**
   * Validate project configuration for reducer pattern analysis (RULE 2: Caching)
   */
  static validateProjectConfig(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const { errors, warnings } = this.validateProjectRootPath(projectRoot);
    const srcDir = DIRECTORY_NAMES.SRC;

    const srcPath = this.getSourcePath(projectRoot);
    if (!srcPath) {
      warnings.push(`Source directory not found at ${projectRoot}/${srcDir}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
