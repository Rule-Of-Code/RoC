/**
 * Ionic Route Reuse Strategy Provided
 *
 * IonicRouteStrategy makes a param change a new page (shouldReuseRoute returns
 * false when params differ), which is what lets ion-router-outlet hold
 * /items/1 and stack /items/2 on top of it with a transition and a working
 * Back. provideIonicAngular() does NOT register it — @ionic/angular ships no
 * RouteReuseStrategy provider; the official starter and the docs add it by
 * hand. A bootstrap assembled without the template silently has none.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { IonicProject } from '../../utils/ionic/ionic-project';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** A file that assembles an application's providers. */
const BOOTSTRAP = /\b(?:bootstrapApplication|provideRouter|RouterModule\.forRoot)\s*\(/;
const BOOTSTRAP_NAMES = /(?:^|\/)(?:main|app\.config|app\.module)\.ts$/;
const PROVIDES_STRATEGY = /\bprovide\s*:\s*RouteReuseStrategy\b/;

export class IonicRouteReuseStrategyProvidedLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Route Reuse Strategy Provided';

  static check(context: LawCheckContext): LawResult {
    if (!IonicProject.routesThroughOutlet(context)) {
      return IonicProject.withoutOutlet(this.LAW_NAME, context);
    }
    const violations = this.checkFiles(
      context.projectRoot,
      IonicProject.sourceFiles(context)
        .filter(file => file.endsWith('.ts'))
        .map(file => ({ file, content: FileUtils.readFileContentSync(file) ?? '' }))
    );
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Provide { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } next to provideIonicAngular()',
      ],
      context
    );
  }

  /**
   * One verdict per application: bootstrap files are grouped by the directory
   * above their `src/` (apps/mobile/src/main.ts → apps/mobile), so a workspace
   * where one app provides the strategy does not vouch for another.
   */
  static checkFiles(
    projectRoot: string,
    files: Array<{ file: string; content: string }>
  ): string[] {
    const apps = new Map<string, Array<{ where: string; code: string }>>();
    for (const { file, content } of files) {
      const where = PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
      const code = TsClasses.mask(content, 'commentsAndStrings');
      if (!BOOTSTRAP_NAMES.test(where) && !BOOTSTRAP.test(code)) continue;
      const app = this.appOf(where);
      apps.set(app, [...(apps.get(app) ?? []), { where, code }]);
    }
    return this.unprovided(apps);
  }

  /** The application a file belongs to: the directory above its `src/`. */
  private static appOf(where: string): string {
    if (where.startsWith('src/')) return '.';
    const src = where.indexOf('/src/');
    return src === -1 ? PathOperations.getDirectory(where) : where.slice(0, src);
  }

  private static unprovided(
    apps: Map<string, Array<{ where: string; code: string }>>
  ): string[] {
    const violations: string[] = [];
    for (const [app, bootstrap] of apps) {
      if (!bootstrap.some(({ code }) => BOOTSTRAP.test(code))) continue;
      if (bootstrap.some(({ code }) => PROVIDES_STRATEGY.test(code))) continue;
      violations.push(
        `${app === '.' ? 'the application' : app}: no RouteReuseStrategy provider in ${bootstrap.map(b => b.where).join(', ')} — provideIonicAngular() does not register IonicRouteStrategy, so a param-only navigation reuses the page instead of stacking a new one`
      );
    }
    return violations;
  }
}
