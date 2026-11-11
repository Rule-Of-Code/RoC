/**
 * Ionic Edge Chrome Pays Safe Area (#267). Part 1 (asymmetry) and part 2
 * (edge containers: the heuristic, and the closed list from
 * thresholds.ionic.edgeContainers), judged only where index.html declares
 * viewport-fit=cover.
 */
import { IonicEdgeChromePaysSafeAreaLaw as Law } from '../../../src/checkers/ionic-laws/ionic-edge-chrome-pays-safe-area';
import { removeProjects } from '../toolkit-fixture';
import { component, IONIC_ANGULAR, runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const COVER_INDEX = '<html><head><meta name="viewport" content="width=device-width, viewport-fit=cover"></head></html>';
const run = runner(ctx => Law.check(ctx), { 'package.json': IONIC_ANGULAR, 'src/index.html': COVER_INDEX });
const page = (template: string, css: string) =>
  component('src/app/home.page.ts', 'HomePage', { selector: 'app-home', template, css });

const TOP_BAR = '<div class="topbar">t</div><ion-content></ion-content>';

describe('IonicEdgeChromePaysSafeAreaLaw', () => {
  it('red (asymmetry): the bottom inset read, the top never, and no ion-header', () => {
    const result = run(page('<ion-content></ion-content><ion-footer></ion-footer>', '.sheet { padding-bottom: var(--ion-safe-area-bottom); }'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/home\.page\.css:1: the bottom inset is read here, but --ion-safe-area-top \/ safe-area-inset-top is read nowhere and no template uses <ion-header>/),
    ]);
  });

  it('red (asymmetry, reverse): the top inset read, the bottom never, no ion-footer / ion-tab-bar', () => {
    const result = run(page('<ion-header></ion-header><ion-content></ion-content>', '.bar { padding-top: env(safe-area-inset-top); }'));
    expect(result.violations).toEqual([expect.stringContaining('the top inset is read here, but --ion-safe-area-bottom')]);
  });

  it('green (asymmetry): ion-header pays the top edge itself', () => {
    const result = run(page('<ion-header></ion-header><ion-content></ion-content>', '.sheet { padding-bottom: var(--ion-safe-area-bottom); }'));
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('a read inside a CSS comment is not a read', () => {
    const result = run(
      page('<ion-content></ion-content><ion-footer></ion-footer>', '/* padding-top: var(--ion-safe-area-top) */\n.sheet { padding-bottom: var(--ion-safe-area-bottom); }')
    );
    expect(result.violations).toHaveLength(1);
  });

  it('red (heuristic): a fixed bar at top: 0 that never reads the top inset', () => {
    const result = run(page(TOP_BAR, '.topbar {\n  position: fixed;\n  top: 0;\n  padding: 8px;\n}'));
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/home\.page\.css:1: \.topbar \(used at src\/app\/home\.page\.html:1\) is fixed at top: 0 and no rule for it reads --ion-safe-area-top/),
    ]);
  });

  it('green (heuristic): the bar reads the inset in another rule of its cascade (SCSS nesting, media query)', () => {
    const result = run({
      ...component('src/app/home.page.ts', 'HomePage', { selector: 'app-home', template: TOP_BAR }),
      'src/styles/chrome.scss': [
        '// the bar',
        '.topbar { position: sticky; top: 0; }',
        '.shell {',
        '  @media (min-width: 1px) {',
        '    .topbar { padding-top: calc(8px + var(--ion-safe-area-top, 0px)); }',
        '  }',
        '}',
        '.x { padding-bottom: var(--ion-safe-area-bottom); }',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('a positioned rule for a class no template uses is not an edge container', () => {
    const result = run(page('<ion-header></ion-header><ion-content></ion-content>', '.unused { position: fixed; top: 0; }'));
    expect(result.violations).toEqual([]);
  });

  it('declared list: replaces the heuristic; the last declaration on the edge must read the inset', () => {
    const css = [
      '.topbar { position: fixed; top: 0; padding-top: var(--ion-safe-area-top); }',
      '.topbar { padding: 0; }',
      '.bottombar { padding-bottom: var(--ion-safe-area-bottom); }',
    ].join('\n');
    const result = run(page(TOP_BAR, css), {
      thresholds: { ionic: { edgeContainers: [{ selector: '.topbar', edge: 'top' }, { selector: '.bottombar', edge: 'bottom' }] } },
    });
    expect(result.violations).toEqual([
      expect.stringContaining("'.topbar' (top edge) — its last padding / margin / top / inset declaration does not read --ion-safe-area-top"),
    ]);
  });

  it('declared list: a selector found in no stylesheet is a violation (the list cannot go stale)', () => {
    const result = run(page('<ion-header></ion-header><ion-content></ion-content>', '.x { color: red; }'), {
      thresholds: { ionic: { edgeContainers: [{ selector: '.gone', edge: 'top' }] } },
    });
    expect(result.violations).toEqual([expect.stringContaining("'.gone' is not found in any stylesheet")]);
  });

  it('declared list: green when every declared container pays its edge', () => {
    const result = run(page(TOP_BAR, '.topbar { position: fixed; top: 0; padding: var(--ion-safe-area-top) 8px 0; }\n.x { padding-bottom: var(--ion-safe-area-bottom); }'), {
      thresholds: { ionic: { edgeContainers: [{ selector: '.topbar', edge: 'top' }] } },
    });
    expect(result.violations).toEqual([]);
  });

  it('not judged without viewport-fit=cover (the viewport law fires first), and it says so', () => {
    const bare = runner(ctx => Law.check(ctx), {
      'package.json': IONIC_ANGULAR,
      'src/index.html': '<html><head><meta name="viewport" content="width=device-width"></head></html>',
    });
    const result = bare(page(TOP_BAR, '.topbar { position: fixed; top: 0; }'));
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual([expect.stringContaining('not judged: no index.html with viewport-fit=cover')]);
  });

  it('cannot read: an unreadable styleUrl is reported, never passed', () => {
    const result = run({
      'src/app/a.component.ts': "import { Component } from '@angular/core';\n@Component({ selector: 'app-a', template: '', styleUrl: './gone.css' })\nexport class AComponent {}",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining("'./gone.css' could not be read")]);
  });
});
