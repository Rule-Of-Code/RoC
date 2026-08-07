/**
 * Performance Analysis Runners Service
 * Specialized service for executing individual performance analysis components
 * RULE 2: Extracted from main service to improve separation of concerns
 */

import { ConfigFileUtils } from '../../config-file-utils';
import { DOMReferencesAnalyzer } from '../dom-references';
import { EventListenersAnalyzer } from '../event-listeners';
import { LifecycleAnalyzer } from '../lifecycle';
import { ObservableSubscriptionsAnalyzer } from '../observable-subscriptions';
import { TimerFunctionsAnalyzer } from '../timer-functions';
import { PerformanceAnalysisConfiguration } from './performance-analysis-configuration';
import { PerformanceAnalysisHelpersService } from './performance-analysis-helpers-service';
import type { PerformanceAnalysisResult } from './performance-analysis-service';

export class PerformanceAnalysisRunnersService {
  private static readonly Config = PerformanceAnalysisConfiguration;

  static runLifecycleAnalysis(
    include: boolean,
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): void {
    if (!include) return;

    // RULE 1: Use Configuration's minimal config instead of hardcoded object
    // Note: LifecycleAnalyzer works with config, using a minimal config object
    const lifecycleResult = LifecycleAnalyzer.checkLifecycleManagement(
      '',
      ConfigFileUtils.getMinimalDefaultConfig()
    );

    // RULE 2: Use helper method instead of duplicated processing logic
    PerformanceAnalysisHelpersService.processAnalysisResult(
      lifecycleResult.violations,
      issues,
      recommendations,
      this.Config.ISSUE_TYPES.LIFECYCLE,
      this.Config.RECOMMENDATIONS.LIFECYCLE
    );
  }

  static runDOMAnalysis(
    include: boolean,
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): void {
    if (!include) return;

    const domResult = DOMReferencesAnalyzer.checkDOMReferences([]);
    // RULE 2: Use helper method instead of duplicated Object.values().flat()
    const domViolations =
      PerformanceAnalysisHelpersService.flattenAnalysisResult(domResult);

    // RULE 2: Use helper method instead of duplicated processing logic
    PerformanceAnalysisHelpersService.processAnalysisResult(
      domViolations,
      issues,
      recommendations,
      this.Config.ISSUE_TYPES.DOM,
      this.Config.RECOMMENDATIONS.DOM
    );
  }

  static runEventListenerAnalysis(
    include: boolean,
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): void {
    if (!include) return;

    const eventResult = EventListenersAnalyzer.checkGlobalEventListeners([]);
    const eventViolations = eventResult.globalEventListeners ?? [];

    // RULE 2: Use helper method instead of duplicated processing logic
    PerformanceAnalysisHelpersService.processAnalysisResult(
      eventViolations,
      issues,
      recommendations,
      this.Config.ISSUE_TYPES.EVENTS,
      this.Config.RECOMMENDATIONS.EVENTS
    );
  }

  static runObservableAnalysis(
    include: boolean,
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): void {
    if (!include) return;

    const observableResult =
      ObservableSubscriptionsAnalyzer.checkObservableSubscriptions([]);
    // RULE 2: Use helper method instead of duplicated Object.values().flat()
    const observableViolations =
      PerformanceAnalysisHelpersService.flattenAnalysisResult(observableResult);

    // RULE 2: Use helper method instead of duplicated processing logic
    PerformanceAnalysisHelpersService.processAnalysisResult(
      observableViolations,
      issues,
      recommendations,
      this.Config.ISSUE_TYPES.OBSERVABLES,
      this.Config.RECOMMENDATIONS.OBSERVABLES
    );
  }

  static runTimerAnalysis(
    include: boolean,
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[]
  ): void {
    if (!include) return;

    const timerResult = TimerFunctionsAnalyzer.checkTimerFunctions([]);
    // RULE 2: Use helper method instead of duplicated Object.values().flat()
    const timerViolations =
      PerformanceAnalysisHelpersService.flattenAnalysisResult(timerResult);

    // RULE 2: Use helper method instead of duplicated processing logic
    PerformanceAnalysisHelpersService.processAnalysisResult(
      timerViolations,
      issues,
      recommendations,
      this.Config.ISSUE_TYPES.TIMERS,
      this.Config.RECOMMENDATIONS.TIMERS
    );
  }
}
