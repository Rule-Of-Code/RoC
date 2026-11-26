/**
 * #43, package 7 (ionic / capacitor) — the laws whose violation line counts
 * (or cuts) what they found name every artefact in `violationDetails`, at its
 * place. The violation lines are unchanged.
 */
import { CapacitorAndroidBackHasOneOwnerLaw } from '../../src/checkers/capacitor-laws/capacitor-android-back-has-one-owner';
import { CapacitorSinglePlatformBoundaryLaw } from '../../src/checkers/capacitor-laws/capacitor-single-platform-boundary';
import { IonicSessionExitUsesNavigateRootLaw } from '../../src/checkers/ionic-laws/ionic-session-exit-uses-navigate-root';
import { IonicSingleBuildSystemLaw } from '../../src/checkers/ionic-laws/ionic-single-build-system';
import { IonicUniqueUrlKeyPerViewLaw } from '../../src/checkers/ionic-laws/ionic-unique-url-key-per-view';
import type { ViolationDetail } from '../../src/types/law.types';
import { capacitorProject } from '../checkers/capacitor-laws/capacitor-fixture';
import {
  IONIC_ANGULAR,
  runner,
} from '../checkers/ionic-laws/ionic-rendering-fixture';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const places = (details: ViolationDetail[] | undefined): string[] =>
  (details ?? []).map(d => `${d.file}:${d.line ?? '-'} ${d.message}`);

const IONIC = manifest({
  '@angular/core': '20.0.0',
  '@ionic/angular': '8.8.17',
});
const OUTLET = {
  'src/app/app.component.ts':
    "@Component({ template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' })\nexport class AppComponent {}",
};
const withOutlet = (files: Record<string, string>) =>
  ctx(project({ 'package.json': IONIC, ...OUTLET, ...files }));

describe('#43 package 7: Ionic and Capacitor laws name every artefact they counted', () => {
  it("Capacitor Android Back Has One Owner: each App.addListener('backButton')", () => {
    const listener = (name: string) =>
      `import { App } from '@capacitor/app';\nexport function ${name}() {\n  void App.addListener('backButton', () => history.back());\n}\n`;
    const result = CapacitorAndroidBackHasOneOwnerLaw.check(
      ctx(
        capacitorProject(
          {
            'src/app/a.ts': listener('a'),
            'src/app/b.ts': listener('b'),
            'src/app/c.ts': listener('c'),
          },
          { appId: 'com.example.app', webDir: 'dist' },
          {
            '@ionic/angular': '8.8.17',
            '@capacitor/android': '8.5.1',
            '@capacitor/app': '8.1.1',
          }
        )
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^3 App\.addListener\('backButton'\) call sites: src\/app\/a\.ts:3, src\/app\/b\.ts:3, src\/app\/c\.ts:3 — /
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      ['a', 'b', 'c'].map(
        f =>
          `src/app/${f}.ts:3 App.addListener('backButton') — one of 3 listeners`
      )
    );
  });

  it('Capacitor Single Platform Boundary: each file behind the directory counts', () => {
    const root = capacitorProject({
      'libs/shared/util/project.json': '{}',
      'libs/shared/util/src/native-share.ts':
        "import { Share } from '@capacitor/share';\nexport const s = Share;\n",
      'libs/events/feature/project.json': '{}',
      'libs/events/feature/src/a.ts':
        "import { Share } from '@capacitor/share';\nexport const a = Share;\n",
      'libs/events/feature/src/b.ts':
        "import { Capacitor } from '@capacitor/core';\nexport const b = Capacitor.isNativePlatform();\n",
    });
    const result = CapacitorSinglePlatformBoundaryLaw.check(ctx(root));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /from 2 project directories: libs\/events\/feature \(2 files\), libs\/shared\/util \(1 file\)/
      ),
    ]);
    expect(places(result.violationDetails).sort()).toEqual([
      'libs/events/feature/src/a.ts:- uses @capacitor/share (project directory libs/events/feature)',
      'libs/events/feature/src/b.ts:- uses @capacitor/core, Capacitor.isNativePlatform() (project directory libs/events/feature)',
      'libs/shared/util/src/native-share.ts:- uses @capacitor/share (project directory libs/shared/util)',
    ]);
  });

  it('Ionic Unique URL Key Per View: each route behind "N routes render a component at path …"', () => {
    const result = IonicUniqueUrlKeyPerViewLaw.check(
      withOutlet({
        'src/app/app.routes.ts': [
          'export const routes: Routes = [', //                                                    1
          "  { path: '', canMatch: [a], loadComponent: () => import('./launch.page') },", //      2
          "  { path: '', canMatch: [b], loadComponent: () => import('./tabs.page') },", //        3
          "  { path: '', canMatch: [c], loadComponent: () => import('./home.page') },", //        4
          '];',
        ].join('\n'),
      })
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/app\.routes\.ts:2: 3 routes render a component at path '' \(lines 2, 3, 4\)/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      [2, 3, 4].map(
        line =>
          `src/app/app.routes.ts:${line} route renders a component at path '' — one of 3`
      )
    );
  });

  it('Ionic Session Exit Uses Navigate Root: each forward navigation behind "(N calls)"', () => {
    const result = IonicSessionExitUsesNavigateRootLaw.check(
      withOutlet({
        'src/app/auth.service.ts': [
          'export class AuthService {', //                                 1
          '  async logout() {', //                                         2
          '    await this.auth.signOut();', //                             3
          "    await this.router.navigateByUrl('/login');", //             4
          '  }', //                                                        5
          '  async expire() {', //                                         6
          "    this.router.navigate(['/login']);", //                      7
          '  }', //                                                        8
          '}', //                                                          9
        ].join('\n'),
      })
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/auth\.service\.ts:4: ends a session and navigates forward \(2 calls\), never navigateRoot/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual([
      'src/app/auth.service.ts:4 navigates forward (.navigateByUrl) in a file that ends a session — never navigateRoot',
      'src/app/auth.service.ts:7 navigates forward (.navigate) in a file that ends a session — never navigateRoot',
    ]);
  });

  it('Ionic Single Build System: each standalone import behind "<first> and N more"', () => {
    const run = runner(ctx => IonicSingleBuildSystemLaw.check(ctx), {
      'package.json': IONIC_ANGULAR,
      'node_modules/@ionic/angular/package.json': JSON.stringify({
        name: '@ionic/angular',
        version: '8.8.17',
        exports: { '.': { default: './fesm2022/ionic-angular.mjs' } },
      }),
      'node_modules/@ionic/angular/fesm2022/ionic-angular.mjs': [
        "export { NavController } from '@ionic/angular/common';",
        'class ModalController {}',
        'export { ModalController };',
      ].join('\n'),
    });
    const standalone = (n: string) =>
      `import { IonContent } from '@ionic/angular/standalone';\nexport const ${n} = IonContent;\n`;
    const result = run({
      'src/main.ts': standalone('m'),
      'src/app/a.ts': standalone('a'),
      'src/app/b.ts': standalone('b'),
      'src/app/share.ts':
        "import { ModalController } from '@ionic/angular';\nexport class Share { constructor(readonly m: ModalController) {} }",
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/share\.ts:1: imports ModalController from '@ionic\/angular' while src\/app\/a\.ts:1 and 2 more import from '@ionic\/angular\/standalone'/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual([
      "src/app/a.ts:1 imports from '@ionic/angular/standalone'",
      "src/app/b.ts:1 imports from '@ionic/angular/standalone'",
      "src/main.ts:1 imports from '@ionic/angular/standalone'",
    ]);
  });
});
