/**
 * Base for the FE architecture laws (from the frontend architecture audit).
 * Extends AngularLawBase (project gating + createResult) with small balanced-
 * delimiter readers used by the regex heuristics. These are Angular laws:
 * detection is regex/string on .ts/.html/.scss (RoC has no AST).
 */

import { AngularLawBase } from '../angular-laws/angular-law-base';

export class FeArchLawBase extends AngularLawBase {
  /** Whether a path is in the feature or data-access layer. */
  protected static isFeatureOrDataAccess(normalizedPath: string): boolean {
    return (
      /\/feature[^/]*\//.test(normalizedPath) ||
      /\/data-access\//.test(normalizedPath)
    );
  }

  /** Text inside the `(...)` starting at index `open` (a `(`), handling nesting. */
  protected static readParens(s: string, open: number): string | null {
    return this.readBalanced(s, open, '(', ')');
  }

  /** Text inside the `{...}` starting at index `open` (a `{`), handling nesting. */
  protected static readBraces(s: string, open: number): string | null {
    return this.readBalanced(s, open, '{', '}');
  }

  private static readBalanced(
    s: string,
    open: number,
    o: string,
    c: string
  ): string | null {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === o) depth++;
      else if (s[i] === c) {
        depth--;
        if (depth === 0) return s.slice(open + 1, i);
      }
    }
    return null;
  }
}
