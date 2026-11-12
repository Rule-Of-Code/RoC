/**
 * Which laws a project gets, through the real loader and the engine's own
 * selector — the path `roc audit` takes with no `project.type` in a config.
 *
 * #203: the default config said `angular` and the engine trusts a configured
 * type, so every project whose type the detector did not map to framework
 * defaults was audited as Angular. Measured on 7.25.0 with no config: a
 * Python project ran 132 laws (the Angular set) instead of 99; a Next app and
 * a Next workspace monorepo ran all 55 Angular-era frontend laws.
 *
 * #214/#206/#31: laws about Angular or NgRx were gated by `stack` alone, so
 * they ran where their subject does not exist — inspecting nothing and
 * reporting "compliance verified", or demanding an artefact of a framework
 * the project does not use.
 */
import { ConfigLoader } from '../../src/config/loader';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

type Selector = { getSelectedLaws(): Array<{ name?: string; title?: string }> };

function selectedTitles(root: string): string[] {
  const auditor = new RuleOfCodeAuditor(ConfigLoader.load(root), root) as unknown as Selector;
  return auditor.getSelectedLaws().map(law => String(law.title ?? law.name));
}

const titleOf = (fragment: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === fragment);
  if (!law) throw new Error(`no law titled ${fragment}`);
  return law.title;
};

const ONPUSH = titleOf('OnPush Change Detection Strategy');
const NGRX_STORE = titleOf('NgRx Store Pattern Mandate (SACRED LAW)');
const NGRX_DEVTOOLS = titleOf('NgRx DevTools Integration Mandate');
const OBSERVABLE_CLEANUP = titleOf('Observable Cleanup Requirements');

const NEXT_DEPS = { next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' };

describe('project type with no project.type in any config (#203)', () => {
  it.each([
    ['a Next app', { 'package.json': manifest(NEXT_DEPS) }, 'react'],
    [
      'a Next app declared only in a workspace member',
      {
        'package.json': JSON.stringify({ name: 'ws', workspaces: ['apps/*'], devDependencies: { typescript: '5' } }),
        'tsconfig.base.json': '{}',
        'apps/web/package.json': manifest(NEXT_DEPS),
      },
      'react',
    ],
    [
      'a React app in an Nx workspace (nx.json is not Angular)',
      { 'package.json': manifest({ nx: '21', react: '19' }), 'nx.json': '{}' },
      'react',
    ],
    ['a Python project', { 'pyproject.toml': '[project]\nname = "x"\n' }, 'python'],
    [
      'a Python project that carries a package.json for tooling',
      {
        'pyproject.toml': '[project]\nname = "x"\n',
        'package.json': JSON.stringify({ devDependencies: { husky: '9', typescript: '5' } }),
      },
      'python',
    ],
    ['a plain TypeScript project', { 'package.json': manifest({}), 'tsconfig.json': '{}' }, 'typescript'],
    ['an Angular app', { 'package.json': manifest({ '@angular/core': '20' }) }, 'angular'],
    ['nothing recognisable', { 'README.md': '# x' }, 'generic'],
  ])('%s → %s', (_label, files, expected) => {
    expect(ConfigLoader.load(project(files)).project.type).toBe(expected);
  });

  it('a type the project declares in its config still wins', () => {
    const root = project({
      'package.json': manifest(NEXT_DEPS),
      'ruleofcode.config.json': JSON.stringify({ project: { type: 'angular' } }),
    });
    expect(ConfigLoader.load(root).project.type).toBe('angular');
  });
});

describe('law selection on real project shapes (#214, #206, #31)', () => {
  it('a Python project runs no frontend law', () => {
    const titles = selectedTitles(project({ 'pyproject.toml': '[project]\nname = "x"\n' }));
    expect(titles).not.toContain(ONPUSH);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('a Next app does not get the Angular or NgRx laws', () => {
    const titles = selectedTitles(project({ 'package.json': manifest(NEXT_DEPS) }));
    expect(titles).not.toContain(ONPUSH);
    expect(titles).not.toContain(NGRX_STORE);
    expect(titles).not.toContain(OBSERVABLE_CLEANUP);
  });

  it('an Angular app without NgRx gets Angular laws and no NgRx law (#31)', () => {
    const titles = selectedTitles(project({ 'package.json': manifest({ '@angular/core': '20', rxjs: '7' }) }));
    expect(titles).toContain(ONPUSH);
    expect(titles).toContain(OBSERVABLE_CLEANUP);
    expect(titles).not.toContain(NGRX_STORE);
    expect(titles).not.toContain(NGRX_DEVTOOLS);
  });

  it('an Angular app with NgRx declared in a workspace member gets the NgRx laws', () => {
    const titles = selectedTitles(
      project({
        'package.json': manifest({ '@angular/core': '20', rxjs: '7' }),
        'apps/shop/package.json': manifest({ '@ngrx/store': '20' }),
      })
    );
    expect(titles).toContain(NGRX_STORE);
    expect(titles).toContain(NGRX_DEVTOOLS);
  });
});

describe('the gated set', () => {
  const gated = (dependency: string): string[] =>
    ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law => law.requires?.anyDependency?.includes(dependency)).map(
      law => law.title
    );

  it('every NgRx law is gated on @ngrx/store', () => {
    const ngrxTitled = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law => /\bNgRx\b/.test(law.title)).map(l => l.title);
    expect(ngrxTitled.length).toBeGreaterThan(0);
    for (const title of ngrxTitled) expect(gated('@ngrx/store')).toContain(title);
  });

  it('No Risk Literals is opt-in by domain, not on by default (#214 row 54)', () => {
    const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === 'No Risk Literals');
    expect(law?.defaultEnabled).toBe(false);
    expect(law?.requires).toBeUndefined();
  });
});

