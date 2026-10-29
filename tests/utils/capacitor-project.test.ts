/**
 * Reading a Capacitor project the way Capacitor reads it: the config through
 * the project's own CLI (executed, via a stand-in that behaves like
 * `cap config --json`), and the native files by fixed path. The failure
 * shapes matter most: a law that could not resolve the config must be told
 * so, never handed an empty object it would read as "nothing unsafe".
 */
import fs from 'fs';
import path from 'path';
import { CapacitorProjects } from '../../src/utils/capacitor/capacitor-project';
import {
  fakeCapacitorCli,
  manifest,
  printedConfig,
  project,
  removeProjects,
} from '../checkers/toolkit-fixture';

afterAll(removeProjects);
beforeEach(() => CapacitorProjects.clearCache());

const runs = (root: string): number => {
  const log = path.join(root, 'cli-runs.log');
  return fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length
    : 0;
};

describe('CapacitorProjects.find', () => {
  it('finds a config at the root', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    expect(CapacitorProjects.find(root).map(p => path.basename(p.configFile))).toEqual([
      'capacitor.config.ts',
    ]);
  });

  it('prefers .ts over .json in the same directory, as Capacitor does', () => {
    const root = project({
      'capacitor.config.json': '{}',
      'capacitor.config.ts': 'export default {};',
    });
    const found = CapacitorProjects.find(root);
    expect(found).toHaveLength(1);
    expect(path.basename(found[0]!.configFile)).toBe('capacitor.config.ts');
  });

  it('finds a config in a workspace app (monorepo)', () => {
    const root = project({ 'apps/mobile/capacitor.config.json': '{}' });
    const found = CapacitorProjects.find(root);
    expect(found).toHaveLength(1);
    expect(path.basename(found[0]!.root)).toBe('mobile');
  });

  it('finds nothing in a project without one', () => {
    expect(CapacitorProjects.find(project({ 'package.json': '{}' }))).toEqual([]);
  });
});

describe('CapacitorProjects.resolve', () => {
  it('returns app.extConfig as printed by `cap config --json`', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    const extConfig = { appId: 'com.example', android: { loggingBehavior: 'Production' } };
    fakeCapacitorCli(root, printedConfig(root, extConfig));

    const resolution = CapacitorProjects.resolve(CapacitorProjects.find(root)[0]!);

    expect(resolution).toMatchObject({ ok: true, config: extConfig });
    expect(fs.readFileSync(path.join(root, 'cli-runs.log'), 'utf8').trim()).toBe(
      'config --json'
    );
  });

  it('runs the CLI once per config, however many laws ask', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    fakeCapacitorCli(root, printedConfig(root, {}));
    const cap = CapacitorProjects.find(root)[0]!;

    CapacitorProjects.resolve(cap);
    CapacitorProjects.resolve(cap);
    CapacitorProjects.resolve(cap);

    expect(runs(root)).toBe(1);
  });

  it('is not ok when @capacitor/cli is not installed — never an empty config', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    const resolution = CapacitorProjects.resolve(CapacitorProjects.find(root)[0]!);
    expect(resolution.ok).toBe(false);
    expect(resolution.ok === false && resolution.reason).toMatch(/@capacitor\/cli is not installed/);
  });

  it('is not ok when the CLI fails, and carries its first stderr line', () => {
    const root = project({ 'capacitor.config.ts': 'export default {' });
    fakeCapacitorCli(root, null, 1);
    const resolution = CapacitorProjects.resolve(CapacitorProjects.find(root)[0]!);
    expect(resolution.ok).toBe(false);
    expect(resolution.ok === false && resolution.reason).toMatch(
      /Parsing capacitor\.config\.ts failed/
    );
  });

  it('is not ok when the CLI prints no extConfig', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    fakeCapacitorCli(root, { android: {}, ios: {} });
    expect(CapacitorProjects.resolve(CapacitorProjects.find(root)[0]!).ok).toBe(false);
  });

  it('finds the CLI installed at the workspace root for an app config', () => {
    const root = project({
      'package.json': manifest({ '@capacitor/cli': '8.6.0' }),
      'apps/mobile/capacitor.config.json': '{}',
    });
    const appRoot = path.join(root, 'apps', 'mobile');
    fakeCapacitorCli(root, printedConfig(appRoot, { appId: 'x' }));
    const cap = CapacitorProjects.find(root)[0]!;

    expect(CapacitorProjects.resolve(cap, root)).toMatchObject({ ok: true });
    // Capacitor runs from the directory holding the config.
    expect(runs(appRoot)).toBe(1);
  });
});

describe('CapacitorProjects.nativePaths', () => {
  it('uses the paths Capacitor resolved (they honour android.path / ios.path)', () => {
    const root = project({ 'capacitor.config.ts': 'export default {};' });
    const printed = printedConfig(root, {});
    (printed.android as Record<string, string>).srcMainDirAbs = path.join(root, 'native', 'main');
    fakeCapacitorCli(root, printed);

    const native = CapacitorProjects.nativePaths(CapacitorProjects.find(root)[0]!);

    expect(native.androidManifest).toBe(
      path.join(root, 'native', 'main', 'AndroidManifest.xml').replace(/\\/g, '/')
    );
  });

  it("falls back to Capacitor's default layout when the CLI cannot run", () => {
    const root = project({ 'capacitor.config.json': '{}' });
    const native = CapacitorProjects.nativePaths(CapacitorProjects.find(root)[0]!);
    expect(native.androidManifest.endsWith('android/app/src/main/AndroidManifest.xml')).toBe(true);
    expect(native.infoPlist.endsWith('ios/App/App/Info.plist')).toBe(true);
    expect(native.xcodeProjectFile.endsWith('ios/App/App.xcodeproj/project.pbxproj')).toBe(true);
  });

  it('lists the entitlements file of the iOS target', () => {
    const root = project({
      'capacitor.config.json': '{}',
      'ios/App/App/App.entitlements': '<plist/>',
    });
    const inputs = CapacitorProjects.fixedPathInputs(root);
    expect(inputs.some(file => file.endsWith('App.entitlements'))).toBe(true);
  });
});
