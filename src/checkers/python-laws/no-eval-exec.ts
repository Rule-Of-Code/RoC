/**
 * No eval() / exec()
 * eval()/exec() run arbitrary code; on any attacker-influenced input they are a
 * remote-code-execution hole. There is almost always a safe alternative
 * (ast.literal_eval for data, a dispatch dict for behaviour, getattr for lookup).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoEvalExecLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Eval Or Exec';
  // Bare eval(/exec( — not a method call (.eval) and not ast.literal_eval
  // (preceded by a word char, so excluded by the lookbehind).
  private static readonly EVAL_EXEC = /(?<![.\w])(eval|exec)\s*\(/;

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
      if (!raw || (!raw.includes('eval') && !raw.includes('exec'))) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);

      for (let i = 0; i < lines.length; i++) {
        const m = (lines[i] ?? '').match(this.EVAL_EXEC);
        if (m) {
          violations.push(
            `${rel}:${i + 1}: ${m[1]}() executes arbitrary code — use ast.literal_eval for data or a dispatch table/getattr for behaviour`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Parse data with ast.literal_eval (not eval)',
        'Replace exec/eval with a dispatch dict or getattr lookup',
      ],
      context
    );
  }
}
