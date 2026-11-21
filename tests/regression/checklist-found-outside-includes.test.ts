/**
 * Pre-Deployment Checklist — a committed PRE_DEPLOYMENT_CHECKLIST.md was
 * reported missing when `includes.global` names only source (this
 * repository: src/**\/*.ts, scripts/**\/*.js, tests/**\/*.ts). The validator
 * found the checklist through the source scan, which applies the includes.
 * The checklist is a project file at the root: it is looked up at its path.
 * `ignores.global` can still leave it out.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import { ChecklistDocumentValidator } from '../../src/laws/deployment/pre-deployment/checklist-validator';

const CHECKLIST = [
  '# Pre-Deployment Checklist',
  '- [ ] The build compiles and the test suite passes',
  '- [ ] Security: npm audit, no secrets in the package',
  '- [ ] Rollback: deprecate the version and ship a patch',
  '',
].join('\n');

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);
const project = (
  files: Record<string, string>,
  config: Record<string, unknown>
): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-checklist-'));
  dirs.push(dir);
  const all: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'lib', version: '1.0.0' }),
    'src/index.ts': 'export const x = 1;\n',
    'ruleofcode.config.json': JSON.stringify(config),
    ...files,
  };
  for (const [rel, text] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
};
const check = (dir: string) =>
  new ChecklistDocumentValidator().checkPreDeploymentChecklist(
    dir,
    ConfigLoader.load(dir)
  );

const SOURCE_ONLY = { includes: { global: ['src/**/*.ts'] } };

describe('a root PRE_DEPLOYMENT_CHECKLIST.md is found whatever includes say', () => {
  it('includes name only src/**/*.ts: the checklist exists and covers its concerns', () => {
    const result = check(
      project({ 'PRE_DEPLOYMENT_CHECKLIST.md': CHECKLIST }, SOURCE_ONLY)
    );
    expect(result.exists).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(result.missingConcerns).toEqual([]);
  });

  it('no includes: found, as before', () => {
    const result = check(
      project({ 'PRE_DEPLOYMENT_CHECKLIST.md': CHECKLIST }, {})
    );
    expect(result.exists).toBe(true);
    expect(result.isComplete).toBe(true);
  });

  it('only under docs/: not the root checklist, so missing (and not read from the root)', () => {
    const result = check(
      project({ 'docs/PRE_DEPLOYMENT_CHECKLIST.md': CHECKLIST }, {})
    );
    expect(result.exists).toBe(false);
  });

  it('ignores.global names it: left out', () => {
    const result = check(
      project(
        { 'PRE_DEPLOYMENT_CHECKLIST.md': CHECKLIST },
        { ignores: { global: ['PRE_DEPLOYMENT_CHECKLIST.md'] } }
      )
    );
    expect(result.exists).toBe(false);
  });

  it('no checklist at all: missing, as before', () => {
    expect(check(project({}, SOURCE_ONLY)).exists).toBe(false);
  });
});
