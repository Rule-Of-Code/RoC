/**
 * XSS Prevention Law — the DOM sinks.
 *
 * Flags each place code writes markup or code into the page: an `innerHTML` /
 * `outerHTML` assignment, `insertAdjacentHTML`, `document.write`, `eval`,
 * Angular's `bypassSecurityTrust*` and the `[innerHTML]` template binding. One
 * sink is one violation, with its line.
 *
 * An HTML sink whose value is passed through a sanitizer IN THE SAME
 * STATEMENT is not flagged: `el.innerHTML = DOMPurify.sanitize(html)`. The
 * sanitizer is judged at the sink — a sanitizer imported somewhere else in the
 * repository protects nothing here. `eval` is always flagged: no sanitizer
 * makes it safe.
 *
 * The matches are case-sensitive and anchored on the property access, so
 * React's `dangerouslySetInnerHTML` is NOT read as an `innerHTML` assignment
 * and `retrieval(` is not `eval(`. React's sink has its own law
 * (react-dangerous-html-guarded), which judges the `__html` value on the
 * syntax tree. The Content-Security-Policy is judged by its own law
 * (ContentSecurityPolicyLaw), so one defect never produces two results.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { SecurityLawBase } from './security-law-base';

interface Sink {
  name: string;
  pattern: RegExp;
  /** Whether a sanitizer at the sink makes it safe (HTML sinks yes, eval no). */
  sanitizable: boolean;
}

const SINKS: Sink[] = [
  { name: 'innerHTML/outerHTML assignment', pattern: /\.(?:inner|outer)HTML\s*\+?=(?!=)/g, sanitizable: true },
  { name: 'insertAdjacentHTML', pattern: /\.insertAdjacentHTML\s*\(/g, sanitizable: true },
  { name: 'document.write', pattern: /\bdocument\.write(?:ln)?\s*\(/g, sanitizable: true },
  { name: 'bypassSecurityTrust*', pattern: /\bbypassSecurityTrust(?:Html|Script|Style|Url|ResourceUrl)\s*\(/g, sanitizable: true },
  // The Angular BINDING — the `=` is required: a bare `[innerHTML]` with no
  // assignment is a mention (a doc string, prose), never a real binding.
  { name: '[innerHTML] binding', pattern: /\[innerHTML\]\s*=/g, sanitizable: true },
  { name: 'eval', pattern: /(?<![\w$])eval\s*\(/g, sanitizable: false },
];

/** Sanitizers recognised without configuration, as callee text. */
export const DEFAULT_HTML_SANITIZERS = ['DOMPurify.sanitize'];

/** Angular's DomSanitizer.sanitize(SecurityContext.HTML, value). */
const ANGULAR_SANITIZE = /\.sanitize\s*\(\s*SecurityContext\.HTML\b/;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comments blanked to spaces, newlines kept — line numbers stay true. */
function blankComments(content: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');
  return content
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(^|[^:\\])(\/\/[^\n]*)/g, (_m, lead: string, comment: string) => lead + blank(comment));
}

/** The configured sanitizers plus the defaults, as callee text. */
export function htmlSanitizers(context: LawCheckContext): string[] {
  const configured = context.config.thresholds?.security?.htmlSanitizers ?? [];
  return [...DEFAULT_HTML_SANITIZERS, ...configured.filter(name => typeof name === 'string' && name.trim())];
}

export class XSSPreventionLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const sanitizers = htmlSanitizers(context).map(
      name => new RegExp(`(?<![\\w$.])${escapeRegExp(name)}\\s*\\(`)
    );
    const sanitizedAt = (statement: string): boolean =>
      ANGULAR_SANITIZE.test(statement) || sanitizers.some(re => re.test(statement));

    for (const file of this.getSourceFiles(context)) {
      const code = blankComments(FileUtils.readFile(file) ?? '');
      const rel = PathOperations.getRelative(context.projectRoot, file);
      for (const sink of SINKS) {
        violations.push(...this.unsanitized(code, rel, sink, sanitizedAt));
      }
    }

    return SecurityLawBase.createResult(
      violations,
      'XSS Prevention Policy',
      'SECURITY',
      violations.length > 0
        ? [
            'Render text with textContent / interpolation instead of writing HTML',
            'Where HTML must be rendered, sanitize it at the sink: DomSanitizer.sanitize(SecurityContext.HTML, v) or DOMPurify.sanitize(v); name other sanitizers in thresholds.security.htmlSanitizers',
          ]
        : [],
      context
    );
  }

  /** One violation per occurrence of `sink` in `code` that is not sanitized at the sink. */
  private static unsanitized(
    code: string,
    rel: string,
    sink: Sink,
    sanitizedAt: (statement: string) => boolean
  ): string[] {
    const found: string[] = [];
    sink.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = sink.pattern.exec(code)) !== null) {
      if (sink.sanitizable && sanitizedAt(this.statementFrom(code, match.index))) continue;
      const line = code.slice(0, match.index).split('\n').length;
      found.push(
        sink.sanitizable
          ? `XSS risk in ${rel}:${line}: ${sink.name} not sanitized at the sink — render text instead, or pass the value through a sanitizer in the same statement`
          : `XSS risk in ${rel}:${line}: ${sink.name} executes a string as code — no sanitizer makes it safe; remove it`
      );
    }
    return found;
  }

  /** The rest of the statement a sink starts: up to `;`, or the end of the line. */
  private static statementFrom(code: string, index: number): string {
    const end = code.slice(index).search(/;|\n/);
    return end === -1 ? code.slice(index) : code.slice(index, index + end);
  }

  private static getSourceFiles(context: LawCheckContext): string[] {
    const { projectRoot, config, lawId } = context;
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.tsx', '.jsx', '.html'],
      config,
      lawId
    );
  }
}
