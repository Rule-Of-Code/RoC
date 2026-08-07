/**
 * Alias Repeated Template Expressions Law (advisory)
 * The same call-expression repeated many times in one template re-evaluates each
 * time and is harder to read. Above a configurable threshold (default 3), alias
 * it once with `@let` (Angular 20) or a computed().
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class AliasRepeatedTemplateExpressionsLaw extends AngularLawBase {
  // Simple (non-nested) call expression, e.g. isLong(h.side), summary().
  private static readonly CALL_EXPR = /\b[a-zA-Z_$][\w$.]*\([^()]*\)/g;
  // Interpolations `{{ … }}` and Angular binding values `[x]="…"` / `(x)="…"` —
  // the only places an Angular EXPRESSION lives. Scanning raw HTML also swept up
  // plain attributes and inline `style="…"`.
  private static readonly BINDINGS =
    /\{\{([^}]*)\}\}|[[(][^\])"']+[\])]\s*=\s*"([^"]*)"|[[(][^\])"']+[\])]\s*=\s*'([^']*)'/g;
  // CSS/SVG functions that look like calls but are not Angular expressions to
  // alias — the source of the url()/calc()/rgba() false positives.
  private static readonly CSS_FUNCTION =
    /^(?:url|calc|min|max|clamp|var|env|attr|rgb|rgba|hsl|hsla|hwb|translate|translateX|translateY|translateZ|translate3d|scale|scaleX|scaleY|scale3d|rotate|rotateX|rotateY|rotateZ|rotate3d|skew|skewX|skewY|matrix|matrix3d|perspective|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|cubic-bezier|steps|blur|brightness|contrast|drop-shadow|grayscale|invert|opacity|saturate|sepia)$/i;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    // Angular-gate: this is about Angular template expressions. On a non-Angular
    // project (a static site's .html) the whole scan was cross-stack noise.
    const early = this.createAngularRequiredResult(
      'Alias Repeated Template Expressions',
      projectRoot,
      root =>
        ProjectTypeDetector.isAngularProject(root) ||
        context.config.project?.type === 'angular',
      context
    );
    if (early) return early;

    const violations: string[] = [];
    const threshold =
      context.config.thresholds?.angular?.aliasRepeatedTemplateExprThreshold ??
      3;

    const templates = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      context.config
    );
    for (const file of templates) {
      const html = FileUtils.readFile(file).replace(/<!--[\s\S]*?-->/g, ' ');
      // Only the text inside interpolations / Angular bindings is an expression.
      const exprText = [...html.matchAll(this.BINDINGS)]
        .map(m => m[1] ?? m[2] ?? m[3] ?? '')
        .join(' ; ');
      const counts = new Map<string, number>();
      const matches = (exprText.match(this.CALL_EXPR) ?? []).filter(
        expr => !this.CSS_FUNCTION.test(expr.slice(0, expr.indexOf('(')))
      );
      for (const expr of matches) {
        counts.set(expr, (counts.get(expr) ?? 0) + 1);
      }
      const repeated = [...counts.entries()].filter(
        ([, n]) => n >= threshold
      );
      if (repeated.length > 0) {
        const list = repeated
          .map(([expr, n]) => `${expr} ×${n}`)
          .slice(0, 5)
          .join(', ');
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: repeated template expression(s) (${list}) — alias once with @let or a computed().`
        );
      }
    }

    return this.createResult(
      violations,
      'Alias Repeated Template Expressions',
      'ANGULAR_LAW',
      ['Alias a repeated expression with @let (Angular 20) or a computed()'],
      context
    );
  }
}
