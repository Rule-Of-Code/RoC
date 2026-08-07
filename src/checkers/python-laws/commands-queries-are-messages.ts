/**
 * Commands And Queries Are Data Messages (CQRS)
 * A command or query is an immutable intent/message, carried by a handler that
 * holds the behaviour. So a class named `*Command` / `*Query` should be a data
 * structure — a (frozen) dataclass, a Pydantic model, a NamedTuple or msgspec
 * Struct — not a plain behaviour class. Keeping them as data makes them trivially
 * serialisable, comparable and testable (akin to NgRx actions being plain
 * objects).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class CommandsQueriesAreMessagesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Commands And Queries Are Messages';
  // Class whose name ends in Command/Query (handlers end in Handler → excluded
  // by the word boundary). Captures name and the base-class list (if any).
  private static readonly MSG_CLASS =
    /^(\s*)class\s+(\w+(?:Command|Query))\b\s*(?:\(([^)]*)\))?\s*:/;
  private static readonly DTO_DECORATOR =
    /@(?:dataclass|attr\.s|attrs|define|frozen|pydantic\.dataclasses\.dataclass)/;
  private static readonly DTO_BASE =
    /\b(BaseModel|NamedTuple|TypedDict|Struct|msgspec\.Struct)\b/;

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
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectPlainMessageClasses(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Define commands/queries as @dataclass(frozen=True) or Pydantic models',
        'Keep behaviour in the handler; the command/query is just data',
      ],
      context
    );
  }

  /** Flags every *Command / *Query class in the file that is not a DTO. */
  private static collectPlainMessageClasses(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const m = (lines[i] ?? '').match(this.MSG_CLASS);
      if (!m) continue;
      const name = m[2] ?? '';
      const bases = m[3] ?? '';

      if (this.DTO_BASE.test(bases)) continue; // Pydantic/NamedTuple/... DTO
      if (this.hasDtoDecoratorAbove(lines, i)) continue;

      violations.push(
        `${rel}:${i + 1}: ${name} is a plain class — make commands/queries immutable data messages (@dataclass(frozen=True), Pydantic model, or NamedTuple)`
      );
    }
  }

  /** Look upward over decorator lines for a dataclass/attrs decorator. */
  private static hasDtoDecoratorAbove(lines: string[], classLine: number): boolean {
    for (let k = classLine - 1; k >= 0; k--) {
      const prev = (lines[k] ?? '').trim();
      if (prev === '') continue;
      if (prev.startsWith('@')) {
        if (this.DTO_DECORATOR.test(prev)) return true;
        continue; // another decorator — keep scanning up
      }
      break; // non-decorator, non-blank line → stop
    }
    return false;
  }
}
