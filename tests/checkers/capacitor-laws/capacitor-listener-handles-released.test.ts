/**
 * CapacitorListenerHandlesReleased (#259): a plugin listener added by a
 * component or page and never removed adds one live listener per instance.
 */
import { CapacitorListenerHandlesReleasedLaw } from '../../../src/checkers/capacitor-laws/capacitor-listener-handles-released';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';
import { selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Listener Handles Released';
const HEAD = "import { Component, DestroyRef, Injectable, inject } from '@angular/core';\nimport { App } from '@capacitor/app';\n";
const component = (body: string, decorator = "@Component({ selector: 'app-x', template: '' })") =>
  `${HEAD}${decorator}\nexport class XComponent {\n${body}\n}\n`;
const run = (files: Record<string, string>) =>
  CapacitorListenerHandlesReleasedLaw.check(ctx(capacitorProject(files)));

describe('CapacitorListenerHandlesReleasedLaw (#259)', () => {
  it('red: a component awaits addListener and drops the handle', () => {
    const result = run({
      'src/app/x.component.ts': component("  async ngOnInit() { await App.addListener('resume', () => this.load()); }"),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/src\/app\/x\.component\.ts:5: App\.addListener\('resume'\) in XComponent \(component\) drops its PluginListenerHandle/),
    ]);
  });

  it('red: a bare / void call in a directive drops it too', () => {
    const result = run({
      'src/app/x.directive.ts': component("  constructor() { void App.addListener('pause', () => {}); }", "@Directive({ selector: '[x]' })"),
    });
    expect(result.violations).toEqual([expect.stringContaining('(directive) drops its PluginListenerHandle')]);
  });

  it('red: a page keeps the handle but never removes it', () => {
    const result = run({
      'src/app/home.page.ts': component("  private handle?: { remove(): Promise<void> };\n  async ionViewWillEnter() { this.handle = await App.addListener('appStateChange', () => {}); }"),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/in XComponent \(page\) keeps its handle as 'handle' but never removes it in ngOnDestroy, DestroyRef\.onDestroy, ionViewWillLeave or ionViewDidLeave/),
    ]);
  });

  it('red: removing a different handle does not release this one', () => {
    const body = [
      '  private handle: any; private other: any;',
      "  async ngOnInit() { this.handle = await App.addListener('resume', () => {}); }",
      '  ngOnDestroy() { this.other?.remove(); }',
    ].join('\n');
    expect(run({ 'src/app/x.component.ts': component(body) }).passed).toBe(false);
  });

  it('green: the handle is removed in ngOnDestroy', () => {
    const body = [
      '  private handle: any;',
      "  async ngOnInit() { this.handle = await App.addListener('resume', () => {}); }",
      '  ngOnDestroy() { void this.handle?.remove(); }',
    ].join('\n');
    expect(run({ 'src/app/x.component.ts': component(body) }).violations).toEqual([]);
  });

  it('green: kept in a local and removed through DestroyRef.onDestroy', () => {
    const body = [
      '  private readonly destroyRef = inject(DestroyRef);',
      "  async ngOnInit() {\n    const h = await App.addListener('resume', () => {});\n    this.destroyRef.onDestroy(() => void h.remove());\n  }",
    ].join('\n');
    expect(run({ 'src/app/x.component.ts': component(body) }).violations).toEqual([]);
  });

  it('green: removeAllListeners() in ionViewDidLeave', () => {
    const body = [
      "  ionViewDidEnter() { void App.addListener('resume', () => {}).then(h => (this.h = h)); }",
      '  h: any;',
      '  ionViewDidLeave() { void App.removeAllListeners(); }',
    ].join('\n');
    expect(run({ 'src/app/home.page.ts': component(body) }).violations).toEqual([]);
  });

  it('green: a root service, a token factory and a module function live as long as the app', () => {
    const result = run({
      'src/app/back.service.ts': `${HEAD}@Injectable({ providedIn: 'root' })\nexport class BackService {\n  constructor() { void App.addListener('backButton', () => {}); }\n}\n`,
      'src/app/token.ts': `${HEAD}export const T = { factory: () => App.addListener('appUrlOpen', () => {}) };\nexport async function start() { await App.addListener('resume', () => {}); }\n`,
    });
    expect(result.violations).toEqual([]);
  });

  it("red: an @Injectable without providedIn 'root' is judged as short-lived (documented limit)", () => {
    const result = run({
      'src/app/local.service.ts': `${HEAD}@Injectable()\nexport class LocalService {\n  constructor() { void App.addListener('resume', () => {}); }\n}\n`,
    });
    expect(result.violations).toEqual([expect.stringContaining('(service not provided in root) drops its PluginListenerHandle')]);
  });

  it('red: a registerPlugin() property counts as a plugin; an unrelated addListener does not', () => {
    const body = [
      "  private readonly plugin = registerPlugin<any>('Geo');",
      "  ngOnInit() { this.plugin.addListener('enter', () => {}); this.emitter.addListener('enter', () => {}); }",
      '  emitter: any;',
    ].join('\n');
    const result = run({
      'src/app/x.component.ts': component(body).replace(HEAD, `${HEAD}import { registerPlugin } from '@capacitor/core';\n`),
    });
    expect(result.violations).toEqual([expect.stringContaining("this.plugin.addListener('enter')")]);
  });

  it('green: a spec file is not judged', () => {
    const result = run({
      'src/app/x.component.spec.ts': component("  ngOnInit() { void App.addListener('resume', () => {}); }"),
    });
    expect(result.violations).toEqual([]);
  });

  it('cannot read: no TypeScript to parse with — fails, never passes', () => {
    const root = capacitorProject({ 'src/app/x.component.ts': component('') });
    const result = withoutTypeScript(() => CapacitorListenerHandlesReleasedLaw.check(ctx(root)));
    expect(result.passed).toBe(false);
  });

  describe('selection (requires)', () => {
    it('selected: @capacitor/core and a config', () => {
      expect(selected(TITLE, { '@capacitor/core': '8.5.1' })).toBe(true);
    });
    it('not selected: no Capacitor', () => {
      expect(selected(TITLE, { '@ionic/angular': '8' })).toBe(false);
    });
  });
});
