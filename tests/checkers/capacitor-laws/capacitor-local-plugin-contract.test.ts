/**
 * CapacitorLocalPluginContract (#256): registerPlugin('Name'),
 * @CapacitorPlugin(name = "Name") with its @PluginMethods, and
 * registerPlugin(Class.class) before super.onCreate must agree. The three
 * Java-only mutants of the measured incident are each a red here.
 */
import { CapacitorLocalPluginContractLaw } from '../../../src/checkers/capacitor-laws/capacitor-local-plugin-contract';
import { CapacitorProjects } from '../../../src/utils/capacitor/capacitor-project';
import { ctx, removeProjects, writeFiles } from '../toolkit-fixture';
import { IGNORING_SHELLS, capacitorProject } from './capacitor-fixture';
import { selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Local Plugin Contract';
const JAVA_DIR = 'android/app/src/main/java/com/example/app';
const WEB = 'src/app/app-settings-plugin.ts';
const web = (methods = 'open(): Promise<void>;') =>
  [
    "import { registerPlugin } from '@capacitor/core';",
    "export const APP_SETTINGS = 'AppSettings';",
    `export interface AppSettingsPlugin { ${methods} }`,
    'export const AppSettings = registerPlugin<AppSettingsPlugin>(APP_SETTINGS);',
  ].join('\n');
const plugin = (name = 'AppSettings', method = 'open') =>
  [
    'package com.example.app;',
    'import com.getcapacitor.*;',
    'import com.getcapacitor.annotation.CapacitorPlugin;',
    `@CapacitorPlugin(name = "${name}")`,
    'public class AppSettingsPlugin extends Plugin {',
    '    @PluginMethod',
    `    public void ${method}(PluginCall call) { call.resolve(); }`,
    '}',
  ].join('\n');
const activity = (body: string) =>
  [
    'package com.example.app;',
    'import android.os.Bundle;',
    'import com.getcapacitor.BridgeActivity;',
    'public class MainActivity extends BridgeActivity {',
    '    @Override',
    '    public void onCreate(Bundle savedInstanceState) {',
    body,
    '    }',
    '}',
  ].join('\n');
const REGISTERED = activity('        registerPlugin(AppSettingsPlugin.class);\n        super.onCreate(savedInstanceState);');

const shell = (overrides: Record<string, string> = {}): Record<string, string> => ({
  [WEB]: web(),
  [`${JAVA_DIR}/AppSettingsPlugin.java`]: plugin(),
  [`${JAVA_DIR}/MainActivity.java`]: REGISTERED,
  ...overrides,
});
const run = (files: Record<string, string>) =>
  CapacitorLocalPluginContractLaw.check(ctx(capacitorProject(files), IGNORING_SHELLS));

describe('CapacitorLocalPluginContractLaw (#256)', () => {
  it('green: the three names agree (android/ excluded from the scan, read by fixed path)', () => {
    const result = run(shell());
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('red (mutant 1): the MainActivity registration removed', () => {
    const result = run(shell({ [`${JAVA_DIR}/MainActivity.java`]: activity('        super.onCreate(savedInstanceState);') }));
    expect(result.violations).toEqual([
      expect.stringMatching(/src\/app\/app-settings-plugin\.ts:4: 'AppSettings' — AppSettingsPlugin is annotated @CapacitorPlugin but the BridgeActivity never calls registerPlugin\(AppSettingsPlugin\.class\)/),
    ]);
  });

  it('red: a commented-out registration is not a registration', () => {
    const commented = activity('        // registerPlugin(AppSettingsPlugin.class);\n        super.onCreate(savedInstanceState);');
    expect(run(shell({ [`${JAVA_DIR}/MainActivity.java`]: commented })).passed).toBe(false);
  });

  it('red (mutant 2): @CapacitorPlugin(name = "AppSetting")', () => {
    const result = run(shell({ [`${JAVA_DIR}/AppSettingsPlugin.java`]: plugin('AppSetting') }));
    expect(result.violations).toEqual([
      expect.stringMatching(/registerPlugin\('AppSettings'\) — no class under android\/app\/src\/main\/java\|kotlin has @CapacitorPlugin\(name = "AppSettings"\).*isPluginAvailable\('AppSettings'\) is false/),
    ]);
  });

  it('red (mutant 3): the Java method renamed', () => {
    const result = run(shell({ [`${JAVA_DIR}/AppSettingsPlugin.java`]: plugin('AppSettings', 'openSettings') }));
    expect(result.violations).toEqual([
      expect.stringMatching(/'AppSettings' on Android — open\(\) declared in the TypeScript interface but not exposed as @PluginMethod in AppSettingsPlugin/),
    ]);
    expect(result.suggestions?.[0]).toMatch(/@PluginMethod openSettings in AppSettingsPlugin has no counterpart in the TypeScript interface/);
  });

  it('red: registered after super.onCreate — the bridge is already built', () => {
    const late = activity('        super.onCreate(savedInstanceState);\n        registerPlugin(AppSettingsPlugin.class);');
    const result = run(shell({ [`${JAVA_DIR}/MainActivity.java`]: late }));
    expect(result.violations).toEqual([expect.stringContaining('comes after super.onCreate(…) in the BridgeActivity')]);
  });

  it('red: no BridgeActivity subclass to register it in', () => {
    const { [`${JAVA_DIR}/MainActivity.java`]: _activity, ...rest } = shell();
    expect(run(rest).violations).toEqual([expect.stringContaining('no BridgeActivity subclass found')]);
  });

  it('green: Kotlin plugin and registerPlugins(listOf(X::class.java)), name defaulting to the class name', () => {
    const result = run({
      [WEB]: web().replace("'AppSettings'", "'AppSettingsPlugin'"),
      'android/app/src/main/kotlin/com/example/app/AppSettingsPlugin.kt':
        '@CapacitorPlugin\nclass AppSettingsPlugin : Plugin() {\n  @PluginMethod\n  fun open(call: PluginCall) { call.resolve() }\n}',
      'android/app/src/main/kotlin/com/example/app/MainActivity.kt':
        'class MainActivity : BridgeActivity() {\n  override fun onCreate(savedInstanceState: Bundle?) {\n    registerPlugins(listOf(AppSettingsPlugin::class.java))\n    super.onCreate(savedInstanceState)\n  }\n}',
    });
    expect(result.violations).toEqual([]);
  });

  it('green: name imported from another module, type an intersection with an addListener literal', () => {
    const result = run(shell({
      'src/app/names.ts': "export const APP_SETTINGS = 'AppSettings';\nexport interface AppSettingsPlugin { open(): Promise<void>; }",
      [WEB]: [
        "import { registerPlugin } from '@capacitor/core';",
        "import { APP_SETTINGS, AppSettingsPlugin } from './names';",
        'type Bridge = AppSettingsPlugin & { addListener(event: "x", f: () => void): Promise<{ remove(): void }> };',
        'export const bridge = () => registerPlugin<Bridge>(APP_SETTINGS);',
      ].join('\n'),
    }));
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('green: an npm plugin package declares the name — not a local plugin', () => {
    const root = capacitorProject({ [WEB]: web().replace(/AppSettings/g, 'Camera'), [`${JAVA_DIR}/MainActivity.java`]: REGISTERED }, undefined, {
      '@capacitor/camera': '8.0.0',
    });
    writeFiles(root, {
      'node_modules/@capacitor/camera/package.json': JSON.stringify({ name: '@capacitor/camera', capacitor: { android: { src: 'android' } } }),
      'node_modules/@capacitor/camera/android/src/main/java/CameraPlugin.java': '@CapacitorPlugin(name = "Camera")\npublic class CameraPlugin extends Plugin {}',
    });
    expect(CapacitorLocalPluginContractLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([]);
  });

  it('red: a name built at runtime is reported as not judged', () => {
    const result = run(shell({ [WEB]: "import { registerPlugin } from '@capacitor/core';\nexport const p = registerPlugin(prefix + 'Settings');" }));
    expect(result.violations).toEqual([expect.stringContaining('the local plugin contract was not judged')]);
  });

  it('iOS (PARTIAL): a Swift CAPBridgedPlugin with the jsName has its pluginMethods compared', () => {
    const swift = (method: string) =>
      `@objc(AppSettingsPlugin)\npublic class AppSettingsPlugin: CAPPlugin, CAPBridgedPlugin {\n  public let identifier = "AppSettingsPlugin"\n  public let jsName = "AppSettings"\n  public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "${method}", returnType: CAPPluginReturnPromise)]\n}`;
    expect(run(shell({ 'ios/App/App/AppSettingsPlugin.swift': swift('open') })).violations).toEqual([]);
    expect(run(shell({ 'ios/App/App/AppSettingsPlugin.swift': swift('show') })).violations).toEqual([
      expect.stringMatching(/'AppSettings' on iOS — open\(\) declared in the TypeScript interface but not exposed as pluginMethods/),
    ]);
  });

  it('red: no android/ shell and no Swift class — judged on no platform, so it does not pass', () => {
    expect(run({ [WEB]: web() }).violations).toEqual([expect.stringContaining('could not be judged on any platform')]);
  });

  it('green: no registerPlugin() anywhere — no local plugin to compare', () => {
    expect(run({ 'src/app/main.ts': 'export const x = 1;' }).violations).toEqual([]);
  });

  it('the native sources are audit-cache inputs (they sit outside the scan)', () => {
    const root = capacitorProject(shell());
    const inputs = CapacitorProjects.fixedPathInputs(root).map(file => file.replace(/\\/g, '/'));
    expect(inputs).toEqual(expect.arrayContaining([expect.stringMatching(/MainActivity\.java$/), expect.stringMatching(/AppSettingsPlugin\.java$/)]));
  });

  it('cannot read: no TypeScript to parse with — fails, never passes', () => {
    const root = capacitorProject(shell());
    const result = withoutTypeScript(() => CapacitorLocalPluginContractLaw.check(ctx(root, IGNORING_SHELLS)));
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/could not load the 'typescript' package/);
  });

  describe('selection (requires)', () => {
    it('selected: @capacitor/core and a config', () => {
      expect(selected(TITLE, { '@capacitor/core': '8.5.1' })).toBe(true);
    });
    it('not selected: no Capacitor', () => {
      expect(selected(TITLE, { '@angular/core': '20' })).toBe(false);
    });
  });
});
