/**
 * ROC-FE-11 — No risk/financial numeric literals in the UI
 * Risk numbers must flow live from state, never be hardcoded (the $700 → $450
 * lesson). A numeric literal assigned to a risk-named identifier, or a `$NNN`
 * literal in a template, is flagged. High false-positive class, so it stays
 * warn-only and whitelists trivial values (0 / 1 / -1).
 */

import { glob } from 'glob';
import { minimatch } from 'minimatch';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileFilterUtils } from '../../utils/file-filter-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { FeArchLawBase } from './fe-arch-law-base';

export class NoRiskLiteralsLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'No Risk Literals';
  private static readonly RISK_ASSIGN =
    /\b(\w*(?:floor|risk|limit|equity|stake|pnl|leverage|target)\w*)\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi;
  private static readonly TEMPLATE_MONEY = /\$\s?\d/;
  private static readonly TRIVIAL = new Set(['0', '1', '-1']);

  /**
   * Blank out `<!-- … -->` comments (newlines kept so line numbers stay
   * accurate) — a documented `$100` in a comment is not a bound risk number.
   */
  private static stripHtmlComments(content: string): string {
    return content.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  }

  /**
   * Blank comments AND string/template-literal CONTENTS (newlines preserved for
   * accurate line numbers). A `floor = 3` inside a captured-terminal display
   * string is text, not a risk assignment — the scan ran over raw source and
   * flagged it. Real risk assignments are code, so blanking string contents
   * removes the false positive without hiding a genuine `floor = 3` statement.
   */
  private static stripTsNoise(content: string): string {
    const blank = (m: string): string => m.replace(/[^\n]/g, ' ');
    return content
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/\/\/[^\n]*/g, blank)
      .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, blank);
  }

  /** .ts — risk-named numeric literal assignment. */
  private static collectTsViolations(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const violations: string[] = [];
    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      const raw = FileUtils.readFile(file);
      if (!raw) continue;
      const content = this.stripTsNoise(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      this.RISK_ASSIGN.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = this.RISK_ASSIGN.exec(content)) !== null) {
        if (this.TRIVIAL.has(m[2] ?? '')) continue;
        const line = content.slice(0, m.index).split('\n').length;
        violations.push(
          `${rel}:${line}: risk number hardcoded (${m[1]} = ${m[2]}) — it must flow live from state, not a literal`
        );
      }
    }
    return violations;
  }

  /** .html — `$NNN` money literal in a template. */
  private static collectHtmlViolations(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const violations: string[] = [];
    const ignorePatterns = FileFilterUtils.getIgnorePatterns(config);
    const htmlFiles = glob.sync('**/*.html', {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/packages/ruleofcode/**'],
    });
    for (const file of htmlFiles) {
      const rel = PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
      if (ignorePatterns.some(p => minimatch(file, p) || minimatch(rel, p))) continue;
      const content = FileUtils.readFile(file);
      if (!content) continue;
      const lines = this.stripHtmlComments(content).split(/\r\n|\r|\n/);
      for (let i = 0; i < lines.length; i++) {
        if (this.TEMPLATE_MONEY.test(lines[i] ?? '')) {
          violations.push(
            `${rel}:${i + 1}: $-amount literal in a template — bind the risk number from state`
          );
        }
      }
    }
    return violations;
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (early) return early;

    const violations = [
      ...this.collectTsViolations(projectRoot, config),
      ...this.collectHtmlViolations(projectRoot, config),
    ];

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Bind risk numbers (floor/limit/equity/…) from state, not literals',
        'Move $-amounts out of templates into computed state',
      ],
      context
    );
  }
}
