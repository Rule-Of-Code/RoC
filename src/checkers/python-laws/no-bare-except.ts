/**
 * No Bare Except
 * A bare `except:` (or `except BaseException:`) catches everything, including
 * KeyboardInterrupt and SystemExit, so it swallows Ctrl-C and process shutdown
 * and hides real errors. Catch a specific exception type instead.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoBareExceptLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Bare Except';
  private static readonly BARE_EXCEPT = /^\s*except\s*:/;
  private static readonly BASE_EXCEPTION = /^\s*except\s+BaseException\s*(?:as\s+\w+\s*)?:/;

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
      if (!raw || !raw.includes('except')) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (this.BARE_EXCEPT.test(line)) {
          violations.push(
            `${rel}:${i + 1}: bare "except:" catches everything (incl. KeyboardInterrupt/SystemExit) — catch a specific exception type`
          );
        } else if (this.BASE_EXCEPTION.test(line)) {
          violations.push(
            `${rel}:${i + 1}: "except BaseException" catches KeyboardInterrupt/SystemExit — catch Exception or a specific type instead`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Catch the specific exception you expect (e.g. except ValueError)',
        'If you must catch broadly, use except Exception (not bare/BaseException) and re-raise or log',
      ],
      context
    );
  }
}
