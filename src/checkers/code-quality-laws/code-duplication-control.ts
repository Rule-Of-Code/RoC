/**
 * Code Duplication Control Law
 * Detects and prevents code duplication
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import { type FunctionBody, functionBodies } from './function-bodies';

/** Where one copy of a body is. */
interface BodyOccurrence {
  file: string;
  start: number;
  end: number;
}

export class CodeDuplicationControlLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Function bodies come from the parser (#432): without it the files are
    // not read — said so, never compared as text instead.
    const unread = this.unreadWithoutParser(context);
    if (unread) return unread;

    // Check for duplication detection tools
    const toolsAnalysis = this.checkDuplicationTools(context.projectRoot);
    violations.push(...toolsAnalysis.violations);
    suggestions.push(...toolsAnalysis.suggestions);

    // Analyze code for duplication patterns
    const duplicationAnalysis = this.analyzeDuplication(
      context.projectRoot,
      context.config
    );
    violations.push(...duplicationAnalysis.violations);
    suggestions.push(...duplicationAnalysis.suggestions);

    return CodeDuplicationControlLaw.createResult(
      violations,
      'Code duplication under control',
      'CODE_QUALITY',
      suggestions,
      context
    );
  }

  private static checkDuplicationTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for duplication detection tools
    const duplicationTools = [
      'jscpd',
      'copy-paste-detector',
      'duplicate-code-detector',
    ];
    const missingTools = this.checkRequiredTools(projectRoot, duplicationTools);
    const hasDuplicationTool = missingTools.length < duplicationTools.length;

    if (!hasDuplicationTool) {
      violations.push('No code duplication detection tools configured');
      suggestions.push(
        'Install jscpd or similar tools for duplication detection'
      );
    }

    // Check for SonarJS rules using helper (similar tool checking pattern)
    const sonarJsTools = ['eslint-plugin-sonarjs'];
    const hasSonarJs =
      this.checkRequiredTools(projectRoot, sonarJsTools).length === 0;
    if (!hasSonarJs) {
      suggestions.push(
        'Consider eslint-plugin-sonarjs for advanced duplication detection'
      );
    }

    return { violations, suggestions };
  }

  /**
   * The law's result when there are files to compare and no parser to read
   * them with: failed, judged nothing, naming what was not read.
   */
  private static unreadWithoutParser(
    context: LawCheckContext
  ): LawResult | null {
    if (loadTypeScript(context.projectRoot)) return null;
    const files = CheckerUtils.findFilesByExtension(
      context.projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      context.config
    );
    if (files.length === 0) return null;
    return markJudgedNothing({
      passed: false,
      message: 'Code duplication not checked',
      violations: [
        `${parserUnavailable(context.projectRoot, `the ${files.length} .ts/.tsx file(s)`)} — Code Duplication Control judged nothing`,
      ],
      suggestions: [],
      score: 0,
      fixable: false,
      config: context.config,
    });
  }

  /**
   * Function bodies that are the same code, grouped by their tokens.
   *
   * A body is compared only when it is big enough to be worth extracting:
   * at least `minDuplicationLines` lines (5) and `minDuplicationTokens`
   * tokens (50), the floor copy-paste detectors such as jscpd use. Below it,
   * two equal bodies are an idiom — `return this.value;` — not a copy.
   */
  private static analyzeDuplication(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } = this.initializeAnalysis();
    const ts = loadTypeScript(projectRoot);
    if (!ts) return { violations, suggestions };

    const groups = new Map<string, BodyOccurrence[]>();
    const codeFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    for (const file of codeFiles) {
      try {
        const where = PathOperations.getRelative(projectRoot, file);
        for (const body of this.comparableBodies(ts, file, config)) {
          const occurrences = groups.get(body.key) ?? [];
          occurrences.push({ file: where, start: body.start, end: body.end });
          groups.set(body.key, occurrences);
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    const duplicated = [...groups.values()].filter(group => group.length > 1);
    for (const group of duplicated) {
      if (this.insideLargerCopy(group, duplicated)) continue;
      violations.push(
        `Code duplication found in: ${group.map(o => o.file).join(', ')}`
      );
    }

    if (violations.length > 0) {
      suggestions.push('Extract common code into shared functions or modules');
      suggestions.push('Use inheritance or composition to reduce duplication');
      suggestions.push(
        'Consider creating utility functions for repeated patterns'
      );
    }

    return { violations, suggestions };
  }

  /** The bodies of one file that are over the size floor. */
  private static comparableBodies(
    ts: NonNullable<ReturnType<typeof loadTypeScript>>,
    file: string,
    config: RuleOfCodeConfig
  ): FunctionBody[] {
    const quality = config.thresholds?.codeQuality;
    const minLines = quality?.minDuplicationLines ?? 5;
    const minTokens = quality?.minDuplicationTokens ?? 50;
    const minChars = quality?.minDuplicationBlockSize ?? 50;
    const source = ts.createSourceFile(
      file,
      FileUtils.readFile(file),
      ts.ScriptTarget.Latest,
      true
    );
    return functionBodies(ts, source).filter(
      body =>
        body.lines >= minLines &&
        body.tokens >= minTokens &&
        body.end - body.start > minChars
    );
  }

  /**
   * A copy that only exists because a larger copy contains it — the inner
   * callback of two equal functions — is the same finding, reported once.
   */
  private static insideLargerCopy(
    group: BodyOccurrence[],
    duplicated: BodyOccurrence[][]
  ): boolean {
    const contains = (outer: BodyOccurrence, inner: BodyOccurrence): boolean =>
      outer.file === inner.file &&
      outer.start <= inner.start &&
      inner.end <= outer.end &&
      outer.end - outer.start > inner.end - inner.start;
    return group.every(inner =>
      duplicated.some(
        other => other !== group && other.some(outer => contains(outer, inner))
      )
    );
  }
}
