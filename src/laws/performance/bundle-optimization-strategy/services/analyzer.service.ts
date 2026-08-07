import type { RuleOfCodeConfig } from '../../../../types/law.types';
import {
  BundleOptimizationStrategyTypesConstants,
  type ViolationConfig,
} from '../constants';
import { BundleAnalysisAnalyzerService } from './bundle-analysis.analyzer';
import { CodeSplittingAnalyzerService } from './code-splitting.analyzer';
import { CriticalCSSAnalyzerService } from './critical-css.analyzer';
import { MinificationAnalyzerService } from './minification.analyzer';
import { TreeShakingAnalyzerService } from './tree-shaking.analyzer';
import { VendorChunkAnalyzerService } from './vendor-chunk.analyzer';

/**
 * BundleOptimizationStrategyAnalyzerService (Coordinator)
 *
 * Responsibility:
 * - Coordinate all specialized analyzers
 * - Delegate to appropriate services
 * - Aggregate results
 */
export class BundleOptimizationStrategyAnalyzerService {
  /**
   * Analyze code splitting
   */
  static analyzeCodeSplitting(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    isConfigured: boolean;
    strategies: string[];
  } {
    return CodeSplittingAnalyzerService.analyze(projectRoot, config);
  }

  /**
   * Analyze tree shaking
   */
  static analyzeTreeShaking(projectRoot: string): {
    isEnabled: boolean;
    configurations: string[];
  } {
    return TreeShakingAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze minification
   */
  static analyzeMinification(projectRoot: string): {
    isOptimal: boolean;
    configurations: string[];
  } {
    return MinificationAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze critical CSS
   */
  static analyzeCriticalCSS(projectRoot: string): {
    isConfigured: boolean;
    strategies: string[];
  } {
    return CriticalCSSAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze vendor chunk optimization
   */
  static analyzeVendorChunk(projectRoot: string): {
    isOptimized: boolean;
    optimizations: string[];
  } {
    return VendorChunkAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze bundle analysis setup
   */
  static analyzeBundleAnalysis(projectRoot: string): {
    isSetup: boolean;
    tools: string[];
  } {
    return BundleAnalysisAnalyzerService.analyze(projectRoot);
  }

  /**
   * Add violation and return penalty
   */
  static addViolation(
    violations: string[],
    suggestions: string[],
    score: number,
    config: ViolationConfig
  ): number {
    const {VIOLATION_MESSAGES} = BundleOptimizationStrategyTypesConstants;
    const {SUGGESTION_MESSAGES} = BundleOptimizationStrategyTypesConstants;
    const {SCORE_PENALTIES} = BundleOptimizationStrategyTypesConstants;

    violations.push(VIOLATION_MESSAGES[config.violation]);
    suggestions.push(SUGGESTION_MESSAGES[config.suggestion]);
    return score - SCORE_PENALTIES[config.penalty];
  }
}
