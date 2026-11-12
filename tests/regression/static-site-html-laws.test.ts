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

const HTML_LAWS = [
  'Form Control Labeling',
  'Explicit Button Type',
  'Modal Dialog Accessibility',
  'Disclosure Control ARIA State',
  'Security Standards (XSS Prevention) Policy',
];

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

  it('the linter law, which reads no HTML, stays framework-scoped', () => {
    expect(selected(fixture({ 'public/index.html': PAGE }))).not.toContain('Accessibility Linting Enforcement');
  });

  it('control: a framework project selects them as before', () => {
    const names = selected(
      fixture({ 'package.json': JSON.stringify({ name: 'a', dependencies: { react: '19.3.0', 'react-dom': '19.3.0' } }) })
    );
    for (const law of HTML_LAWS) expect(names).toContain(law);
  });
});
