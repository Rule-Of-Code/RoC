/**
 * #320: the report did not say which project type selected the laws.
 *
 * On a Next app with no config the engine selected the React/Next laws as
 * `react`, while six results echoed a minimal default config saying
 * `generic` (their result builders filled one in) and no field carried the
 * detected type. The user could not see why React laws ran — which is what
 * made #319 (a static site typed React) hard to spot.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../src/config/loader';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import type { AuditResult } from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-320-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

async function audit(root: string): Promise<{ result: AuditResult; out: string }> {
  const chunks: string[] = [];
  const capture = (chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const log = jest.spyOn(console, 'log').mockImplementation((...args) => {
    chunks.push(args.map(String).join(' '));
  });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const out = jest.spyOn(process.stdout, 'write').mockImplementation(capture);
  const err = jest.spyOn(process.stderr, 'write').mockImplementation(capture);
  try {
    const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
    return { result: await auditor.audit(), out: chunks.join('\n') };
  } finally {
    log.mockRestore();
    warn.mockRestore();
    out.mockRestore();
    err.mockRestore();
  }
}

const NEXT = JSON.stringify({ name: 'a', dependencies: { next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' } });

describe('the report says which project type selected the laws (#320)', () => {
  it('a Next app with no config: detected react, in the JSON and the console header', async () => {
    const { result, out } = await audit(fixture({ 'package.json': NEXT }));
    const json = JSON.parse(AuditResultProcessor.exportResults(result, 'json'));
    expect(json.project).toEqual({ type: 'react', source: 'detected' });
    // eslint-disable-next-line no-control-regex
    expect(out.replace(/\u001b\[[0-9;]*m/g, '')).toMatch(/Project type: react \(detected\)/);
  });

  it('every law result echoes the config the law ran with — none says generic', async () => {
    const { result } = await audit(fixture({ 'package.json': NEXT }));
    const types = new Set(
      [...result.results.values()].map(r => (r as { config?: { project?: { type?: string } } }).config?.project?.type)
    );
    expect([...types]).toEqual(['react']);
  });

  it('a type the config declares is reported as configured', async () => {
    const root = fixture({
      'package.json': NEXT,
      'ruleofcode.config.json': JSON.stringify({ project: { type: 'node' } }),
    });
    const { result } = await audit(root);
    expect(result.project).toEqual({ type: 'node', source: 'configured' });
  });

  it('nothing detected and no type configured: generic, default', async () => {
    const { result } = await audit(fixture({ 'public/index.html': '<html></html>' }));
    expect(result.project).toEqual({ type: 'generic', source: 'default' });
  });
});
