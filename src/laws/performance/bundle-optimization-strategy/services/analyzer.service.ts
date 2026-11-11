import type { RuleOfCodeConfig } from '../../../../types/law.types';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import type { BundlerReport } from '../../../../utils/react/web-bundler-config';
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
    config: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence,
    bundler?: BundlerReport
  ): {
    isConfigured: boolean;
    strategies: string[];
  } {
    return CodeSplittingAnalyzerService.analyze(projectRoot, config, react, bundler);
  }

  /**
   * Analyze tree shaking
   */
  static analyzeTreeShaking(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
    isEnabled: boolean;
    configurations: string[];
  } {
    return TreeShakingAnalyzerService.analyze(projectRoot, bundler);
  }

  /**
   * Analyze minification
   */
  static analyzeMinification(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
    isOptimal: boolean;
    configurations: string[];
  } {
    return MinificationAnalyzerService.analyze(projectRoot, bundler);
  }

  /**
   * Analyze critical CSS
   */
  static analyzeCriticalCSS(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
    isConfigured: boolean;
    strategies: string[];
  } {
    return CriticalCSSAnalyzerService.analyze(projectRoot, bundler);
  }

  /**
   * Analyze vendor chunk optimization
   */
  static analyzeVendorChunk(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
    isOptimized: boolean;
    optimizations: string[];
  } {
    return VendorChunkAnalyzerService.analyze(projectRoot, bundler);
  }

  /**
   * Analyze bundle analysis setup
   */
  static analyzeBundleAnalysis(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    bundler?: BundlerReport
  ): {
    isSetup: boolean;
    tools: string[];
  } {
    return BundleAnalysisAnalyzerService.analyze(projectRoot, config, bundler);
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
