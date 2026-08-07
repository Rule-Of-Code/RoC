/**
 * Angular Signal Adoption Law Implementation
 * Enforces usage of Angular Signals for reactive state management
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularSignalImportsAnalyzer } from '../../utils/angular/angular-signal-imports';
import { AngularSignalUsageAnalyzer } from '../../utils/angular/angular-signal-usage';
import { AngularSignalPatternsAnalyzer } from '../../utils/angular/angular-signals';

export class AngularSignalAdoptionLaw {
  private static readonly COMPONENT_STATE_SUBJECT =
    /\b(?:private|public|protected|readonly)\s+[\w$]+\s*=\s*new\s+(?:Behavior)?Subject\s*[<(]/;
  private static readonly SIGNAL_USE =
    /\b(?:signal|computed|input|model|toSignal|linkedSignal)\s*[<(]/;

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Enforcement (opt-out via config): component-local state held in a
    // Subject/BehaviorSubject should be a signal on Angular 16+. Kept separate
    // from the advisory analyzers below (which only emit suggestions) and scoped
    // to components to avoid flagging legitimate service/stream usage.
    violations.push(...this.detectComponentStateSubjects(context));

    // Check for Signal usage in components using specialized utility
    const signalUsageAnalysis = AngularSignalUsageAnalyzer.checkSignalUsage(
      context.projectRoot,
      context.config
    );
    violations.push(...signalUsageAnalysis.violations);
    suggestions.push(...signalUsageAnalysis.suggestions);

    // Check for proper Signal patterns using specialized utility
    const patternsAnalysis = AngularSignalPatternsAnalyzer.checkSignalPatterns(
      context.projectRoot,
      context.config
    );
    violations.push(...patternsAnalysis.violations);
    suggestions.push(...patternsAnalysis.suggestions);

    // Check for Signal imports and configuration using specialized utility
    const importsAnalysis = AngularSignalImportsAnalyzer.checkSignalImports(
      context.projectRoot,
      context.config
    );
    violations.push(...importsAnalysis.violations);
    suggestions.push(...importsAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Angular Signal Adoption',
      message:
        violations.length === 0
          ? 'Angular Signal Adoption compliance verified'
          : `${violations.length} Angular Signal Adoption violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }

  /**
   * Flag Subject/BehaviorSubject used for component-local state in
   * *.component.ts files, on Angular 16+ projects, when the component uses no
   * signals. Opt-out via thresholds.angular.enforceSignalsForComponentState.
   */
  private static detectComponentStateSubjects(
    context: LawCheckContext
  ): string[] {
    const { projectRoot, config } = context;
    if (config.thresholds?.angular?.enforceSignalsForComponentState === false) {
      return [];
    }
    if (!this.isAngular16Plus(projectRoot)) return [];

    const violations: string[] = [];
    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.component.ts'],
      config
    );
    for (const file of files) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const content = raw
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      if (
        this.COMPONENT_STATE_SUBJECT.test(content) &&
        !this.SIGNAL_USE.test(content)
      ) {
        violations.push(
          `${PathOperations.getRelative(
            projectRoot,
            file
          )}: component-local state held in a Subject/BehaviorSubject — use a signal() (Angular 16+).`
        );
      }
    }
    return violations;
  }

  /** True when @angular/core is >= 16 (signals are available). */
  private static isAngular16Plus(projectRoot: string): boolean {
    try {
      const pkgPath = PathOperations.join(projectRoot, 'package.json');
      const raw = FileUtils.readFileContentSync(pkgPath);
      if (!raw) return false;
      const pkg = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const ver =
        pkg.dependencies?.['@angular/core'] ??
        pkg.devDependencies?.['@angular/core'];
      if (!ver) return false;
      const major = parseInt(ver.replace(/[^\d.]/g, '').split('.')[0] ?? '0', 10);
      return major >= 16;
    } catch {
      return false;
    }
  }
}
