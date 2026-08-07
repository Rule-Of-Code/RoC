/**
 * Angular Lifecycle Management Law Implementation
 * Ensures proper usage of Angular lifecycle hooks and cleanup patterns
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularCleanupPatternsAnalyzer } from '../../utils/angular/angular-cleanup';
import { AngularLifecycleHooksAnalyzer } from '../../utils/angular/angular-lifecycle';
import { AngularOnDestroyImplementationAnalyzer } from '../../utils/angular/angular-ondestroy';

export class AngularLifecycleManagementLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check lifecycle hook implementation using specialized utility
    const lifecycleAnalysis = AngularLifecycleHooksAnalyzer.checkLifecycleHooks(
      context.projectRoot,
      context.config
    );
    violations.push(...lifecycleAnalysis.violations);
    suggestions.push(...lifecycleAnalysis.suggestions);

    // Check for proper cleanup patterns using specialized utility
    const cleanupAnalysis = AngularCleanupPatternsAnalyzer.checkCleanupPatterns(
      context.projectRoot,
      context.config
    );
    violations.push(...cleanupAnalysis.violations);
    suggestions.push(...cleanupAnalysis.suggestions);

    // Check for OnDestroy implementation using specialized utility
    const onDestroyAnalysis =
      AngularOnDestroyImplementationAnalyzer.checkOnDestroyImplementation(
        context.projectRoot,
        context.config
      );
    violations.push(...onDestroyAnalysis.violations);
    suggestions.push(...onDestroyAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Angular Lifecycle Management',
      message:
        violations.length === 0
          ? 'Angular Lifecycle Management compliance verified'
          : `${violations.length} Angular Lifecycle Management violations found`,
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
