/**
 * #323: a static site kept none of the laws that read HTML.
 *
 * Until 7.26.4 a static site was typed React from `public/index.html` (#319),
 * which was wrong — but it meant the accessibility laws and the CSP law read
 * its pages and found real defects. Typed `generic` from 7.26.4, it lost them:
 * those laws are `stack: frontend`, and `generic` is not a frontend type.
 * They read plain HTML and the static-hosting header files, so they are
 * selected for a `generic` project that holds an HTML document.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../src/config/loader';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type { AuditResult } from '../../src/core/auditing/audit-types';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-323-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

async function audit(root: string): Promise<AuditResult> {
  const quiet = (): boolean => true;
  const spies = [
    jest.spyOn(console, 'log').mockImplementation(() => undefined),
    jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    jest.spyOn(process.stdout, 'write').mockImplementation(quiet),
    jest.spyOn(process.stderr, 'write').mockImplementation(quiet),
  ];
  try {
    const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
    return await auditor.audit();
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

const selected = (root: string): string[] =>
  (new RuleOfCodeAuditor(ConfigLoader.load(root), root) as unknown as { getSelectedLaws(): Array<{ name: string }> })
    .getSelectedLaws()
    .map(l => l.name);

const HTML_LAWS = ['Form Control Labeling', 'Explicit Button Type', 'Security Standards (XSS Prevention) Policy'];

/** Frontend laws that read framework code, not plain HTML: no flag, no static site. */
const FRAMEWORK_ONLY = ['Accessibility Linting Enforcement', 'Modal Dialog Accessibility', 'Disclosure Control ARIA State'];

const PAGE =
  '<!doctype html>\n<html><head><title>x</title></head>\n<body><form><input type="text" name="q"><button>go</button></form></body></html>\n';

describe('a static site keeps the laws that read HTML (#323)', () => {
  it('they are selected for a generic project with an HTML document', () => {
    const names = selected(fixture({ 'public/index.html': PAGE, 'firebase.json': '{"hosting":{"public":"public"}}' }));
    for (const law of HTML_LAWS) expect(names).toContain(law);
  });

  it('and they find what the page gets wrong', async () => {
    const result = await audit(fixture({ 'public/index.html': PAGE, 'firebase.json': '{"hosting":{"public":"public"}}' }));
    const byTitle = new Map(
      [...result.results.values()].map(r => [(r as { lawTitle: string }).lawTitle, r as { passed: boolean; violations?: string[] }])
    );
    expect(byTitle.get('Form Control Labeling')?.passed).toBe(false);
    expect(byTitle.get('Explicit Button Type')?.passed).toBe(false);
    expect((byTitle.get('Security Standards (XSS Prevention) Policy')?.violations ?? []).join('\n')).toMatch(/Content-Security-Policy/);
  });

  it('a generic project with no HTML (a Go module) does not get them', () => {
    const names = selected(fixture({ 'go.mod': 'module x\n', 'main.go': 'package main\n' }));
    for (const law of HTML_LAWS) expect(names).not.toContain(law);
  });

  it('laws that read no plain HTML stay framework-scoped (they would pass on nothing)', () => {
    const names = selected(fixture({ 'public/index.html': PAGE }));
    for (const law of FRAMEWORK_ONLY) expect(names).not.toContain(law);
  });

  it.each([
    ['a Go coverage report', { 'go.mod': 'module x\n', 'coverage.html': PAGE }],
    ['a Python coverage report', { 'pyproject.toml': '[project]\nname="x"\n', 'htmlcov/index.html': PAGE }],
    ['generated API docs', { 'go.mod': 'module x\n', 'apidocs/index.html': PAGE }],
  ])('generated HTML (%s) does not make a project a static site', (_label, files) => {
    const names = selected(fixture(files as Record<string, string>));
    for (const law of HTML_LAWS) expect(names).not.toContain(law);
  });

  it('control: a framework project selects them as before', () => {
    const names = selected(
      fixture({ 'package.json': JSON.stringify({ name: 'a', dependencies: { react: '19.3.0', 'react-dom': '19.3.0' } }) })
    );
    for (const law of HTML_LAWS) expect(names).toContain(law);
  });
});

/**
 * #326: the HTML walk read the disk and ignored `ignores.global`. A git-ignored
 * build output (MkDocs `site/`) selected the HTML laws locally but not on CI,
 * and ignoring the pages still selected them — then CSP judged nothing, as an
 * error the user could not clear.
 */
describe('only the project\'s own HTML makes it a static site (#326)', () => {
  const git = (root: string, ...args: string[]): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('child_process').execFileSync('git', args, {
      cwd: root,
      stdio: 'ignore',
      env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' },
    });
  };

  it('a git-ignored site/ (MkDocs output) does not select them', () => {
    const root = fixture({ 'go.mod': 'module x\n', 'main.go': 'package main\n', '.gitignore': 'site/\n', 'site/index.html': PAGE });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'init');
    const names = selected(root);
    for (const law of HTML_LAWS) expect(names).not.toContain(law);
  });

  it('a tracked page in a git repository selects them', () => {
    const root = fixture({ 'public/index.html': PAGE, 'firebase.json': '{}' });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'init');
    const names = selected(root);
    for (const law of HTML_LAWS) expect(names).toContain(law);
  });

  it('pages under ignores.global do not select them', () => {
    const root = fixture({
      'go.mod': 'module x\n',
      'site/index.html': PAGE,
      'ruleofcode.config.json': JSON.stringify({ ignores: { global: ['site/**'] } }),
    });
    const names = selected(root);
    for (const law of HTML_LAWS) expect(names).not.toContain(law);
  });

  it.each([['_site/index.html'], ['storybook-static/index.html']])('generated output %s does not select them', file => {
    const names = selected(fixture({ 'go.mod': 'module x\n', [file]: PAGE }));
    for (const law of HTML_LAWS) expect(names).not.toContain(law);
  });
});

/** #327: Accessibility Linting said "compliance verified" when it judged nothing. */
describe('Accessibility Linting Enforcement judges something or says it did not (#327)', () => {
  it('a frontend project with neither Angular templates nor .tsx/.jsx: judged nothing, not compliance', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AccessibilityLintingEnforcementLaw } = require('../../src/checkers/accessibility-laws/accessibility-linting-enforcement');
    const root = fixture({
      'package.json': JSON.stringify({ name: 'v', dependencies: { vue: '3.5.0' } }),
      'src/App.vue': '<template><button>x</button></template>\n',
    });
    const result = AccessibilityLintingEnforcementLaw.check({
      projectRoot: root,
      config: { ignores: { global: [], tests: [], build: [], design: [] }, thresholds: {}, includes: { global: [] }, laws: {} },
    });
    expect(result).toMatchObject({ passed: false, score: 0, judgedNothing: true });
    expect(result.violations.join('\n')).toMatch(/nothing was judged/);
  });
});
