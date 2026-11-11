/**
 * CapacitorServiceWorkerNativeDecision (#268): an Angular service worker
 * enabled by !isDevMode() runs in the native shell and serves the previous
 * release on the first cold start after a store update, unless it is off on
 * native or SwUpdate is handled.
 */
import { CapacitorServiceWorkerNativeDecisionLaw } from '../../../src/checkers/capacitor-laws/capacitor-service-worker-native-decision';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';
import { selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Service Worker Native Decision';
const CONFIG = 'src/app/app.config.ts';
const registration = (enabled: string | null, extraImport = '') =>
  [
    "import { isDevMode } from '@angular/core';",
    "import { provideServiceWorker } from '@angular/service-worker';",
    extraImport,
    `export const appConfig = { providers: [provideServiceWorker('ngsw-worker.js', { ${enabled === null ? '' : `enabled: ${enabled}, `}registrationStrategy: 'registerWhenStable:30000' })] };`,
  ].join('\n');
const UPDATES = [
  "import { SwUpdate } from '@angular/service-worker';",
  'export function start(updates: SwUpdate, doc: Document) {',
  "  updates.versionUpdates.subscribe(e => { if (e.type === 'VERSION_READY') doc.location.reload(); });",
  '  updates.unrecoverable.subscribe(() => doc.location.reload());',
  '}',
].join('\n');
const run = (files: Record<string, string>, thresholds: Record<string, unknown> = {}) =>
  CapacitorServiceWorkerNativeDecisionLaw.check(ctx(capacitorProject(files), { thresholds }));

describe('CapacitorServiceWorkerNativeDecisionLaw (#268)', () => {
  it('red: enabled: !isDevMode() and no SwUpdate handling (the measured state)', () => {
    const result = run({ [CONFIG]: registration('!isDevMode()') });
    expect(result.violations).toEqual([
      expect.stringMatching(/src\/app\/app\.config\.ts:4: the Angular service worker is registered \(enabled: !isDevMode\(\)\) and nothing turns it off in the native shell.*lacks versionUpdates VERSION_READY, a location\.reload\(\), unrecoverable/),
    ]);
  });

  it('red: enabled left to the default (true)', () => {
    expect(run({ [CONFIG]: registration(null) }).violations).toEqual([
      expect.stringContaining('enabled is not set (Angular defaults to true)'),
    ]);
  });

  it('red: ServiceWorkerModule.register with a reload but no unrecoverable handler', () => {
    const result = run({
      'src/app/app.module.ts':
        "import { ServiceWorkerModule } from '@angular/service-worker';\nexport const imports = [ServiceWorkerModule.register('ngsw-worker.js', { enabled: true })];",
      'src/app/updates.ts': UPDATES.replace("  updates.unrecoverable.subscribe(() => doc.location.reload());\n", ''),
    });
    expect(result.violations).toEqual([expect.stringContaining('SwUpdate handling lacks unrecoverable')]);
  });

  it('green: the enabled expression turns it off on native', () => {
    const result = run({
      [CONFIG]: registration('!isDevMode() && !Capacitor.isNativePlatform()', "import { Capacitor } from '@capacitor/core';"),
    });
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('green: a project flag declared in thresholds.capacitor.nativeFlag', () => {
    const files = { [CONFIG]: registration('!isDevMode() && !IS_NATIVE', "import { IS_NATIVE } from './platform';") };
    expect(run(files).passed).toBe(false);
    expect(run(files, { capacitor: { nativeFlag: ['IS_NATIVE'] } }).violations).toEqual([]);
  });

  it('green with a note: kept on native, VERSION_READY reloads and unrecoverable is handled', () => {
    const result = run({ [CONFIG]: registration('!isDevMode()'), 'src/app/updates.ts': UPDATES });
    expect(result.violations).toEqual([]);
    expect(result.suggestions?.[0]).toMatch(/shorten the stale window .* do not remove the first cold start/);
  });

  it('green: no registration in source — no worker to decide about', () => {
    expect(run({ 'src/app/updates.ts': UPDATES }).violations).toEqual([]);
  });

  it('a registration in a spec file is not the app', () => {
    expect(run({ 'src/app/app.config.spec.ts': registration('true') }).violations).toEqual([]);
  });

  it('cannot read: no TypeScript to parse with — fails, never passes', () => {
    const root = capacitorProject({ [CONFIG]: registration('!isDevMode()') });
    expect(withoutTypeScript(() => CapacitorServiceWorkerNativeDecisionLaw.check(ctx(root))).passed).toBe(false);
  });

  describe('selection (requires)', () => {
    it('selected: Capacitor and @angular/service-worker', () => {
      expect(selected(TITLE, { '@capacitor/core': '8', '@angular/service-worker': '22' })).toBe(true);
    });
    it('not selected: Capacitor without @angular/service-worker', () => {
      expect(selected(TITLE, { '@capacitor/core': '8' })).toBe(false);
    });
    it('not selected: @angular/service-worker without Capacitor', () => {
      expect(selected(TITLE, { '@angular/service-worker': '22' })).toBe(false);
    });
  });
});
