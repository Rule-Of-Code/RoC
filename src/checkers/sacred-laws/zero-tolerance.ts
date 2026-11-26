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
import {
  absentOptionDefaults,
  readTsconfigChain,
  readTsconfigProjects,
  type TsconfigChain,
  tsconfigFindingWhere,
  type TsconfigProject,
  type TsconfigProjects,
} from '../../utils/tsconfig-chain';
import { SacredLawBase } from './sacred-law-base';

const TSCONFIG = 'tsconfig.json';

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
    // A referenced project's finding is prefixed with its file (#640).
    const has = (text: string): boolean =>
      violations.some(v => v === text || v.endsWith(`: ${text}`));
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
   * strict and noImplicitAny from tsconfig.json and the projects it
   * references, each with its `extends` chain merged
   * (JSONC). An unparseable tsconfig read as "strict mode not enabled" (#486);
   * it is said to be NOT read, and so is a flag a base that could not be read
   * may set — that note goes to notRead.
   */
  private static checkTsConfig(
    projectRoot: string,
    violations: string[],
    notRead: string[]
  ): void {
    const tsConfigPath = PathOperations.join(projectRoot, TSCONFIG);
    if (!FileUtils.fileExistsSync(tsConfigPath)) {
      violations.push(STRICT_OFF);
      violations.push(NO_IMPLICIT_ANY_OFF);
      return;
    }
    // tsconfig.json and the projects it lists in `references`, as `tsc -b`
    // builds them (#640); a referenced project's finding names its file.
    const projects = readTsconfigProjects(projectRoot, tsConfigPath);
    if (projects === null) {
      const chain = readTsconfigChain(tsConfigPath);
      violations.push(
        notReadNote(
          TSCONFIG,
          chain.notRead ?? 'could not be read',
          'strict and noImplicitAny were'
        )
      );
      return;
    }
    for (const project of projects.projects) {
      this.judgeProject(projects, project, violations, notRead);
    }
    notRead.push(...projects.notRead);
  }

  /** One project of the build: each finding once, on the file that set the flag (#640). */
  private static judgeProject(
    projects: TsconfigProjects,
    project: TsconfigProject,
    violations: string[],
    notRead: string[]
  ): void {
    const found: string[] = [];
    const notes: string[] = [];
    this.judgeChain(
      project.rel,
      project.chain,
      found,
      notes,
      projects.projectRoot
    );
    for (const finding of found) {
      const flags =
        finding === STRICT_OFF ? ['strict'] : ['noImplicitAny', 'strict'];
      const line = `${tsconfigFindingWhere(projects, project, flags)}${finding}`;
      if (!violations.includes(line)) violations.push(line);
    }
    for (const note of notes) if (!notRead.includes(note)) notRead.push(note);
  }

  /** strict and noImplicitAny of one merged chain; `rel` names it in a note. */
  private static judgeChain(
    rel: string,
    chain: TsconfigChain,
    violations: string[],
    notRead: string[],
    projectRoot: string
  ): void {
    const unknown: string[] = [];
    // `strict` turns noImplicitAny on: unset under strict is enabled, and only
    // an explicit `false` turns it off (#506). Only when every file of the
    // chain was read: a base that could not be read may set
    // `noImplicitAny: false`, which `strict: true` in this file does not undo,
    // so there it is NOT read, never assumed on (QA on #578).
    // An option the chain leaves out has the default of the project's
    // TypeScript major: `strict` is true from 6.0 on (#667). Only when every
    // file of the chain was read: an unread base may set it.
    const setOptions = Object.fromEntries(
      Object.entries(chain.options).filter(([, value]) => value !== undefined)
    );
    const options =
      chain.unread.length === 0
        ? { ...absentOptionDefaults(projectRoot), ...setOptions }
        : setOptions;
    const valueOf = (flag: 'strict' | 'noImplicitAny'): unknown =>
      flag === 'noImplicitAny' &&
      chain.unread.length === 0 &&
      options.noImplicitAny === undefined &&
      options.strict === true
        ? true
        : options[flag];
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
        `${rel} extends ${chain.unread.map(e => JSON.stringify(e)).join(', ')}, which could not be read — ${unknown.join(' and ')} ${unknown.length > 1 ? 'were' : 'was'} NOT read`
      );
    }
  }
}
