/**
 * Zero Tolerance Doctrine (Sacred Law)
 * No errors, warnings, or violations of any kind in commits
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  ESLINT_CONFIG_FILES,
  readPackageJsonESLintConfig,
} from '../../utils/eslint-config-json';
import { FileUtils } from '../../utils/file-utils';
import { withNotRead } from '../../utils/judged-nothing';
import { notReadNote } from '../../utils/json-manifest';
import { PathOperations } from '../../utils/path-operations';
import { readTsconfigChain } from '../../utils/tsconfig-chain';
import { SacredLawBase } from './sacred-law-base';

/** The two tsconfig findings; the advice for them looks for the same text. */
const STRICT_OFF = 'TypeScript strict mode not enabled';
const NO_IMPLICIT_ANY_OFF = 'TypeScript noImplicitAny not enabled';

export class ZeroToleranceLaw {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    const notRead: string[] = [];

    this.checkTsConfig(projectRoot, violations, notRead);

    // Any ESLint config counts: flat, legacy (.eslintrc.json/.yaml/…) or
    // package.json `eslintConfig`. Only three names were known, so a
    // project configured by .eslintrc.json read "ESLint configuration not
    // found" (#486).
    const eslint = this.eslintConfigured(projectRoot);
    if (typeof eslint === 'string') {
      violations.push(eslint);
    } else if (!eslint) {
      violations.push('ESLint configuration not found');
    }

    // A flag an unread base may set is in notRead, not a finding (#453): the
    // law did not pass, and it does not claim the flag is on or off.
    return withNotRead(
      SacredLawBase.createResult(
        violations,
        'Zero Tolerance Doctrine',
        'SACRED_LAW',
        this.suggestionsFor(violations)
      ),
      notRead
    );
  }

  /**
   * The advice that answers a finding of this run, and only that. The list was
   * fixed, so a tsconfig the law could not read got "Enable TypeScript strict
   * mode" next to "tsconfig.json … NOT read" (#506, QA on #503).
   */
  private static suggestionsFor(violations: string[]): string[] {
    const has = (text: string): boolean => violations.includes(text);
    const advice: Array<[boolean, string]> = [
      [
        has(STRICT_OFF) || has(NO_IMPLICIT_ANY_OFF),
        'Enable TypeScript strict mode',
      ],
      [has('ESLint configuration not found'), 'Configure ESLint'],
    ];
    return advice.filter(([applies]) => applies).map(([, text]) => text);
  }

  /** Whether an ESLint config exists; the note when only package.json could tell and was not read. */
  private static eslintConfigured(projectRoot: string): boolean | string {
    const at = (name: string): string => PathOperations.join(projectRoot, name);
    if (ESLINT_CONFIG_FILES.some(name => FileUtils.fileExistsSync(at(name)))) {
      return true;
    }
    if (!FileUtils.fileExistsSync(at('package.json'))) return false;
    const read = readPackageJsonESLintConfig(
      at('package.json'),
      'whether it holds an ESLint config (eslintConfig) was'
    );
    return read?.notRead ?? read !== null;
  }

  /**
   * strict and noImplicitAny from tsconfig.json, its `extends` chain merged
   * (JSONC). An unparseable tsconfig read as "strict mode not enabled" (#486);
   * it is said to be NOT read, and so is a flag a base that could not be read
   * may set — that note goes to notRead.
   */
  private static checkTsConfig(
    projectRoot: string,
    violations: string[],
    notRead: string[]
  ): void {
    const tsConfigPath = PathOperations.join(projectRoot, 'tsconfig.json');
    if (!FileUtils.fileExistsSync(tsConfigPath)) {
      violations.push(STRICT_OFF);
      violations.push(NO_IMPLICIT_ANY_OFF);
      return;
    }
    const chain = readTsconfigChain(tsConfigPath);
    if (chain.notRead !== undefined) {
      violations.push(
        notReadNote(
          'tsconfig.json',
          chain.notRead,
          'strict and noImplicitAny were'
        )
      );
      return;
    }
    const unknown: string[] = [];
    // `strict` turns noImplicitAny on: unset under strict is enabled, and only
    // an explicit `false` turns it off (#506). Only when every file of the
    // chain was read: a base that could not be read may set
    // `noImplicitAny: false`, which `strict: true` in this file does not undo,
    // so there it is NOT read, never assumed on (QA on #578).
    const valueOf = (flag: 'strict' | 'noImplicitAny'): unknown =>
      flag === 'noImplicitAny' &&
      chain.unread.length === 0 &&
      chain.options.noImplicitAny === undefined &&
      chain.options.strict === true
        ? true
        : chain.options[flag];
    for (const [flag, finding] of [
      ['strict', STRICT_OFF],
      ['noImplicitAny', NO_IMPLICIT_ANY_OFF],
    ] as const) {
      if (valueOf(flag)) continue;
      if (chain.unread.length > 0 && valueOf(flag) === undefined) {
        unknown.push(flag);
      } else {
        violations.push(finding);
      }
    }
    if (unknown.length > 0) {
      notRead.push(
        `tsconfig.json extends ${chain.unread.map(e => JSON.stringify(e)).join(', ')}, which could not be read — ${unknown.join(' and ')} ${unknown.length > 1 ? 'were' : 'was'} NOT read`
      );
    }
  }
}
