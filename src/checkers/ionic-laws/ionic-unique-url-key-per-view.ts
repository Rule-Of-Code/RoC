/**
 * Ionic Unique URL Key Per View
 *
 * ion-router-outlet finds a held view by one thing: the URL of its activated
 * route (getExistingView compares vw.url to getUrl(router, route)). Angular
 * lets two sibling routes share a `path` and be told apart by guards; Angular
 * then activates the right one, and Ionic — asking "do I already hold a view
 * for this URL?" — re-attaches whichever component it held under that URL.
 * The URL changes, the screen does not, and nothing is logged.
 *
 * Only component-bearing entries collide. `loadChildren` groups at the same
 * path are fine: their children carry the URLs.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** An array literal that holds routes: typed `Routes`, a `children:` list, or `RouterModule.forX([`. */
const ROUTE_ARRAY = /(?::\s*Routes\s*=|\bchildren\s*:|\bprovideRouter\s*\(|\bforRoot\s*\(|\bforChild\s*\()\s*\[/g;

export class IonicUniqueUrlKeyPerViewLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Unique URL Key Per View';

  static check(context: LawCheckContext): LawResult {
    if (!IonicProject.routesThroughOutlet(context)) {
      return IonicProject.withoutOutlet(this.LAW_NAME, context);
    }
    const violations: string[] = [];
    for (const file of IonicProject.sourceFiles(context)) {
      if (!file.endsWith('.ts')) continue;
      const content = FileUtils.readFileContentSync(file) ?? '';
      if (!/\bpath\s*:/.test(content)) continue;
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'One URL per view: give sibling pages distinct paths and let an empty path redirect',
        'Split by guard only on loadChildren groups whose children carry distinct URLs',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    const code = TsClasses.mask(content, 'commentsAndStrings');
    const violations: string[] = [];
    for (const match of code.matchAll(ROUTE_ARRAY)) {
      const open = (match.index ?? 0) + match[0].length - 1;
      const byPath = new Map<string, number[]>();
      for (const entry of this.entries(code, open)) {
        const path = this.componentPath(content, code, entry);
        if (path === null) continue;
        byPath.set(path, [...(byPath.get(path) ?? []), TsClasses.lineAt(content, entry.start)]);
      }
      violations.push(...this.collisions(where, byPath));
    }
    return violations;
  }

  private static collisions(where: string, byPath: Map<string, number[]>): string[] {
    return [...byPath]
      .filter(([, lines]) => lines.length > 1)
      .map(
        ([path, lines]) =>
          `${where}:${lines[0]}: ${lines.length} routes render a component at path '${path}' (lines ${lines.join(', ')}) — ion-router-outlet keys held views by URL, so it re-attaches whichever page it already holds there. Give each view its own URL`
      );
  }

  /**
   * The entry's own `path` when the entry renders a component at its own
   * level (not in its children); null otherwise. Read on masked code for the
   * structure and on the original at the same index for the string value.
   */
  private static componentPath(
    content: string,
    code: string,
    entry: { start: number; end: number }
  ): string | null {
    const own = this.ownLevel(code.slice(entry.start, entry.end));
    if (!/\b(?:component|loadComponent)\s*:/.test(own)) return null;
    const path = /\bpath\s*:\s*(['"`])/.exec(own);
    if (!path) return null;
    const quoteAt = entry.start + path.index + path[0].length - 1;
    const closeAt = code.indexOf(path[1] ?? "'", quoteAt + 1);
    return closeAt === -1 ? null : content.slice(quoteAt + 1, closeAt);
  }

  /** The `{…}` entries directly inside the array whose `[` is at `open` (masked code). */
  private static entries(code: string, open: number): Array<{ start: number; end: number }> {
    const entries: Array<{ start: number; end: number }> = [];
    let depth = 0;
    for (let k = open; k < code.length; k++) {
      const c = code[k] ?? '';
      if (c === '{' && depth === 1) {
        const end = this.closingBrace(code, k);
        if (end === -1) break;
        entries.push({ start: k, end: end + 1 });
        k = end;
        continue;
      }
      if (c === '[' || c === '(' || c === '{') depth++;
      else if (c === ']' || c === ')' || c === '}') depth--;
      if (depth === 0) break;
    }
    return entries;
  }

  private static closingBrace(code: string, open: number): number {
    let depth = 0;
    for (let k = open; k < code.length; k++) {
      if (code[k] === '{') depth++;
      else if (code[k] === '}' && --depth === 0) return k;
    }
    return -1;
  }

  /** An entry `{…}` with every nested bracket's contents blanked — same length. */
  private static ownLevel(entry: string): string {
    let depth = 0;
    let out = '';
    for (const c of entry) {
      const closes = c === ']' || c === ')' || c === '}';
      if (closes) depth--;
      out += depth <= 1 ? c : ' ';
      if (c === '[' || c === '(' || c === '{') depth++;
    }
    return out;
  }
}
