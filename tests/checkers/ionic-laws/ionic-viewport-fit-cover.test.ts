/**
 * Ionic Viewport Fit Cover (#266). The index is found the way the Angular
 * application builder finds it (the build target's index option, else
 * <sourceRoot>/index.html), and only the last viewport meta counts.
 */
import { IonicViewportFitCoverLaw as Law } from '../../../src/checkers/ionic-laws/ionic-viewport-fit-cover';
import { manifest, removeProjects } from '../toolkit-fixture';
import { runner } from './ionic-rendering-fixture';

afterAll(removeProjects);

const run = runner(ctx => Law.check(ctx));
const html = (head: string) => `<!doctype html>\n<html>\n<head>\n${head}\n</head>\n<body><app-root></app-root></body>\n</html>`;
const COVER = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />';
const NO_COVER = '<meta name="viewport" content="width=device-width, initial-scale=1" />';
const NX_APP = JSON.stringify({
  name: 'web',
  sourceRoot: 'apps/web/src',
  targets: { build: { executor: '@angular/build:application', options: { browser: 'apps/web/src/main.ts' } } },
});

describe('IonicViewportFitCoverLaw', () => {
  it('red: the viewport meta without viewport-fit=cover, with file:line', () => {
    const result = run({ 'src/index.html': html(NO_COVER) });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/index\.html:4: <meta name="viewport"> has no viewport-fit=cover/),
    ]);
  });

  it('red: no viewport meta at all', () => {
    const result = run({ 'src/index.html': html('<title>x</title>') });
    expect(result.violations).toEqual([expect.stringContaining('src/index.html: no <meta name="viewport">')]);
  });

  it('red: viewport-fit=cover only in a comment does not count', () => {
    const result = run({ 'src/index.html': html(`<!-- ${COVER} -->\n${NO_COVER}`) });
    expect(result.violations).toHaveLength(1);
  });

  it('red: the LAST viewport meta is the one that counts', () => {
    const result = run({ 'src/index.html': html(`${COVER}\n${NO_COVER}`) });
    expect(result.violations).toHaveLength(1);
  });

  it('green: viewport-fit=cover, whatever the spacing, case and attribute order', () => {
    const result = run({
      'src/index.html': html('<meta\n  content="width=device-width , Viewport-Fit = COVER"\n  name="Viewport"\n/>'),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('notes, not violations: pinch-zoom disabled', () => {
    const result = run({
      'src/index.html': html('<meta name="viewport" content="width=device-width, viewport-fit=cover, user-scalable=no, maximum-scale=1" />'),
    });
    expect(result.violations).toEqual([]);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.stringContaining('user-scalable=no disables pinch-zoom'), expect.stringContaining('maximum-scale=1 disables pinch-zoom')])
    );
  });

  it('an Nx app: <sourceRoot>/index.html when the build target names no index (and a root src/index.html is not it)', () => {
    const result = run({
      'apps/web/project.json': NX_APP,
      'apps/web/src/index.html': html(NO_COVER),
      'src/index.html': html(COVER),
    });
    expect(result.violations).toEqual([expect.stringContaining('apps/web/src/index.html:4')]);
  });

  it('angular.json: the index option names the file (string or { input })', () => {
    const result = run({
      'angular.json': JSON.stringify({
        projects: {
          a: { root: '', sourceRoot: 'src', architect: { build: { builder: '@angular-devkit/build-angular:application', options: { index: 'src/main.html' } } } },
          b: { root: 'projects/b', architect: { build: { builder: '@angular/build:application', options: { index: { input: 'projects/b/src/shell.html' } } } } },
          lib: { root: 'projects/lib', architect: { build: { builder: '@angular/build:ng-packagr' } } },
        },
      }),
      'src/main.html': html(COVER),
      'projects/b/src/shell.html': html(NO_COVER),
    });
    expect(result.violations).toEqual([expect.stringContaining('projects/b/src/shell.html:4')]);
  });

  it('cannot read: a build target naming an index that does not exist fails, never passes', () => {
    const result = run({ 'apps/web/project.json': NX_APP });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('apps/web/src/index.html: named by apps/web/project.json but could not be read')]);
  });

  it('cannot read: no index anywhere fails, never passes', () => {
    const result = run({ 'src/main.ts': 'export {};' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('no index.html found')]);
  });

  it('a React/Vite Ionic app: the root index.html', () => {
    const vite = runner(ctx => Law.check(ctx), { 'package.json': manifest({ '@ionic/react': '8.8.17', vite: '7' }) });
    expect(vite({ 'index.html': html(NO_COVER) }).violations).toHaveLength(1);
    expect(vite({ 'index.html': html(COVER) }).violations).toEqual([]);
  });
});
