/**
 * Ionic Leave Cancels What Enter Started
 *
 * ion-router-outlet keeps a page on forward navigation (setForward pushes the
 * entering view and keeps the leaving one) and destroys it only when popped.
 * So cleanup tied to destruction — ngOnDestroy, DestroyRef, takeUntilDestroyed,
 * an effect's onCleanup — is correct Angular and does not run when the user
 * merely LEAVES the page. The leave hooks are the cleanup that does.
 *
 * Deliberately does not credit the destroy idioms: on a held page they are the
 * false green this law exists to replace.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { type TsMember, TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

const START_TOKENS: ReadonlyArray<[RegExp, string]> = [
  [/\bsetTimeout\s*\(/, 'setTimeout'],
  [/\bsetInterval\s*\(/, 'setInterval'],
  [/\.subscribe\s*\(/, '.subscribe'],
  [/\brequestAnimationFrame\s*\(/, 'requestAnimationFrame'],
  [/\baddEventListener\s*\(/, 'addEventListener'],
];

/** A leave hook as a method, or as an event name handed to a listener. */
const LEAVE_HOOK = /\bionView(?:Will|Did)Leave\b/;

const START_SITE = (member: TsMember): string | null => {
  if (member.kind === 'constructor') return 'the constructor';
  if (member.kind === 'method') {
    if (member.name === 'ngOnInit') return 'ngOnInit';
    if (member.name === 'ionViewWillEnter' || member.name === 'ionViewDidEnter') {
      return member.name;
    }
    return null;
  }
  return /\beffect\s*\(/.test(member.body) ? 'an effect()' : null;
};

export class IonicLeaveCancelsWhatEnterStartedLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Leave Cancels What Enter Started';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    for (const { file, content } of IonicProject.pages(context)) {
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Whatever ionViewWillEnter starts, ionViewWillLeave stops: clear the timer, unsubscribe, remove the listener',
        'Keep ngOnDestroy for the pop — it does not run when the page is only left',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    // Strings count for the leave hook: renderer.listen(host, 'ionViewWillLeave', …).
    if (LEAVE_HOOK.test(TsClasses.mask(content))) return [];
    const violations: string[] = [];
    for (const cls of TsClasses.parse(content)) {
      for (const member of cls.members) {
        const site = START_SITE(member);
        if (!site) continue;
        const code = TsClasses.mask(member.body, 'commentsAndStrings');
        const started = START_TOKENS.filter(([pattern]) => pattern.test(code)).map(
          ([, token]) => token
        );
        if (started.length === 0) continue;
        violations.push(
          `${where}:${member.line}: ${cls.name} starts ${started.join(', ')} in ${site} and has no ionViewWillLeave — the outlet keeps a page on forward navigation, so ngOnDestroy-based cleanup does not run when the user leaves`
        );
      }
    }
    return violations;
  }
}
