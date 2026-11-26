/**
 * Ionic Session Exit Uses Navigate Root
 *
 * Only direction `root` empties the ion-router-outlet stack (setRoot drops
 * every view of the stack). router.navigate / navigateByUrl are `forward` by
 * default, so a sign-out that navigates forward keeps every page of the old
 * session held — and a later sign-in that lands on the same URL re-attaches
 * one, frozen at its last state, with no constructor, no ngOnInit, no request.
 * NavController.navigateRoot() is the API that sets direction root.
 */

import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { withViolationDetails } from '../../utils/violation-details';
import { LawBase } from '../law-base';

const SESSION_END = /\b(?:signOut|logout|logOut|clearSession|revokeToken)\s*\(/;
const FORWARD = /\.(?:navigate|navigateByUrl|navigateForward)\s*\(/g;
const ROOT = /\bnavigateRoot\s*\(/;

export class IonicSessionExitUsesNavigateRootLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Session Exit Uses Navigate Root';

  static check(context: LawCheckContext): LawResult {
    if (!IonicProject.routesThroughOutlet(context)) {
      return IonicProject.withoutOutlet(this.LAW_NAME, context);
    }
    const violations: string[] = [];
    // Each forward navigation behind a count, at its line (#43).
    const details: ViolationDetail[] = [];
    for (const file of IonicProject.sourceFiles(context)) {
      if (!file.endsWith('.ts')) continue;
      const content = FileUtils.readFileContentSync(file) ?? '';
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, content, details));
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'End a session with NavController.navigateRoot(<final address>)',
        'Navigate to the final address: a guard redirect is a NavigationCancel, which resets the direction to forward',
      ],
      context
    );
    return withViolationDetails(result, details);
  }

  static checkFile(
    where: string,
    content: string,
    details: ViolationDetail[] = []
  ): string[] {
    const code = TsClasses.mask(content, 'commentsAndStrings');
    if (!SESSION_END.test(code) || ROOT.test(code)) return [];
    const forward = [...code.matchAll(FORWARD)];
    if (forward.length === 0) return [];
    const line = TsClasses.lineAt(content, forward[0]?.index ?? 0);
    details.push(
      ...forward.map(call => ({
        file: where,
        line: TsClasses.lineAt(content, call.index ?? 0),
        message: `navigates forward (${call[0].replace(/\s*\($/, '')}) in a file that ends a session — never navigateRoot`,
      }))
    );
    return [
      `${where}:${line}: ends a session and navigates forward (${forward.length} call${forward.length === 1 ? '' : 's'}), never navigateRoot — the old session's pages stay held, and the next sign-in to the same URL re-attaches one frozen at its last state`,
    ];
  }
}
