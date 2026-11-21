/**
 * Constitutional Compliance Headers asked every TypeScript file for a license
 * header, plus a header template, governance docs and stamping automation. A
 * repository that states its terms once — a LICENSE file at the root and the
 * license field in package.json, which npm and every dependency scanner read
 * — has said what a per-file header would repeat. That is enough now. A
 * repository that states them nowhere is judged as before.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ConstitutionalComplianceHeadersLaw } from '../../src/checkers/constitutional-laws/constitutional-compliance-headers';
import { FileUtils } from '../../src/utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-headers-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const check = (files: Record<string, string>) =>
  ConstitutionalComplianceHeadersLaw.check({
    projectRoot: project(files),
    config: FileUtils.getMinimalDefaultConfig(),
  });

const SOURCES: Record<string, string> = {
  'src/a.ts': 'export const a = 1;\n',
  'src/b.ts': 'export const b = 2;\n',
};
const pkg = (extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ name: 'lib', version: '1.0.0', ...extra });

describe('Constitutional Compliance Headers: a repository-level license is enough', () => {
  it('LICENSE + package.json license: passes, and says why', () => {
    const result = check({
      ...SOURCES,
      LICENSE: 'MIT License\n',
      'package.json': pkg({ license: 'MIT' }),
    });
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('LICENSE + package.json license (MIT)');
  });

  it.each([
    [
      'a LICENSE file alone',
      { LICENSE: 'MIT License\n', 'package.json': pkg() },
    ],
    ['a license field alone', { 'package.json': pkg({ license: 'MIT' }) }],
    ['neither', { 'package.json': pkg() }],
  ])('red control — %s: the files are still judged', (_label, extra) => {
    const result = check({ ...SOURCES, ...extra });
    expect(result.passed).toBe(false);
    expect(result.violations?.length).toBeGreaterThan(0);
  });
});
