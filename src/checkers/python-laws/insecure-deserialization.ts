/**
 * No Insecure Deserialization
 * pickle/cPickle/marshal and yaml.load (without SafeLoader) reconstruct arbitrary
 * objects and can execute code while parsing untrusted data. Use a safe format
 * (JSON) or the safe API (yaml.safe_load / yaml.load(..., Loader=SafeLoader)).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class InsecureDeserializationLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Insecure Deserialization';
  private static readonly PICKLE = /\b(c?_?[Pp]ickle|marshal)\.loads?\s*\(/g;
  private static readonly YAML_LOAD = /\byaml\.load\s*\(/g;

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
      if (!/pickle|marshal|yaml\.load/.test(content)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);

      let m: RegExpExecArray | null;
      this.PICKLE.lastIndex = 0;
      while ((m = this.PICKLE.exec(content)) !== null) {
        violations.push(
          `${rel}:${this.lineOf(content, m.index)}: ${m[1]} deserialization can execute arbitrary code — use JSON, or only deserialize trusted, signed data`
        );
      }

      this.YAML_LOAD.lastIndex = 0;
      while ((m = this.YAML_LOAD.exec(content)) !== null) {
        const open = this.YAML_LOAD.lastIndex - 1; // index of "("
        const args = this.readBalancedParens(content, open);
        const safe =
          args !== null && /SafeLoader|CSafeLoader|Loader\s*=\s*\w*Safe/.test(args);
        if (!safe) {
          violations.push(
            `${rel}:${this.lineOf(content, m.index)}: yaml.load() without SafeLoader can execute arbitrary code — use yaml.safe_load() or Loader=SafeLoader`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Prefer JSON; never unpickle data from an untrusted source',
        'Use yaml.safe_load() (or yaml.load(..., Loader=SafeLoader))',
      ],
      context
    );
  }
}
