/**
 * Public Docstrings
 * A public, module-level class or function is part of the package's API; a one-line
 * docstring states intent for readers and tooling. Scope is deliberately narrow
 * and advisory (info): module-level public symbols only, skipping private/dunder
 * names, @overload stubs, one-liners and test files — so it nudges without nagging.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class PublicDocstringsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Public Docstrings';
  private static readonly HEADER = /^(?:async\s+)?(class|def)\s+(\w+)/; // indent 0 only
  private static readonly DOCSTRING = /^[rRbBuUfF]{0,2}("""|'''|"|')/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      if (this.isTestFile(file)) continue;
      if (/(^|[\\/])__init__\.py$/.test(file.replace(/\\/g, '/'))) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const lines = this.splitLines(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectMissingDocstrings(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add a short docstring as the first statement of public modules/classes/functions',
        'Enable a docstring rule (ruff pydocstyle "D") to enforce it automatically',
      ],
      context
    );
  }

  /** Flags every public module-level def/class in the file whose body lacks a docstring. */
  private static collectMissingDocstrings(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const header = (lines[i] ?? '').match(this.HEADER);
      if (!header) continue; // not a module-level (indent 0) def/class
      const kind = header[1];
      const name = header[2] ?? '';
      if (name.startsWith('_')) continue; // private / dunder

      const sigEnd = this.findSignatureEnd(lines, i);
      if (sigEnd < 0) continue; // couldn't parse — don't risk a false positive

      // One-liner (e.g. `def f(): ...`) → nothing to document.
      const afterColon = this.afterLastColon(lines[sigEnd] ?? '');
      if (afterColon !== '') {
        i = sigEnd;
        continue;
      }
      if (this.hasOverloadDecorator(lines, i)) {
        i = sigEnd;
        continue;
      }

      const firstBody = (lines[this.firstBodyStatementIndex(lines, sigEnd)] ?? '').trim();
      if (!this.DOCSTRING.test(firstBody)) {
        violations.push(
          `${rel}:${i + 1}: public ${kind} ${name} has no docstring — add a one-line docstring describing its purpose`
        );
      }
      i = sigEnd;
    }
  }

  /** Index of the first real statement in the body (skip blanks and comment lines). */
  private static firstBodyStatementIndex(lines: string[], sigEnd: number): number {
    let k = sigEnd + 1;
    while (k < lines.length) {
      const t = (lines[k] ?? '').trim();
      if (t === '' || t.startsWith('#')) {
        k++;
        continue;
      }
      break;
    }
    return k;
  }

  /**
   * Index of the line where the def/class signature ends (parens balanced + `:`).
   * The trailing comment is stripped first, so a `# pragma: no cover` (or any
   * comment with brackets/colons) on the class/def line never corrupts the
   * bracket depth or the `:` detection.
   */
  private static findSignatureEnd(lines: string[], start: number): number {
    let depth = 0;
    for (let j = start; j < start + 40 && j < lines.length; j++) {
      const code = (lines[j] ?? '').replace(/#.*$/, '');
      for (const ch of code) {
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
      }
      if (depth <= 0 && code.trimEnd().endsWith(':')) return j;
    }
    return -1;
  }

  /** Text after the final top-level colon on a signature line (a one-liner body). */
  private static afterLastColon(line: string): string {
    const code = line.replace(/#.*$/, '');
    const idx = code.lastIndexOf(':');
    return idx < 0 ? '' : code.slice(idx + 1).trim();
  }

  private static hasOverloadDecorator(lines: string[], headerIdx: number): boolean {
    for (let k = headerIdx - 1; k >= 0; k--) {
      const prev = (lines[k] ?? '').trim();
      if (prev === '') continue;
      if (prev.startsWith('@')) {
        if (/@(typing\.)?overload\b/.test(prev)) return true;
        continue;
      }
      break;
    }
    return false;
  }
}
