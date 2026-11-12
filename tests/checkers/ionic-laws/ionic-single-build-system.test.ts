/**
 * Ionic Single Build System (#261). The shared set is read from an installed
 * @ionic/angular entry (a stand-in written into the fixture's node_modules,
 * shaped like 8.8.17's: `export { … } from '@ionic/angular/common'`).
 */
import { IonicSingleBuildSystemLaw as Law } from '../../../src/checkers/ionic-laws/ionic-single-build-system';
import { removeProjects } from '../toolkit-fixture';
import { IONIC_ANGULAR, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const INSTALLED = {
  'node_modules/@ionic/angular/package.json': JSON.stringify({
    name: '@ionic/angular',
    version: '8.8.17',
    exports: { '.': { default: './fesm2022/ionic-angular.mjs' } },
  }),
  'node_modules/@ionic/angular/fesm2022/ionic-angular.mjs': [
    "import { IonRouterOutlet as IonRouterOutlet$1 } from '@ionic/angular/common';",
    "export { AngularDelegate, Config, DomController, IonModalToken, IonicRouteStrategy, NavController, NavParams, Platform } from '@ionic/angular/common';",
    'class ModalController {}',
    'export { ModalController };',
  ].join('\n'),
};

const run = runner(ctx => Law.check(ctx), { 'package.json': IONIC_ANGULAR, ...INSTALLED });
const STANDALONE = "import { IonContent, provideIonicAngular } from '@ionic/angular/standalone';\nexport const x = [IonContent, provideIonicAngular];";

describe('IonicSingleBuildSystemLaw', () => {
  it('red: a module-build class imported in a standalone app, both sides named', () => {
    const result = run({
      'src/main.ts': STANDALONE,
      'src/app/share.ts': "import { ModalController } from '@ionic/angular';\nexport class Share { constructor(readonly m: ModalController) {} }",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/app\/share\.ts:1: imports ModalController from '@ionic\/angular' while src\/main\.ts:1 import from '@ionic\/angular\/standalone'/
      ),
    ]);
  });

  it('red: IonicModule, a namespace import and a re-export count too', () => {
    const result = run({
      'src/main.ts': STANDALONE,
      'src/app/a.module.ts': "import { IonicModule } from '@ionic/angular';\nexport const m = IonicModule;",
      'src/app/b.ts': "import * as ionic from '@ionic/angular';\nexport const b = ionic;",
      'src/app/index.ts': "export { IonButton } from '@ionic/angular';",
    });
    expect(result.violations).toHaveLength(3);
    expect(result.violations?.join('\n')).toContain("the whole '@ionic/angular' entry");
  });

  it('green, with a note: a shared class (re-exported from @ionic/angular/common) from the module entry', () => {
    const result = run({
      'src/main.ts': STANDALONE,
      'src/app/nav.ts': "import { NavController, Platform } from '@ionic/angular';\nexport class Nav { constructor(readonly n: NavController, readonly p: Platform) {} }",
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.suggestions).toEqual([expect.stringContaining('NavController, Platform from \'@ionic/angular\' in a standalone app')]);
  });

  it('green: type-only imports from the other entry are erased and ignored', () => {
    const result = run({
      'src/main.ts': STANDALONE,
      'src/app/t.ts': "import type { ModalController } from '@ionic/angular';\nimport { type IonModal } from '@ionic/angular';\nexport type T = ModalController | IonModal;",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: one entry only — the module build alone, or standalone alone', () => {
    expect(run({ 'src/app/a.module.ts': "import { IonicModule, ModalController } from '@ionic/angular';\nexport const m = [IonicModule, ModalController];" }).violations).toEqual([]);
    expect(run({ 'src/main.ts': STANDALONE }).violations).toEqual([]);
  });

  it('specs are not the app: a spec importing the other entry is not judged', () => {
    const result = run({
      'src/main.ts': STANDALONE,
      'src/app/share.spec.ts': "import { ModalController } from '@ionic/angular';\nexport const s = ModalController;",
    });
    expect(result.violations).toEqual([]);
  });

  it('cannot read: both entries imported and no installed @ionic/angular → not judged, never passed', () => {
    const bare = runner(ctx => Law.check(ctx));
    const result = bare({
      'src/main.ts': STANDALONE,
      'src/app/share.ts': "import { ModalController } from '@ionic/angular';\nexport const s = ModalController;",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('could not be read to tell the shared classes apart — NOT judged')]);
  });
});
