/**
 * Magic Number Prevention Law
 * Prevents use of magic numbers and promotes named constants
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import { numericLiterals } from './magic-number-names';
import { readSource } from './source-view';

export class MagicNumberPreventionLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Literals are read from the parse (#424): without it the files are not
    // read — said so, never scanned as text instead.
    const unread = this.unreadWithoutParser(context);
    if (unread) return unread;

    // Analyze code for magic numbers
    const magicNumberAnalysis = this.analyzeMagicNumbers(
      context.projectRoot,
      context.config,
      context.lawId
    );
    violations.push(...magicNumberAnalysis.violations);
    suggestions.push(...magicNumberAnalysis.suggestions);

    // The law is the check: it reads the literals itself, by its own
    // definition of a named number. ESLint's no-magic-numbers is not a
    // condition to pass — it has no option for a `??` fallback or a constant
    // expression in an initializer, so it reports numbers this law counts as
    // named (#594). A project that sets the rule is told so, as information.
    const details = this.eslintRuleNote(context.projectRoot);
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
      ...(details.length > 0 ? { details } : {}),
      ...(magicNumberAnalysis.details.length > 0
        ? { violationDetails: magicNumberAnalysis.details }
        : {}),
    };
  }

  /** The ESLint rules that name magic numbers. */
  private static readonly ESLINT_RULES = [
    'no-magic-numbers',
    '@typescript-eslint/no-magic-numbers',
  ] as const;

  /**
   * Information, never a finding: the ESLint magic-number rule the project
   * sets, if any. A config that is missing or could not be read says nothing
   * here, because the verdict does not depend on it (#594).
   */
  private static eslintRuleNote(projectRoot: string): string[] {
    const eslint = this.readESLintConfig(projectRoot);
    if (!eslint || eslint.notRead !== undefined) return [];
    const rules = (eslint.config.rules ?? {}) as Record<string, unknown>;
    const set = this.ESLINT_RULES.filter(rule => rules[rule]);
    return set.length > 0
      ? [
          `${eslint.file} sets ${set.join(' and ')} — information only: this law reads the literals itself and does not require the rule`,
        ]
      : [];
  }

  private static analyzeMagicNumbers(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): {
    violations: string[];
    suggestions: string[];
    details: ViolationDetail[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    // Every literal behind a file's line (which shows five), at its line (#43).
    const details: ViolationDetail[] = [];

    const codeFiles = MagicNumberPreventionLaw.findCodeFilesForAnalysis(
      projectRoot,
      { projectRoot, config, lawId } as LawCheckContext
    );
    let magicNumberFiles = 0;

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const sites = this.magicNumberSites(content, file, projectRoot);
        const magicNumbers = Array.from(new Set(sites.map(site => site.text)));

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
          details.push(
            ...sites.map(site => ({
              file: relativePath,
              line: site.line,
              message: `magic number ${site.text}`,
            }))
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

    return { violations, suggestions, details };
  }

  /**
   * The law's result when there are files to read and no parser to read
   * them with: failed, judged nothing, naming what was not read.
   */
  private static unreadWithoutParser(
    context: LawCheckContext
  ): LawResult | null {
    if (loadTypeScript(context.projectRoot)) return null;
    const files = this.findCodeFilesForAnalysis(context.projectRoot, context);
    if (files.length === 0) return null;
    return markJudgedNothing({
      passed: false,
      message: 'Magic numbers not checked',
      violations: [
        `${parserUnavailable(context.projectRoot, `the ${files.length} code file(s)`)} — Magic Number Prevention judged nothing`,
      ],
      suggestions: [],
      score: 0,
      fixable: false,
      config: context.config,
    });
  }

  /**
   * The unnamed numeric literals in one file's code.
   *
   * A literal is a node of the parse, so a digit inside a string, a template
   * text, a regex or a comment is never one, and one inside a template
   * substitution (`${x.slice(0, 57)}`) is. A literal the code already names
   * is not reported — see magic-number-names.ts.
   *
   * Not private: the regression tests read it.
   */
  static findMagicNumbers(
    content: string,
    fileName = 'file.ts',
    projectRoot = process.cwd()
  ): string[] {
    const sites = this.magicNumberSites(content, fileName, projectRoot);
    return Array.from(new Set(sites.map(site => site.text)));
  }

  /** Every magic-number literal of a file, with its line. */
  private static magicNumberSites(
    content: string,
    fileName: string,
    projectRoot: string
  ): Array<{ text: string; line: number }> {
    const ts = loadTypeScript(projectRoot);
    if (!ts) throw new Error(parserUnavailable(projectRoot, fileName));
    const { source, code } = readSource(ts, content, fileName);
    return numericLiterals(ts, source)
      .filter(site => !site.named && this.isCandidate(site.text))
      .filter(site => !this.namedByText(code, site.start, site.text))
      .map(site => ({ text: site.text, line: this.lineAt(code, site.start) }));
  }

  /**
   * A literal worth asking about: a decimal, or an integer of two or more
   * digits, that is not one of the everyday values.
   */
  private static isCandidate(text: string): boolean {
    const acceptableNumbers = new Set(['0', '1', '2', '10', '100', '1000']);
    return /^(?:\d+\.\d+|\d{2,})$/.test(text) && !acceptableNumbers.has(text);
  }

  /**
   * The text-shaped exemptions, read on the code around the literal (strings
   * and comments already blanked).
   *
   * Named-constant declaration or object property directly to the left, on
   * the literal's own line — anchored so a declaration elsewhere on the line
   * cannot exempt an unrelated literal. Then a TIGHT window around the
   * literal for units, versions, ports and times, so loose tokens elsewhere
   * on the line cannot.
   */
  private static namedByText(
    code: string,
    start: number,
    number: string
  ): boolean {
    const lineStart = code.lastIndexOf('\n', start) + 1;
    const leftOfNumber = code.substring(lineStart, start);
    if (
      /\b(?:const|let|var|readonly)\s+[A-Za-z_$][\w$]*\s*=\s*-?$/.test(
        leftOfNumber
      ) ||
      /[A-Za-z_$][\w$]*\s*:\s*-?$/.test(leftOfNumber)
    ) {
      return true;
    }
    const context = code.substring(
      Math.max(0, start - 10),
      start + number.length + 10
    );
    return this.isAcceptableContext(context, number);
  }

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
