/**
 * Ionic Page State Read On Enter
 *
 * ion-router-outlet re-attaches a held page by URL key without constructing
 * it again (getExistingView → activateWith reuses enteringView.ref): no
 * constructor, no field initialisers, no ngOnInit. A per-visit value read in
 * any of those three is read on the first visit only. Angular would rebuild
 * the page; the outlet does not, so the Angular-correct place is the wrong one.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { type TsMember, TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** Values that belong to ONE navigation, not to the life of the page. */
const PER_VISIT_SOURCES: ReadonlyArray<[RegExp, string]> = [
  [/\bgetCurrentNavigation\s*\(/, 'getCurrentNavigation()'],
  [/\bhistory\.state\b/, 'history.state'],
  [/\.snapshot\b/, 'route.snapshot'],
  [/\bwindow\.location\b/, 'window.location'],
];

/** Where code runs once per INSTANCE — which, for a held page, is once. */
const ONCE_PER_INSTANCE = (member: TsMember): string | null => {
  if (member.kind === 'constructor') return 'the constructor';
  if (member.kind === 'method' && member.name === 'ngOnInit') return 'ngOnInit';
  if (member.kind === 'field' && member.body) return 'a field initialiser';
  return null;
};

export class IonicPageStateReadOnEnterLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Page State Read On Enter';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    for (const { file, content } of IonicProject.pages(context)) {
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Read per-visit state (navigation extras, history.state, route.snapshot) in ionViewWillEnter',
        'Or subscribe to it: route.paramMap, toSignal(route.params), component input binding',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    const violations: string[] = [];
    for (const cls of TsClasses.parse(content)) {
      if (cls.members.some(m => m.kind === 'method' && m.name === 'ionViewWillEnter')) continue;
      for (const member of cls.members) {
        const site = ONCE_PER_INSTANCE(member);
        if (!site) continue;
        const code = TsClasses.mask(member.body, 'commentsAndStrings');
        for (const [pattern, source] of PER_VISIT_SOURCES) {
          if (!pattern.test(code)) continue;
          violations.push(
            `${where}:${member.line}: ${cls.name} reads ${source} in ${site} — the outlet re-attaches a held page without running it again, so this is read on the first visit only; read it in ionViewWillEnter or subscribe to it`
          );
        }
      }
    }
    return violations;
  }
}
