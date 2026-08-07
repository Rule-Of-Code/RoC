/**
 * Change Detection Optimization Law
 * CheckerUtils.findAngularFiles: Ensures optimal change detection strategy usage in Angular components
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { AngularComponentFiles } from '../../utils/angular-component-files';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PerformanceLawBase } from './performance-law-base';

export class ChangeDetectionOptimizationLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // CheckerUtils.findAngularFiles: Analyze components for change detection optimization
    const componentAnalysis = this.analyzeComponents(
      context.projectRoot,
      context.config
    );
    violations.push(...componentAnalysis.violations);
    suggestions.push(...componentAnalysis.suggestions);

    // Check for trackBy functions in ngFor
    const trackByAnalysis = this.analyzeTrackByUsage(
      context.projectRoot,
      context.config
    );
    violations.push(...trackByAnalysis.violations);
    suggestions.push(...trackByAnalysis.suggestions);

    // Check for proper Observables usage
    const observableAnalysis = this.analyzeObservableUsage(
      context.projectRoot,
      context.config
    );
    violations.push(...observableAnalysis.violations);
    suggestions.push(...observableAnalysis.suggestions);

    return PerformanceLawBase.createResult(
      violations,
      'Change Detection Optimization',
      'PERFORMANCE',
      suggestions,
      context
    );
  }

  /**
   * Helper method for component analysis with common initialization
   */
  private static performComponentAnalysis(
    projectRoot: string,
    config: RuleOfCodeConfig,
    analyzer: (componentFiles: string[]) => {
      violations: string[];
      suggestions: string[];
    }
  ): { violations: string[]; suggestions: string[] } {
    const componentFiles = this.getComponentFiles(projectRoot, config);

    if (componentFiles.length === 0) {
      return {
        violations: ['No Angular components found'],
        suggestions: ['Ensure Angular components exist in src/app directory'],
      };
    }

    return analyzer(componentFiles);
  }

  private static analyzeComponents(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return this.performComponentAnalysis(projectRoot, config, componentFiles =>
      this.processComponentFiles(componentFiles)
    );
  }

  private static processComponentFiles(componentFiles: string[]): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const componentsWithAsyncPipe: string[] = [];

    for (const componentFile of componentFiles) {
      const result = this.analyzeIndividualComponent(componentFile);

      if (result.error) {
        violations.push(`Could not analyze component: ${componentFile}`);
        continue;
      }

      if (result.hasAsyncPipe) {
        componentsWithAsyncPipe.push(result.componentName);
      }

      violations.push(...result.violations);
      suggestions.push(...result.suggestions);
    }

    this.addSummaryAnalysis({
      violations,
      suggestions,
      componentsWithAsyncPipe,
    });

    return { violations, suggestions };
  }

  private static analyzeIndividualComponent(componentFile: string): {
    componentName: string;
    hasAsyncPipe: boolean;
    violations: string[];
    suggestions: string[];
    error: boolean;
  } {
    try {
      const content = FileUtils.readFile(componentFile, { encoding: 'utf8' });
      const componentName = PathOperations.getBasename(componentFile);
      const violations: string[] = [];
      const suggestions: string[] = [];

      const hasOnPush = content.includes('ChangeDetectionStrategy.OnPush');
      const hasAsyncPipe = this.hasAsyncPipe(componentFile);

      this.checkManualChangeDetection(
        content,
        componentName,
        hasOnPush,
        violations,
        suggestions
      );
      this.checkNgDoCheck(content, componentName, violations, suggestions);

      return {
        componentName,
        hasAsyncPipe,
        violations,
        suggestions,
        error: false,
      };
    } catch (_error) {
      return {
        componentName: '',
        hasAsyncPipe: false,
        violations: [],
        suggestions: [],
        error: true,
      };
    }
  }

  private static checkManualChangeDetection(
    content: string,
    componentName: string,
    hasOnPush: boolean,
    violations: string[],
    suggestions: string[]
  ): void {
    const hasManualDetection =
      content.includes('detectChanges()') || content.includes('markForCheck()');

    if (hasManualDetection && !hasOnPush) {
      violations.push(
        `CheckerUtils.findAngularFiles: Manual change detection in component without OnPush: ${componentName}`
      );
      suggestions.push(
        `CheckerUtils.findAngularFiles: Use OnPush strategy in ${componentName} if manual change detection is needed`
      );
    }
  }

  private static checkNgDoCheck(
    content: string,
    componentName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (content.includes('ngDoCheck')) {
      violations.push(
        `ngDoCheck found in ${componentName} - can cause performance issues`
      );
      suggestions.push(
        `Consider alternatives to ngDoCheck in ${componentName} or use OnPush strategy`
      );
    }
  }

  private static addSummaryAnalysis(options: {
    violations: string[];
    suggestions: string[];
    componentsWithAsyncPipe: string[];
  }): void {
    const { suggestions, componentsWithAsyncPipe } = options;

    // OnPush checking is handled by OnPush Change Detection Law
    // This law focuses on trackBy and Observable optimizations

    if (componentsWithAsyncPipe.length > 0) {
      suggestions.push(
        `Good practice: Components using async pipe: ${componentsWithAsyncPipe.join(', ')}`
      );
    }
  }

  private static analyzeTrackByUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const templatesWithoutTrackBy = this.checkTrackByUsage(projectRoot, config);

    if (templatesWithoutTrackBy.length > 0) {
      violations.push(
        `Templates missing trackBy functions: ${templatesWithoutTrackBy.join(
          ', '
        )}`
      );
      suggestions.push(
        'Add trackBy functions to ngFor loops for better performance'
      );
      suggestions.push(
        'Example: *ngFor="let item of items; trackBy: trackByFn"'
      );
    }

    return { violations, suggestions };
  }

  private static analyzeObservableUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return this.performComponentAnalysis(
      projectRoot,
      config,
      componentFiles => {
        const violations: string[] = [];
        const suggestions: string[] = [];

        const componentsWithSubscriptions =
          this.checkObservableUsage(componentFiles);
        if (componentsWithSubscriptions.length > 0) {
          violations.push(
            `Components with manual subscriptions: ${componentsWithSubscriptions.join(
              ', '
            )}`
          );
          suggestions.push(
            'Use async pipe instead of manual subscriptions where possible'
          );
          suggestions.push(
            'Use async pipe instead of manual subscriptions where possible'
          );
          suggestions.push(
            'Implement OnDestroy to unsubscribe from Observables'
          );
        }

        return { violations, suggestions };
      }
    );
  }

  private static getComponentFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // By @Component decorator, not the *.component.ts filename — an Angular-20
    // app whose components are suffix-less (home.ts) was reported as having "No
    // Angular components found" and false-warned.
    return AngularComponentFiles.find(projectRoot, config);
  }

  // shouldComponentUseOnPush removed - OnPush detection handled by OnPush Change Detection Law

  private static hasAsyncPipe(componentPath: string): boolean {
    const templatePath = componentPath.replace(
      '.component.ts',
      '.component.html'
    );

    if (FileUtils.exists(templatePath)) {
      try {
        const templateContent = FileUtils.readFile(templatePath, {
          encoding: 'utf8',
        });
        return templateContent.includes('| async');
      } catch (_error) {
        return false;
      }
    }

    return false;
  }

  private static checkTrackByUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const templatesWithoutTrackBy: string[] = [];

    // Use CheckerUtils to find HTML template files with proper ignore handling
    const templateFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.html'],
      config
    );

    for (const templateFile of templateFiles) {
      const basename = this.analyzeTemplateForTrackBy(
        templateFile,
        templatesWithoutTrackBy
      );
      if (basename) {
        templatesWithoutTrackBy.push(basename);
      }
    }

    return templatesWithoutTrackBy;
  }

  private static analyzeTemplateForTrackBy(
    templateFile: string,
    existingViolations: string[]
  ): string | null {
    try {
      const content = FileUtils.readFile(templateFile, { encoding: 'utf8' });
      const basename = PathOperations.getBasename(templateFile);

      // Ignore .old backup files
      if (basename.includes('.old.')) {
        return null;
      }

      // Remove all HTML comments first to avoid false positives from comments
      const contentWithoutComments = content.replace(/<!--[\s\S]*?-->/g, '');

      // Check for legacy *ngFor without trackBy
      if (this.hasLegacyNgForWithoutTrackBy(contentWithoutComments)) {
        return basename;
      }

      // Check for modern @for without track expression
      if (
        this.hasModernForWithoutTrack(contentWithoutComments) &&
        !existingViolations.includes(basename)
      ) {
        return basename;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  private static hasLegacyNgForWithoutTrackBy(content: string): boolean {
    return content.includes('*ngFor') && !content.includes('trackBy');
  }

  private static hasModernForWithoutTrack(content: string): boolean {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      const line = currentLine.trim();

      // Skip JS comments (if template contains inline scripts)
      if (line.startsWith('//')) {
        continue;
      }

      // Check if line contains @for ( - actual loop syntax
      if (line.includes('@for (')) {
        // Look for track keyword in this line and next few lines (multi-line @for)
        const contextLines = lines
          .slice(i, Math.min(i + 3, lines.length))
          .join(' ');

        // Must contain both @for and track
        if (
          contextLines.includes('@for (') &&
          !contextLines.includes('track')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Blank out comments (newlines kept) — a comment that merely MENTIONS
   * `.subscribe()`, e.g. "use the async pipe instead of a manual .subscribe()",
   * is documentation, not a subscription (FE).
   */
  private static stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '));
  }

  /**
   * A subscription that is cancelled on destroy is CORRECT, not a finding.
   * `takeUntilDestroyed(destroyRef)` and `takeUntil(destroy$)` are the modern
   * Angular way; flagging them pushes teams toward `firstValueFrom`, which does
   * NOT cancel on destroy — that would be a regression, not an improvement (FE).
   */
  private static readonly CLEANED_UP =
    /takeUntilDestroyed\s*\(|takeUntil\s*\(|DestroyRef\b|toSignal\s*\(|OnDestroy\b|\.unsubscribe\s*\(|\|\s*async\b/;

  private static checkObservableUsage(componentFiles: string[]): string[] {
    const componentsWithSubscriptions: string[] = [];

    for (const file of componentFiles) {
      try {
        const raw = FileUtils.readFile(file, { encoding: 'utf8' });
        const content = this.stripComments(raw);
        const componentName = PathOperations.getBasename(file);

        // A manual subscription with no cancellation path is the finding.
        if (content.includes('.subscribe(') && !this.CLEANED_UP.test(content)) {
          componentsWithSubscriptions.push(componentName);
        }
      } catch (_error) {
        continue;
      }
    }

    return componentsWithSubscriptions;
  }
}
