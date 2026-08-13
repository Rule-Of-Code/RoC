/**
 * Magic Number Prevention Law
 * Prevents use of magic numbers and promotes named constants
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class MagicNumberPreventionLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for magic number detection configuration
    const configAnalysis = this.checkMagicNumberConfig(context.projectRoot);
    violations.push(...configAnalysis.violations);
    suggestions.push(...configAnalysis.suggestions);

    // Analyze code for magic numbers
    const magicNumberAnalysis = this.analyzeMagicNumbers(
      context.projectRoot,
      context.config,
      context.lawId
    );
    violations.push(...magicNumberAnalysis.violations);
    suggestions.push(...magicNumberAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'No magic numbers detected'
          : `${violations.length} magic number violations found`,
      violations,
      suggestions: violations.length > 0 ? suggestions : [],
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 8),
      fixable: violations.length > 0,
      config: context.config,
    };
  }

  private static checkMagicNumberConfig(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const eslintConfig = this.findESLintConfig(projectRoot);
    if (eslintConfig) {
      const rules = eslintConfig.rules ?? {};
      if (
        !(rules as Record<string, unknown>)['no-magic-numbers'] &&
        !(rules as Record<string, unknown>)[
          '@typescript-eslint/no-magic-numbers'
        ]
      ) {
        violations.push('ESLint magic numbers rule not configured');
        suggestions.push('Configure @typescript-eslint/no-magic-numbers rule');
      }
    } else {
      suggestions.push('Configure ESLint with magic number detection');
    }

    return { violations, suggestions };
  }

  private static analyzeMagicNumbers(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const codeFiles = MagicNumberPreventionLaw.findCodeFilesForAnalysis(
      projectRoot,
      { projectRoot, config, lawId } as LawCheckContext
    );
    let magicNumberFiles = 0;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const magicNumbers = this.findMagicNumbers(content);

        if (magicNumbers.length > 0) {
          magicNumberFiles++;
          const relativePath = PathOperations.getRelative(projectRoot, file);
          // Cap the listed numbers so a file with many literals produces a readable
          // message instead of a wall of digits. This is display-only — it's still
          // ONE violation per file, so score/violation count are unaffected.
          const maxShown = 5;
          const shown = magicNumbers.slice(0, maxShown);
          const extra = magicNumbers.length - shown.length;
          violations.push(
            `Magic numbers in ${relativePath}: ${shown.join(', ')}${
              extra > 0 ? ` (+${extra} more)` : ''
            }`
          );
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (magicNumberFiles > 0) {
      suggestions.push('Replace magic numbers with named constants');
      suggestions.push('Create a constants file for shared numeric values');
      suggestions.push('Use enums for related magic numbers');
    }

    return { violations, suggestions };
  }

  private static findMagicNumbers(content: string): string[] {
    const magicNumbers: string[] = [];

    // Ignore common acceptable numbers
    const acceptableNumbers = new Set([
      '0',
      '1',
      '-1',
      '2',
      '10',
      '100',
      '1000',
    ]);

    // Strip comments first — a "magic number" is a numeric LITERAL in code logic,
    // not a number that happens to appear in a `// … 400 …` comment or JSDoc. The
    // old scan ran over raw text and flagged comment digits as violations.
    const code = this.stripComments(content);

    // Find numeric literals that aren't in the acceptable list. Match a full
    // literal INCLUDING a decimal, so `0.25` is one number, not the fraction
    // `25`. Splitting the decimal both misreported the value and broke the
    // named-constant exemption below — the `0.` left of `25` hid the `= ` anchor,
    // so `const SEAL_THRESHOLD = 0.25` was flagged as a magic number.
    const numberRegex = /\b\d+\.\d+\b|\b\d{2,}\b/g;
    let match;

    while ((match = numberRegex.exec(code)) !== null) {
      const number = match[0];
      if (acceptableNumbers.has(number)) {
        continue;
      }

      // Named-constant declaration: is THIS literal the RHS of
      // `const/let/var/readonly NAME = `? Anchored to the text immediately before
      // the number on its own line, so (a) a long SCREAMING_CASE name can't push
      // the keyword out of a fixed window, and (b) a declaration elsewhere on the
      // line can't exempt an unrelated inline literal. Giving a literal a name IS
      // the fix for a magic number, so never flag the literal in its own decl.
      const lineStart = code.lastIndexOf('\n', match.index) + 1;
      const leftOfNumber = code.substring(lineStart, match.index);
      if (
        /\b(?:const|let|var|readonly)\s+[A-Za-z_$][\w$]*\s*=\s*-?$/.test(
          leftOfNumber
        )
      ) {
        continue;
      }

      // Other heuristics use a TIGHT window around the literal so loose tokens
      // elsewhere on the line — e.g. "exPORT" matching /port.*\d+/i, a stray "ms" —
      // cannot falsely exempt an unrelated number.
      const context = code.substring(
        Math.max(0, match.index - 10),
        match.index + number.length + 10
      );
      if (!this.isAcceptableContext(context, number)) {
        magicNumbers.push(number);
      }
    }

    return Array.from(new Set(magicNumbers));
  }

  // stripComments() is inherited from CodeQualityLawBase (shared by TS-safety laws).

  private static isAcceptableContext(
    context: string,
    _number: string
  ): boolean {
    // (Named-constant declarations — `const NAME = <literal>` — are handled
    // precisely in findMagicNumbers via a left-anchored check on the literal.)

    // Check for property assignments in const objects
    if (/[A-Z_]+:\s*\d+/.test(context)) {
      return true;
    }

    // CSS / Tailwind utility class fragments: bg-neutral-950, text-gray-700,
    // gap-4, grid-cols-12, z-50. The number trails a hyphenated class token with
    // NO spaces around the hyphen, which distinguishes a shade/scale value from
    // arithmetic (`a - 500`, which is spaced or operand-separated).
    if (/[A-Za-z]-\d/.test(context)) {
      return true;
    }

    // Check for version numbers, dates, ports, etc.
    const acceptablePatterns = [
      /version.*\d+\.\d+/i,
      /\d+\.\d+\.\d+/, // Semantic version
      // Word-bounded: `/port/i` alone also matched exPORT, imPORT and supPORT,
      // which is why the window around the literal had to be kept tight rather
      // than the pattern made correct.
      /\bport\b.*\d+/i,
      /timeout.*\d+/i,
      /delay.*\d+/i,
      /duration.*\d+/i,
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}/, // Dates
      // The TIME half of an ISO 8601 datetime. The date pattern above exempts
      // `2026-08-15` and, because the window is only searched, the hour that
      // follows the `T` — but the minute and second sit past it with nothing
      // on either side to match, so `:30:00` reported `30` and `00` as magic
      // numbers. Splitting a datetime literal into named per-component
      // constants is not a readability gain; it is standard syntax.
      /\d{1,2}:\d{2}(?::\d{2})?/, // Times, including the HH:MM:SS of an ISO datetime
      // A port in a URL. `/http.*:\d+/` alone needs the scheme inside the ±10
      // character window, which it usually is not — `'http://host:8080'` puts
      // it out of reach. That case was passing only because the old, too-broad
      // time-unit pattern matched the `s` in "host"; narrowing that one exposed
      // this. The authority is the `//` before the authority component.
      /http.*:\d+/,
      // `host:port` followed by a path or the end of the string. The scheme is
      // usually outside the ±10 character window — `'ws://localhost:4200/ws'`
      // puts it well out of reach — so the port is recognised by its own shape
      // instead. The trailing delimiter is what keeps this from exempting a
      // tightly-written object property such as `{retries:5000}`.
      /[a-z0-9.\-]+:\d{2,5}(?:[/'"`]|$)/i,
      // A unit is a SUFFIX OF A NUMBER, not a substring of a nearby word.
      //
      // These read `/px|em|rem|%/` and `/ms|s\b/`, which matched anywhere in the
      // window: `em` inside "element", "item", "system"; `ms` inside "items",
      // "params"; and `s\b` at the end of any plural at all. So
      // `{ timeout: 30000, retries: 5 }` exempted 30000 — because of the `s` in
      // "retries". The law went quiet next to ordinary English.
      /\d+\s*(?:px|em|rem|vh|vw|%)/, // CSS units
      /\d+\s*m?s\b/, // Time units: 300ms, 30s
      /max.*age/i, // maxAge configurations
    ];

    return acceptablePatterns.some(pattern => pattern.test(context));
  }
}
