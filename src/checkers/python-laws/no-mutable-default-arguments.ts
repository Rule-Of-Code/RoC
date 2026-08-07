/**
 * No Mutable Default Arguments
 * A default argument is evaluated once, at definition time, so a mutable default
 * ([], {}, set()/list()/dict()) is shared across every call — a classic Python
 * bug that leaks state between invocations. Use None and create the value inside
 * the function.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoMutableDefaultArgumentsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Mutable Default Arguments';
  private static readonly DEF = /\bdef\s+(\w+)\s*\(/g;
  // A parameter default that is a fresh mutable: =[], ={}, =set()/list()/dict().
  private static readonly MUTABLE_DEFAULT =
    /=\s*(\[\s*\]|\{\s*\}|(?:set|list|dict)\s*\(\s*\))/;

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
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || !raw.includes('def ')) continue;
      const content = this.stripPython(raw);
      const rel = PathOperations.getRelative(projectRoot, file);

      this.DEF.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = this.DEF.exec(content)) !== null) {
        const open = m.index + m[0].length - 1; // index of "("
        const sig = this.readBalancedParens(content, open);
        if (sig === null) continue;
        if (this.MUTABLE_DEFAULT.test(sig)) {
          const line = content.slice(0, m.index).split('\n').length;
          violations.push(
            `${rel}:${line}: ${m[1]}() has a mutable default argument — use None and create the [] / {} inside the function (defaults are shared across calls)`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Default to None: def f(items: list[str] | None = None)',
        'Create the mutable value in the body: if items is None: items = []',
      ],
      context
    );
  }
}
