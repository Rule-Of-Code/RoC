/**
 * Ionic No Skip Location Change
 *
 * ion-router-outlet keys its view stack by URL, and the hardware Back button
 * pops that stack (NavController.pop navigates to the previous view's url).
 * A view leaves the stack when the navigation replacing it carries
 * `replaceUrl`. `skipLocationChange` changes the screen without moving the
 * URL key, so the view the user left stays in the stack and Back returns to
 * it. On the web nothing is wrong, which is why a Location-based test is green.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** Navigation extras in code. */
const EXTRA_IN_CODE = /\bskipLocationChange\s*:\s*true\b/g;
/** The routerLink input in a template: bare, `="true"`, or `[skipLocationChange]="expr"`. */
const INPUT_IN_TEMPLATE = /\[?\bskipLocationChange\b\]?(?:\s*=\s*(["'])(.*?)\1)?/g;

export class IonicNoSkipLocationChangeLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic No Skip Location Change';

  static check(context: LawCheckContext): LawResult {
    if (!IonicProject.routesThroughOutlet(context)) {
      return IonicProject.withoutOutlet(this.LAW_NAME, context);
    }
    const violations: string[] = [];
    for (const file of IonicProject.sourceFiles(context)) {
      const content = FileUtils.readFileContentSync(file) ?? '';
      if (!content.includes('skipLocationChange')) continue;
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content, file.endsWith('.html')));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      ['Use { replaceUrl: true } to drop the current view from the Ionic stack'],
      context
    );
  }

  static checkFile(where: string, content: string, isTemplate: boolean): string[] {
    const code = TsClasses.mask(content);
    const pattern = isTemplate ? INPUT_IN_TEMPLATE : EXTRA_IN_CODE;
    const violations: string[] = [];
    for (const match of code.matchAll(pattern)) {
      if (isTemplate && match[2]?.trim() === 'false') continue;
      violations.push(
        `${where}:${TsClasses.lineAt(content, match.index ?? 0)}: skipLocationChange — under ion-router-outlet the stack is keyed by URL; the current view stays in it and the hardware Back returns to it. Use replaceUrl`
      );
    }
    return violations;
  }
}
