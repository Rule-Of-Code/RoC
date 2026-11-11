/**
 * CapacitorAndroidBackHasOneOwner (#254): without a JS backButton listener
 * @capacitor/app never fires the 'backbutton' event Ionic's chain listens
 * for; with two, one press is handled twice.
 */
import { CapacitorAndroidBackHasOneOwnerLaw } from '../../../src/checkers/capacitor-laws/capacitor-android-back-has-one-owner';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';
import { selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Android Back Has One Owner';
const DEPS = { '@ionic/angular': '8.8.17', '@capacitor/android': '8.5.1', '@capacitor/app': '8.1.1' };
const IMPORT = "import { App } from '@capacitor/app';\n";
const listener = (body: string) =>
  `${IMPORT}export function start() {\n  void App.addListener('backButton', ({ canGoBack }) => { ${body} });\n}\n`;
const config = (hardwareBackButton?: boolean) =>
  `import { provideIonicAngular } from '@ionic/angular/standalone';\nexport const appConfig = { providers: [provideIonicAngular({ mode: 'md'${
    hardwareBackButton === undefined ? '' : `, hardwareBackButton: ${hardwareBackButton}`
  } })] };\n`;

const run = (
  files: Record<string, string>,
  extConfig: Record<string, unknown> | null = { appId: 'com.example.app', webDir: 'dist' },
  deps: Record<string, string> = DEPS
) => CapacitorAndroidBackHasOneOwnerLaw.check(ctx(capacitorProject(files, extConfig, deps)));

describe('CapacitorAndroidBackHasOneOwnerLaw (#254)', () => {
  it('red: Ionic and Android, no backButton listener anywhere (dead chain)', () => {
    const result = run({ 'src/app/app.config.ts': config() });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/no App\.addListener\('backButton'\) in any source file — without one, @capacitor\/app goes back in the WebView history/),
    ]);
  });

  it('red: says when @capacitor/app is not a dependency at all', () => {
    const { '@capacitor/app': _app, ...withoutApp } = DEPS;
    const result = run({ 'src/app/app.config.ts': config() }, undefined, withoutApp);
    expect(result.violations).toEqual([expect.stringContaining('@capacitor/app is not even a dependency')]);
  });

  it('red: a listener only in a spec file does not own back on the device', () => {
    const result = run({ 'src/app/back.spec.ts': listener('history.back();') });
    expect(result.violations).toEqual([expect.stringContaining("no App.addListener('backButton')")]);
  });

  it('red: a commented-out listener is not a listener', () => {
    const result = run({ 'src/app/back.ts': `${IMPORT}// App.addListener('backButton', () => {});\n` });
    expect(result.passed).toBe(false);
  });

  it('red: the dead-chain verdict holds when the config cannot be resolved, and says why', () => {
    const result = run({ 'src/app/app.config.ts': config() }, null);
    expect(result.violations).toEqual([
      expect.stringContaining("no App.addListener('backButton')"),
      expect.stringMatching(/could not resolve the Capacitor config .*disableBackButtonHandler could not be read/),
    ]);
  });

  it('green: plugins.App.disableBackButtonHandler — the project owns back natively', () => {
    const result = run({ 'src/app/app.config.ts': config() }, {
      appId: 'com.example.app',
      plugins: { App: { disableBackButtonHandler: true } },
    });
    expect(result.violations).toEqual([]);
  });

  it('red: two owners — two backButton call sites', () => {
    const result = run({
      'src/app/back.ts': listener('App.exitApp();'),
      'src/app/other/back-too.ts': listener('App.exitApp();'),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/2 App\.addListener\('backButton'\) call sites: src\/app\/back\.ts:3, src\/app\/other\/back-too\.ts:3/),
    ]);
  });

  it('green: one listener that owns back, Ionic chain off (hardwareBackButton: false)', () => {
    const result = run({
      'src/app/back.ts': listener('if (canGoBack) history.back(); else App.exitApp();'),
      'src/app/app.config.ts': config(false),
    });
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('green: one listener that only exits at the root, Ionic chain on', () => {
    const result = run({
      'src/app/back.ts': listener('if (!canGoBack) App.exitApp();'),
      'src/app/app.config.ts': config(),
    });
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('note (PARTIAL): one navigating listener while Ionic chain is on — passes, but says so', () => {
    const result = run({
      'src/app/back.ts': listener('this.nav.navigateBack("/home");'),
      'src/app/app.config.ts': config(true),
    });
    expect(result.passed).toBe(true);
    expect(result.suggestions?.[0]).toMatch(/src\/app\/back\.ts:3: the backButton listener navigates while Ionic's back-button chain is on/);
  });

  it('a plugin re-exported through a local barrel is still seen (one import deep)', () => {
    const result = run({
      'src/app/platform.ts': "export { App } from '@capacitor/app';\n",
      'src/app/back.ts':
        "import { App } from './platform';\nvoid App.addListener('backButton', () => App.exitApp());\n",
      'src/app/app.config.ts': config(false),
    });
    expect(result.violations).toEqual([]);
  });

  it('cannot read: no TypeScript to parse with — fails, never passes', () => {
    const root = capacitorProject({ 'src/app/back.ts': listener('App.exitApp();') }, undefined, DEPS);
    const result = withoutTypeScript(() => CapacitorAndroidBackHasOneOwnerLaw.check(ctx(root)));
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/could not load the 'typescript' package .* this law does not pass on them/);
  });

  describe('selection (requires)', () => {
    const CAP = { '@capacitor/core': '8.5.1' };
    it('selected: Ionic + @capacitor/core + @capacitor/android + a config', () => {
      expect(selected(TITLE, { ...CAP, '@ionic/angular': '8', '@capacitor/android': '8' })).toBe(true);
    });
    it('not selected: an iOS-only shell (no @capacitor/android)', () => {
      expect(selected(TITLE, { ...CAP, '@ionic/angular': '8', '@capacitor/ios': '8' })).toBe(false);
    });
    it('not selected: Capacitor without Ionic', () => {
      expect(selected(TITLE, { ...CAP, '@capacitor/android': '8' })).toBe(false);
    });
    it('not selected: no Capacitor config', () => {
      expect(
        selected(TITLE, { ...CAP, '@ionic/angular': '8', '@capacitor/android': '8' }, { 'README.md': '' })
      ).toBe(false);
    });
  });
});
