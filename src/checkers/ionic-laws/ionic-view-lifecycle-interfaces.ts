/**
 * Ionic View Lifecycle Interfaces
 *
 * @ionic/angular binds a page's ionView* hooks by NAME, at runtime, and only
 * when that name is a function on the instance (bindLifecycleEvents filters
 * its LIFECYCLES list by `typeof instance[name] === 'function'`). A hook spelled
 * `ionViewWillEnterr` or `IonViewWillEnter` compiles, passes a unit test that
 * calls it directly, and is never called by the outlet. The ViewWillEnter
 * family of interfaces is what makes the compiler hold the name.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** The hooks @ionic/angular exports an interface for. */
const HOOK_INTERFACES: Readonly<Record<string, string>> = {
  ionViewWillEnter: 'ViewWillEnter',
  ionViewDidEnter: 'ViewDidEnter',
  ionViewWillLeave: 'ViewWillLeave',
  ionViewDidLeave: 'ViewDidLeave',
};

/** Every name the outlet binds — exact names are never near misses. */
const BOUND_NAMES = new Set([...Object.keys(HOOK_INTERFACES), 'ionViewWillUnload']);

/** Two edits is a typo; three is a different word (Will/Did, Enter/Leave are 3+ apart). */
const NEAR_MISS_DISTANCE = 2;

export class IonicViewLifecycleInterfacesLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic View Lifecycle Interfaces';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    for (const file of IonicProject.sourceFiles(context)) {
      if (!file.endsWith('.ts')) continue;
      const content = FileUtils.readFileContentSync(file) ?? '';
      if (!/ionview/i.test(content)) continue;
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Add the matching interface from @ionic/angular for every ionView* hook: `implements ViewWillEnter, ViewWillLeave`',
        'Rename a near-miss hook to the exact name the outlet binds',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    const violations: string[] = [];
    for (const cls of TsClasses.parse(content)) {
      for (const member of cls.members) {
        if (member.kind !== 'method' && member.kind !== 'field') continue;
        const iface = HOOK_INTERFACES[member.name];
        if (iface && !cls.implementsList.includes(iface)) {
          violations.push(
            `${where}:${member.line}: ${cls.name}.${member.name} without \`implements ${iface}\` — the outlet binds it by name, and only the interface makes the compiler hold that name`
          );
          continue;
        }
        const intended = this.nearMiss(member.name);
        if (intended) {
          violations.push(
            `${where}:${member.line}: ${cls.name}.${member.name} looks like \`${intended}\` and will never be bound — @ionic/angular binds lifecycle hooks by exact name`
          );
        }
      }
    }
    return violations;
  }

  /** The hook a name was probably meant to be, or null. */
  static nearMiss(name: string): string | null {
    // `#ionViewWillEnter` is invisible to `typeof instance[name]`.
    if (name.startsWith('#') && BOUND_NAMES.has(name.slice(1))) return name.slice(1);
    if (BOUND_NAMES.has(name) || !/^ion/i.test(name)) return null;
    for (const hook of BOUND_NAMES) {
      if (name.toLowerCase() === hook.toLowerCase()) return hook;
      if (this.distance(name, hook) <= NEAR_MISS_DISTANCE) return hook;
    }
    return null;
  }

  /** Levenshtein distance, case-sensitive. */
  private static distance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
        current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
      }
      previous = current;
    }
    return previous[b.length] ?? 0;
  }
}
