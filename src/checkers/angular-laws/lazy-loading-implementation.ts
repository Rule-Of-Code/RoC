/**
 * Lazy Loading Implementation Law Implementation
 * Enforces proper lazy loading patterns for Angular modules and routes
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularBundleOptimizationAnalyzer } from '../../utils/angular/angular-bundle';
import { AngularLazyLoadingPatternsAnalyzer } from '../../utils/angular/angular-lazy-loading';
import { AngularRoutingConfigurationAnalyzer } from '../../utils/angular/angular-routing';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';

export class LazyLoadingImplementationLaw {
  private static readonly LAW_NAME = 'Lazy Loading Implementation';

  /** Route configuration in code: a Routes array, the router, a lazy route. */
  private static readonly ROUTE_CONFIG =
    /\bRoutes\b|\bRouterModule\b|\bprovideRouter\s*\(|\bloadChildren\b|\bloadComponent\b/;

  /** An Angular component, by its decorator. */
  private static readonly COMPONENT = /@Component\s*\(/;

  /**
   * Is there anything lazy loading can be judged on: route configuration or a
   * component? Read from the project's .ts files with comments removed.
   */
  private static hasRoutesOrComponents(context: LawCheckContext): boolean {
    const files = CheckerUtils.findFilesByExtension(
      context.projectRoot,
      ['.ts'],
      context.config
    );
    return files.some(file => {
      const code = FileUtils.readFile(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      return this.ROUTE_CONFIG.test(code) || this.COMPONENT.test(code);
    });
  }

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // No routes and no component: there is no lazy loading to judge, and a
    // green result would be a verdict without evidence (#562, #427).
    if (!this.hasRoutesOrComponents(context)) {
      const note = `${this.LAW_NAME} judged nothing: no route configuration (Routes, RouterModule, provideRouter, loadChildren, loadComponent) and no @Component in the code, so there is no lazy loading to judge`;
      return markJudgedNothing({
        passed: false,
        lawName: this.LAW_NAME,
        message: note,
        violations: [note],
        suggestions: [
          'Declare the law not applicable (laws.notApplicable) with a reason if this project has no routes and no components',
        ],
        score: 0,
        config: context.config,
      });
    }

    // Check for routing configuration using specialized utility
    const routingAnalysis =
      AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
        context.projectRoot,
        context.config
      );
    violations.push(...routingAnalysis.violations);
    suggestions.push(...routingAnalysis.suggestions);

    // Check for lazy loading patterns using specialized utility
    const lazyLoadingAnalysis =
      AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
        context.projectRoot,
        context.config
      );
    violations.push(...lazyLoadingAnalysis.violations);
    suggestions.push(...lazyLoadingAnalysis.suggestions);

    // Check for bundle optimization using specialized utility
    const bundleAnalysis =
      AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        context.projectRoot,
        context.config
      );
    violations.push(...bundleAnalysis.violations);
    suggestions.push(...bundleAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: this.LAW_NAME,
      message:
        violations.length === 0
          ? `${this.LAW_NAME} compliance verified`
          : `${violations.length} ${this.LAW_NAME} violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
