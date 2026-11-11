/**
 * CapacitorDurableStateOffWebviewStorage (#269): Capacitor's guide calls
 * WebView storage transient; every localStorage / IndexedDB writer needs a
 * native branch or a disposable-keys declaration.
 */
import { CapacitorDurableStateOffWebviewStorageLaw } from '../../../src/checkers/capacitor-laws/capacitor-durable-state-off-webview-storage';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';
import { selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Durable State Off WebView Storage';
const SERVICE = 'src/app/storage/local-storage.service.ts';
const localService = (key = 'key') =>
  [
    "import { LocalValueStore } from './local-value-store';",
    'export class LocalStorageService extends LocalValueStore {',
    `  set(key: string, value: unknown): void { localStorage.setItem(${key}, JSON.stringify(value)); }`,
    '}',
  ].join('\n');
const PORT = 'export abstract class LocalValueStore { abstract set(key: string, value: unknown): void; }';
const run = (files: Record<string, string>, capacitor: Record<string, unknown> = {}) =>
  CapacitorDurableStateOffWebviewStorageLaw.check(ctx(capacitorProject(files), { thresholds: { capacitor } }));

describe('CapacitorDurableStateOffWebviewStorageLaw (#269)', () => {
  it('red: a localStorage service with no native branch (the measured shape)', () => {
    const result = run({ [SERVICE]: localService(), 'src/app/storage/local-value-store.ts': PORT });
    expect(result.violations).toEqual([
      expect.stringMatching(/src\/app\/storage\/local-storage\.service\.ts \(LocalStorageService\): writes localStorage \(a runtime key \(line 3\)\) with no native branch — Capacitor's storage guide/),
    ]);
  });

  it('red: a module-level IndexedDB writer (createObjectStore)', () => {
    const result = run({
      'src/app/db.ts':
        "export function open() { const r = indexedDB.open('app-db', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); return r; }",
    });
    expect(result.violations).toEqual([expect.stringMatching(/src\/app\/db\.ts: writes IndexedDB \('app-db'\)/)]);
  });

  it('green: an indexedDB.open that only reads is not a writer', () => {
    const result = run({
      'src/app/peek.ts':
        "export function peek() { const r = indexedDB.open('someone-elses-db'); r.onsuccess = () => r.result.transaction('s').objectStore('s').get('k'); }",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: the writer imports @capacitor/preferences (native branch in the same file)', () => {
    const result = run({
      [SERVICE]: `import { Preferences } from '@capacitor/preferences';\n${localService()}`,
      'src/app/storage/local-value-store.ts': PORT,
    });
    expect(result.violations).toEqual([]);
  });

  it('green: a provider file that mentions the class chooses Preferences on native', () => {
    const result = run({
      [SERVICE]: localService(),
      'src/app/storage/local-value-store.ts': PORT,
      'src/app/storage/provide-storage.ts': [
        "import { Capacitor } from '@capacitor/core';",
        "import { Preferences } from '@capacitor/preferences';",
        "import { LocalStorageService } from './local-storage.service';",
        'export const store = () => (Capacitor.isNativePlatform() ? Preferences : new LocalStorageService());',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('green: the port it extends is native-backed', () => {
    const result = run({
      [SERVICE]: localService(),
      'src/app/storage/local-value-store.ts': `import { Preferences } from '@capacitor/preferences';\n${PORT}`,
    });
    expect(result.violations).toEqual([]);
  });

  it('green: a store declared in thresholds.capacitor.durableStores', () => {
    const files = { [SERVICE]: `import { CapacitorSQLite } from '@capacitor-community/sqlite';\n${localService()}`, 'src/app/storage/local-value-store.ts': PORT };
    expect(run(files).passed).toBe(false);
    expect(run(files, { durableStores: ['@capacitor-community/sqlite'] }).violations).toEqual([]);
  });

  it('green: every key declared disposable; a runtime key never matches', () => {
    const literal = { [SERVICE]: localService("'ui.theme'"), 'src/app/storage/local-value-store.ts': PORT };
    expect(run(literal, { disposableStorageKeys: ['ui.theme'] }).violations).toEqual([]);
    expect(run(literal, { disposableStorageKeys: ['other'] }).passed).toBe(false);
    const runtime = { [SERVICE]: localService(), 'src/app/storage/local-value-store.ts': PORT };
    expect(run(runtime, { disposableStorageKeys: ['key'] }).passed).toBe(false);
  });

  it('note only: sessionStorage is transient by definition', () => {
    const result = run({ 'src/app/return.service.ts': "export const save = (m: string) => sessionStorage.setItem('return', m);" });
    expect(result.violations).toEqual([]);
    expect(result.suggestions?.[0]).toMatch(/writes sessionStorage — transient by definition/);
  });

  it('green: no WebView storage writer at all', () => {
    expect(run({ 'src/app/x.ts': "export const v = localStorage.getItem('k');" }).violations).toEqual([]);
  });

  it('cannot read: no TypeScript to parse with — fails, never passes', () => {
    const root = capacitorProject({ [SERVICE]: localService() });
    expect(withoutTypeScript(() => CapacitorDurableStateOffWebviewStorageLaw.check(ctx(root))).passed).toBe(false);
  });

  describe('selection (requires)', () => {
    it('selected: @capacitor/core and a config', () => {
      expect(selected(TITLE, { '@capacitor/core': '8.5.1' })).toBe(true);
    });
    it('not selected: a browser-only app', () => {
      expect(selected(TITLE, { '@angular/core': '20' }, { 'src/main.ts': '' })).toBe(false);
    });
  });
});
