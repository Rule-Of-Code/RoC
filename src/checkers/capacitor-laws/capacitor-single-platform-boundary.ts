/**
 * Capacitor Single Platform Boundary
 *
 * One web build serves the browser, Android and iOS only while feature code
 * does not know which of them it is on: every @capacitor/* import and every
 * Capacitor.isNativePlatform() / getPlatform() / isPluginAvailable() call
 * lives in one boundary, behind a port. Let them spread and the code fills
 * with platform branches, and the UI with controls that do nothing on one of
 * the three targets.
 *
 * The boundary is data (`thresholds.capacitor.boundary`, globs). Without it,
 * the law accepts the tree only when exactly one project directory imports
 * Capacitor — and names the directories when there are more. An ESLint
 * `no-restricted-imports` rule naming @capacitor in the root config states
 * the same boundary in another tool, and is accepted.
 */

import { minimatch } from 'minimatch';
import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** A runtime import of a Capacitor package (not `import type`, not the CLI's config types). */
const CAPACITOR_IMPORT =
  /\bimport\s+(?!type\b)[^;]*?from\s*['"](@capacitor(?:-community|-firebase)?\/(?!cli['"])[^'"]+)['"]|\b(?:import|require)\s*\(\s*['"](@capacitor(?:-community|-firebase)?\/[^'"]+)['"]/g;
const PLATFORM_CALL = /\bCapacitor\.(?:isNativePlatform|getPlatform|isPluginAvailable)\s*\(/g;
const ROOT_ESLINT = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc'];

export class CapacitorSinglePlatformBoundaryLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Single Platform Boundary';

  static check(context: LawCheckContext): LawResult {
    const users = this.platformUsers(context);
    const boundary = context.config.thresholds?.capacitor?.boundary;
    const violations = boundary?.length
      ? this.outsideBoundary(users, boundary)
      : this.inferredBoundary(context, users);
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Import @capacitor/* and call Capacitor.isNativePlatform() only inside one boundary library',
        'Hand feature code a port (an interface with a native implementation, or null) through DI',
        'Declare the boundary in thresholds.capacitor.boundary',
      ],
      context
    );
  }

  /** Files that import Capacitor or branch on the platform, with what they use. */
  static platformUsers(context: LawCheckContext): Array<{ where: string; uses: string[] }> {
    const users: Array<{ where: string; uses: string[] }> = [];
    const files = FileUtils.scanForFiles(context.projectRoot, context.config, ['.ts', '.tsx', '.js', '.jsx', '.vue'], context.lawId, false);
    for (const file of files) {
      const where = relative(context, file);
      if (/(?:^|\/)capacitor\.config\.[jt]s$/.test(where)) continue;
      const uses = this.uses(FileUtils.readFileContentSync(file) ?? '');
      if (uses.length > 0) users.push({ where, uses });
    }
    return users;
  }

  static uses(content: string): string[] {
    const code = TsClasses.mask(content); // comments only — module names are strings
    const found = new Set<string>();
    for (const match of code.matchAll(CAPACITOR_IMPORT)) found.add(match[1] ?? match[2] ?? '');
    for (const match of code.matchAll(PLATFORM_CALL)) found.add(match[0].replace(/\s*\($/, '()'));
    return [...found];
  }

  private static outsideBoundary(
    users: Array<{ where: string; uses: string[] }>,
    boundary: string[]
  ): string[] {
    return users
      .filter(({ where }) => !boundary.some(glob => minimatch(where, glob)))
      .map(
        ({ where, uses }) =>
          `${where}: uses ${uses.join(', ')} outside thresholds.capacitor.boundary — feature code that knows its platform grows a branch per target. Move it behind a port in the boundary`
      );
  }

  private static inferredBoundary(
    context: LawCheckContext,
    users: Array<{ where: string; uses: string[] }>
  ): string[] {
    if (users.length === 0 || this.eslintStatesBoundary(context.projectRoot)) return [];
    const dirs = new Map<string, number>();
    for (const { where } of users) {
      const dir = this.projectDirOf(context.projectRoot, where);
      dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
    }
    if (dirs.size <= 1) return [];
    const listed = [...dirs].sort(([a], [b]) => a.localeCompare(b)).map(([dir, n]) => `${dir} (${n} file${n === 1 ? '' : 's'})`).join(', ');
    return [
      `Capacitor is imported from ${dirs.size} project directories: ${listed} — one build serves three targets only while one boundary knows the platform. Move the imports into one, or declare it in thresholds.capacitor.boundary`,
    ];
  }

  /** The nearest directory above a file that holds a project.json or package.json. */
  private static projectDirOf(projectRoot: string, where: string): string {
    let dir = PathOperations.getDirectory(where);
    while (dir && dir !== '.' && dir !== '/') {
      const abs = PathOperations.join(projectRoot, dir);
      if (fs.existsSync(PathOperations.join(abs, 'project.json')) || fs.existsSync(PathOperations.join(abs, 'package.json'))) {
        return dir;
      }
      const parent = PathOperations.getDirectory(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return '.';
  }

  private static eslintStatesBoundary(projectRoot: string): boolean {
    return ROOT_ESLINT.some(name => {
      const text = FileUtils.readFileContentSync(PathOperations.join(projectRoot, name)) ?? '';
      return /no-restricted-imports/.test(text) && /@capacitor/.test(text);
    });
  }
}
