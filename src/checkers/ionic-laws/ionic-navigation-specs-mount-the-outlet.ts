/**
 * Ionic Navigation Specs Mount The Outlet
 *
 * Under ion-router-outlet the URL and the shown page can disagree: held
 * views, URL-keyed reuse, root vs forward direction, the hardware Back over
 * the view stack. RouterTestingHarness, provideLocationMocks and
 * TestBed.createComponent all stand BEHIND the layer that decides the screen,
 * so a spec that asserts router.url without mounting the outlet is green
 * whatever the outlet shows.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

const URL_ASSERTIONS: ReadonlyArray<[RegExp, string]> = [
  [/\brouter\.url\b/, 'router.url'],
  [/\blocation\.path\s*\(/, 'location.path()'],
  [/\blocation\.back\s*\(/, 'location.back()'],
  [/\bRouterTestingHarness\b/, 'RouterTestingHarness'],
  [/\bprovideLocationMocks\s*\(/, 'provideLocationMocks()'],
];
const MOUNTS_OUTLET = /<ion-router-outlet\b|\bIonRouterOutlet\b/;
/** Browser-level specs are the e2e law's subject, not this one's. */
const E2E_SPEC = /(?:^|\/)(?:e2e|cypress)\/|\.e2e\.(?:spec\.)?ts$|\.cy\.ts$/;

export class IonicNavigationSpecsMountTheOutletLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Navigation Specs Mount The Outlet';

  static check(context: LawCheckContext): LawResult {
    if (!IonicProject.routesThroughOutlet(context)) {
      return IonicProject.withoutOutlet(this.LAW_NAME, context);
    }
    const specs = FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.ts'],
      context.lawId,
      true
    ).filter(file => {
      const rel = PathOperations.getRelative(context.projectRoot, file).replace(/\\/g, '/');
      return rel.endsWith('.spec.ts') && !E2E_SPEC.test(rel);
    });
    const violations: string[] = [];
    for (const file of specs) {
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, FileUtils.readFileContentSync(file) ?? ''));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Host the real <ion-app><ion-router-outlet> with the real routes, navigate, and assert the child that is not .ion-page-hidden',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    const code = TsClasses.mask(content);
    if (MOUNTS_OUTLET.test(code)) return [];
    const used = URL_ASSERTIONS.filter(([pattern]) => pattern.test(code)).map(
      ([, token]) => token
    );
    if (used.length === 0) return [];
    return [
      `${where}: asserts navigation through ${used.join(', ')} without mounting ion-router-outlet — this app routes through the outlet, where router.url is green while it shows another page. Mount <ion-router-outlet> and assert the visible child`,
    ];
  }
}