/**
 * #319: file names are not framework evidence. `public/index.html` (Firebase
 * Hosting's default) typed a static site React, and `src/main.js` (the vanilla
 * Vite template) typed a Vite app Vue — the React/Vue and TypeScript laws ran.
 */
describe('a file name is not framework evidence (#319)', () => {
  type Detector = { detectProjectType(root: string): string };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProjectTypeDetector } = require('../../src/utils/config/project-type-detector') as {
    ProjectTypeDetector: Detector;
  };

  it.each([
    ['a static site with only public/index.html', { 'public/index.html': '<html></html>' }],
    ['a Firebase static site', { 'public/index.html': '<html></html>', 'firebase.json': '{"hosting":{"public":"public"}}' }],
    ['src/App.tsx without react', { 'src/App.tsx': 'export const App = () => null;\n' }],
  ])('%s is not react', (_label, files) => {
    expect(ProjectTypeDetector.detectProjectType(project(files))).not.toBe('react');
  });

  it('a vanilla Vite app (vite, src/main.js, no vue) is not vue', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'c', version: '1.0.0', devDependencies: { vite: '5.4.0' } }),
      'index.html': '<html></html>',
      'src/main.js': 'console.log(1);\n',
    });
    expect(ProjectTypeDetector.detectProjectType(root)).not.toBe('vue');
  });

  it('a static site runs neither the React nor the TypeScript laws', () => {
    const titles = selectedTitles(project({ 'public/index.html': '<html></html>', 'firebase.json': '{}' }));
    expect(titles).not.toContain('Test Isolation Enforcement');
    expect(titles).not.toContain('React Dangerous HTML Guarded');
  });

  it.each([
    ['a react dependency', { 'package.json': manifest({ react: '19.3.0', 'react-dom': '19.3.0' }) }, 'react'],
    ['a vue dependency', { 'package.json': manifest({ vue: '3.5.0' }) }, 'vue'],
    ['a .vue component', { 'src/App.vue': '<template><p/></template>\n' }, 'vue'],
  ])('control: %s still decides', (_label, files, type) => {
    expect(ProjectTypeDetector.detectProjectType(project(files as Record<string, string>))).toBe(type);
  });
});
