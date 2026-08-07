/**
 * No Explicit Any / No Non-Null Assertion Law
 * `tsconfig` strict mode does NOT catch `any` or non-null `!` — they pass `tsc`.
 * This law forbids them in production code: model the real type or validate at the
 * boundary. (Specs/test-setup are exempt — casts/`!` are acceptable in tests.)
 *
 * NOTE: the empty-object `{}` type is intentionally NOT detected — a regex cannot
 * safely distinguish a `{}` type annotation from an object literal without an AST,
 * and false positives are unacceptable. ESLint's no-explicit-any covers it.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class NoExplicitAnyNonNullLaw extends CodeQualityLawBase {
  private static readonly ANY_PATTERNS: RegExp[] = [
    /:\s*any\b/g, // : any annotation
    /\bas\s+any\b/g, // as any
    /<any>/g, // <any> assertion / type arg (incl. Array<any>)
    /\bany\[\]/g, // any[]
    /:\s*Function\b/g, // weak Function type
    /:\s*Object\b/g, // weak Object type
  ];

  // Postfix non-null `!`: preceded by identifier/`)`/`]`, followed by member access
  // or a statement separator/whitespace. Excludes `!=`/`!==` and prefix logical `!`.
  private static readonly NON_NULL = /[\w$)\]]!(?=[.[)\];,}]|\s|$)/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = this.findTypeScriptFiles(projectRoot, context);
    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;

      const code = this.stripComments(content);
      const relativePath = PathOperations.getRelative(projectRoot, file);

      const anyCount = this.ANY_PATTERNS.reduce(
        (sum, pattern) => sum + (code.match(pattern)?.length ?? 0),
        0
      );
      if (anyCount > 0) {
        violations.push(
          `Explicit \`any\`/weak type in ${relativePath}: ${anyCount} occurrence(s) — model the real type or validate at the boundary.`
        );
      }

      const nonNullCount = code.match(this.NON_NULL)?.length ?? 0;
      if (nonNullCount > 0) {
        violations.push(
          `Non-null assertion \`!\` in ${relativePath}: ${nonNullCount} occurrence(s) — narrow the value with a guard instead of asserting.`
        );
      }
    }

    return this.createResult(
      violations,
      'No Explicit Any / Non-Null Assertion',
      'CODE_QUALITY_LAW',
      [
        'Replace `any`/`Function`/`Object` with precise types',
        'Replace non-null `!` with an explicit guard (if (x) { … })',
        'Set @typescript-eslint/no-explicit-any + no-non-null-assertion to error and run lint with --max-warnings 0',
      ],
      context
    );
  }
}
