/**
 * #428: CDN and Caching Strategy, Performance Monitoring Standards, Incident
 * Response Protocol and Launch Readiness Checklist are about something that
 * runs for users. A CLI tool or a library has no such subject, so the laws
 * are not selected there; as soon as the project declares one — an HTTP
 * framework, a web surface, a mobile shell, a deploy target — they are.
 * The engine selects a law exactly when `lawRequirementsMet(law.requires)`
 * holds, so the card's own `requires` is what is asserted here.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { lawRequirementsMet } from '../../src/utils/law-requirements';

const CDN = 'CDN and Caching Strategy';
const RUNTIME_LAWS = [
  'Performance Monitoring Standards',
  'Incident Response Protocol',
  'Launch Readiness Checklist',
];
const ALL = [CDN, ...RUNTIME_LAWS];

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'roc-production-subject-')
  );
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

function pkg(deps: Record<string, string> = {}): string {
  return JSON.stringify({
    name: 'fixture',
    version: '1.0.0',
    bin: { fixture: 'dist/cli.js' },
    dependencies: deps,
    devDependencies: { typescript: '5.9.3', jest: '30.0.0' },
  });
}

/** The CLI / library base: TypeScript sources, tests, docs, a CI workflow. */
const CLI_BASE: Record<string, string> = {
  'package.json': pkg({ commander: '14.0.0' }),
  'src/cli.ts':
    "import { Command } from 'commander';\nnew Command().parse();\n",
  'tests/cli.test.ts': "it('runs', () => expect(1).toBe(1));\n",
  // An HTML file inside a test tree is a fixture, not a page this project serves.
  'tests/fixtures/site/index.html': '<!doctype html><html></html>\n',
  'README.md': '# fixture\n',
  '.github/workflows/ci.yml':
    'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n',
};

function selected(root: string): string[] {
  return ALL.filter(title => {
    const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
    if (!law) throw new Error(`law not in the registry: ${title}`);
    return lawRequirementsMet(law.requires, root, []);
  });
}

describe('#428 laws about something that runs for users', () => {
  it('every one of them declares requires', () => {
    for (const title of ALL) {
      const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
      expect(law?.requires).toBeDefined();
    }
  });

  it('a TypeScript CLI / library selects none of them', () => {
    expect(selected(project(CLI_BASE))).toEqual([]);
  });

  it('a Python library selects none of them', () => {
    const root = project({
      'pyproject.toml':
        '[project]\nname = "lib"\nversion = "0.1.0"\ndependencies = ["click>=8"]\n',
      'src/lib/__init__.py': 'x = 1\n',
    });
    expect(selected(root)).toEqual([]);
  });

  it.each([
    ['an Express server', { 'package.json': pkg({ express: '5.1.0' }) }],
    ['a FastAPI service', { 'requirements.txt': 'fastapi==0.115.0\n' }],
    ['a Dockerfile', { Dockerfile: 'FROM node:22\n' }],
    ['a Procfile in a workspace app', { 'apps/api/Procfile': 'web: node x\n' }],
    [
      'a React Native app',
      { 'package.json': pkg({ 'react-native': '0.80.0' }) },
    ],
    [
      'a serverless deploy in CI',
      {
        '.github/workflows/deploy.yml':
          'on: push\njobs:\n  d:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gcloud run deploy api --source .\n',
      },
    ],
  ])('%s selects the runtime laws but not CDN and Caching', (_label, extra) => {
    const got = selected(project({ ...CLI_BASE, ...extra }));
    expect(got).toEqual(RUNTIME_LAWS);
  });

  it.each([
    [
      'react-dom',
      { 'package.json': pkg({ react: '19.1.1', 'react-dom': '19.1.1' }) },
    ],
    ['Angular', { 'package.json': pkg({ '@angular/core': '20.0.0' }) }],
    ['a hosting config', { 'firebase.json': '{ "hosting": {} }\n' }],
    ['a page of its own', { 'public/index.html': '<!doctype html>\n' }],
  ])('%s is a web surface: every one of them is selected', (_label, extra) => {
    expect(selected(project({ ...CLI_BASE, ...extra }))).toEqual(ALL);
  });
});

describe('#428 NX Commands Only Policy needs an Nx or Angular workspace', () => {
  const nxSelected = (files: Record<string, string>): boolean => {
    const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
      l => l.title === 'NX Commands Only Policy'
    );
    if (!law) throw new Error('NX Commands Only Policy not in the registry');
    return lawRequirementsMet(law.requires, project(files), []);
  };

  it('a TypeScript CLI / library without Nx does not select it', () => {
    expect(nxSelected(CLI_BASE)).toBe(false);
  });

  it.each([
    ['nx.json', { 'nx.json': '{}\n' }],
    ['the nx package', { 'package.json': pkg({ nx: '21.0.0' }) }],
    [
      'an Angular project',
      { 'package.json': pkg({ '@angular/core': '20.0.0' }) },
    ],
  ])('%s selects it', (_label, extra) => {
    expect(nxSelected({ ...CLI_BASE, ...extra })).toBe(true);
  });
});
