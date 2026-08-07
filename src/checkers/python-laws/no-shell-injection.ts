/**
 * No Shell Injection
 * Running a command through a shell (subprocess(..., shell=True), os.system,
 * os.popen) means any interpolated value can inject extra commands. Pass an
 * argument list and let the OS exec the program directly (shell=False, the
 * default), so arguments are never re-parsed by a shell.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoShellInjectionLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Shell Injection';
  private static readonly SUBPROCESS =
    /\bsubprocess\.(run|call|check_call|check_output|Popen)\s*\(/g;
  private static readonly OS_SHELL = /\bos\.(system|popen)\s*\(/g;

  private static lineOf(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

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
      if (!raw) continue;
      const content = this.stripPython(raw);
      if (!/subprocess|os\.system|os\.popen/.test(content)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);

      let m: RegExpExecArray | null;
      this.SUBPROCESS.lastIndex = 0;
      while ((m = this.SUBPROCESS.exec(content)) !== null) {
        const args = this.readBalancedParens(content, this.SUBPROCESS.lastIndex - 1);
        if (args !== null && /\bshell\s*=\s*True\b/.test(args)) {
          violations.push(
            `${rel}:${this.lineOf(content, m.index)}: subprocess.${m[1]}(..., shell=True) is a shell-injection risk — pass an argument list and use the default shell=False`
          );
        }
      }

      this.OS_SHELL.lastIndex = 0;
      while ((m = this.OS_SHELL.exec(content)) !== null) {
        violations.push(
          `${rel}:${this.lineOf(content, m.index)}: os.${m[1]}() runs a command through the shell — use subprocess with an argument list (shell=False) instead`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Pass args as a list: subprocess.run(["git", "status"]) with shell=False (default)',
        'Avoid os.system/os.popen; never interpolate untrusted input into a shell string',
      ],
      context
    );
  }
}
