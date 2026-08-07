/**
 * No Method Calls In Templates Law
 * Angular re-evaluates every template expression on every change-detection cycle
 * (×every @for row). Calling a component METHOD in a binding/interpolation
 * re-runs it each tick — derived values must be computed() (cached), a pure pipe,
 * or precomputed on the model.
 *
 * RoC has no AST runtime dependency, so this cross-references the paired
 * `.component.ts` with regex: it extracts the component's reactive members
 * (signal/computed/input/model/toSignal/selectSignal/queries) and its method
 * names, then flags template calls that resolve to a KNOWN method. Unknown names
 * are never flagged (zero false positives). Event bindings `(click)="m()"` and
 * pipes are allowed.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';

export class NoMethodCallsInTemplatesLaw extends AngularLawBase {
  private static readonly CONTROL = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'return',
    'do',
    'function',
    'constructor',
  ]);

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    const allowlist = new Set<string>([
      '$any',
      ...(context.config.thresholds?.angular?.templateMethodAllowlist ?? []),
    ]);

    const templates = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['html'],
      context.config
    ).filter(f => /\.component\.html$/i.test(f.replace(/\\/g, '/')));

    for (const file of templates) {
      const tsPath = file.replace(/\.html$/i, '.ts');
      if (!FileUtils.exists(tsPath)) continue; // need the class to resolve callees
      const ts = this.stripTs(FileUtils.readFileContentSync(tsPath) ?? '');
      const methods = this.methodNames(ts);
      const reactive = this.reactiveNames(ts);
      if (methods.size === 0) continue;

      const html = FileUtils.readFile(file).replace(/<!--[\s\S]*?-->/g, ' ');
      const called = this.templateCallees(html);
      const flagged = [...called].filter(
        name =>
          methods.has(name) && !reactive.has(name) && !allowlist.has(name)
      );
      if (flagged.length > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: method call(s) in template — ${flagged
            .slice(0, 5)
            .map(n => `${n}()`)
            .join(', ')}. Move to computed(), a pure pipe, or precompute on the model (re-runs every CD cycle).`
        );
      }
    }

    return this.createResult(
      violations,
      'No Method Calls In Templates',
      'ANGULAR_LAW',
      [
        'Replace template method calls with computed() signals or pure pipes',
        'Precompute derived view data on the model',
      ],
      context
    );
  }

  private static stripTs(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  /** Reactive members: `name = signal(...)/computed(...)/input(...)/...`. */
  private static reactiveNames(ts: string): Set<string> {
    const names = new Set<string>();
    const re =
      /\b([A-Za-z_$][\w$]*)\s*=\s*(?:[\w$.]*\.)?(signal|computed|input|model|toSignal|toObservable|linkedSignal|viewChild|viewChildren|contentChild|contentChildren|selectSignal)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ts)) !== null) names.add(m[1] ?? '');
    return names;
  }

  /** Class method declarations: `name(args) {` / `name(args): T {`. */
  private static methodNames(ts: string): Set<string> {
    const names = new Set<string>();
    const re =
      /^[ \t]*(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?::\s*[^={;]+?)?\s*\{/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ts)) !== null) {
      const name = m[1] ?? '';
      if (!this.CONTROL.has(name)) names.add(name);
    }
    return names;
  }

  /** Callee names invoked inside interpolations / property+attr bindings. */
  private static templateCallees(html: string): Set<string> {
    const callees = new Set<string>();
    const exprs: string[] = [];
    // {{ interpolation }}
    for (const m of html.matchAll(/\{\{([\s\S]*?)\}\}/g)) exprs.push(m[1] ?? '');
    // [prop]="..." and [attr.x]="..." (NOT (event)="...")
    for (const m of html.matchAll(/\[[^\]]+\]\s*=\s*"([^"]*)"/g)) {
      exprs.push(m[1] ?? '');
    }
    for (const m of html.matchAll(/\[[^\]]+\]\s*=\s*'([^']*)'/g)) {
      exprs.push(m[1] ?? '');
    }
    for (const expr of exprs) {
      for (const c of expr.matchAll(/\b([a-z_$][\w$]*)\s*\(/g)) {
        callees.add(c[1] ?? '');
      }
    }
    return callees;
  }
}
