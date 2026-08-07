/**
 * No Silent Exception Swallowing
 * A typed except whose body is only pass/continue/return (no logging, no
 * re-raise) swallows failures invisibly — the "position stayed open with no
 * recovery" bug class. Extends No Bare Except (211), which only catches the
 * bare `except:` form; `except Exception: pass` passes it today.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoSilentExceptionSwallowingLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Silent Exception Swallowing';
  // Typed except only — the bare `except:` belongs to No Bare Except (211).
  private static readonly TYPED_EXCEPT = /^(\s*)except\s+[^:]+:\s*$/;
  private static readonly SILENT_STMT = /^(pass|continue|return(\s+None)?)\s*$/;
  private static readonly HANDLES = /\b(log|logger|logging|warn|raise)\b/i;

  /** True when the except body (more-indented lines) only silences. */
  private static bodySilences(lines: string[], headerIdx: number, indent: string): boolean {
    const body: string[] = [];
    for (let j = headerIdx + 1; j < lines.length; j++) {
      const line = lines[j] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = line.match(/^\s*/)?.[0] ?? '';
      if (lineIndent.length <= indent.length) break;
      body.push(line.trim());
    }
    if (body.length === 0) return false;
    return (
      body.every(stmt => this.SILENT_STMT.test(stmt)) &&
      !body.some(stmt => this.HANDLES.test(stmt))
    );
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      const lines = this.stripPython(raw).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = this.TYPED_EXCEPT.exec(lines[i] ?? '');
        if (!m) continue;
        if (this.bodySilences(lines, i, m[1] ?? '')) {
          violations.push(
            `${rel}:${i + 1}: exception swallowed silently (body is only pass/continue/return) — log it or re-raise`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'At minimum log the exception with context; usually re-raise or convert it',
        'If suppression is genuinely intended, make it loud: log + comment why',
      ],
      context
    );
  }
}
