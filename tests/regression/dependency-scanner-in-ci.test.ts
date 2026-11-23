/**
 * #563 — Dependency Security Scanning looked for the scanner in a list of
 * gate files of its own, without GitHub Actions: a project whose only gate
 * was a workflow running `npm audit` was told "Security audit configuration
 * missing". CI is now read through the shared CI discovery, so every
 * provider the tool knows (and a `pathMappings.cicdConfig` the project
 * declares) counts.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { VulnerabilityChecker } from '../../src/checkers/dependency-scanning/vulnerability-checker';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { FileUtils } from '../../src/utils/file-utils';

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-563-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'ci-563', version: '1.0.0', license: 'MIT' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const workflow = (step: string): string =>
  [
    'name: ci',
    'on: [push]',
    'jobs:',
    '  audit:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - run: npm ci',
    `      - run: ${step}`,
    '',
  ].join('\n');

const MISSING = 'Security audit configuration missing';

function violations(dir: string, cfg: RuleOfCodeConfig = config): string[] {
  return (
    VulnerabilityChecker.check({ projectRoot: dir, config: cfg }).violations ??
    []
  );
}

describe('#563 a scanner in CI is a scanner in the gate', () => {
  it('npm audit in a GitHub Actions workflow is seen', () => {
    const dir = project({
      '.github/workflows/ci.yml': workflow('npm audit --omit=dev'),
    });
    expect(violations(dir)).not.toContain(MISSING);
  });

  it('osv-scanner in a GitLab pipeline is seen', () => {
    const dir = project({
      '.gitlab-ci.yml':
        'audit:\n  script:\n    - osv-scanner --lockfile package-lock.json\n',
    });
    expect(violations(dir)).not.toContain(MISSING);
  });

  it('a CI file the project declares in pathMappings.cicdConfig is read', () => {
    const dir = project({
      'ci/pipeline.yml': 'steps:\n  - run: pnpm audit --prod\n',
    });
    const declared = {
      ...config,
      pathMappings: { cicdConfig: 'ci/pipeline.yml' },
    } as RuleOfCodeConfig;
    expect(violations(dir, declared)).not.toContain(MISSING);
  });
});

describe('#563 controls (hold on develop and after the fix)', () => {
  it('a workflow without a scanner step is still reported', () => {
    const dir = project({ '.github/workflows/ci.yml': workflow('npm test') });
    expect(violations(dir)).toContain(MISSING);
  });

  it('npm audit in package.json scripts is still seen', () => {
    const dir = project({});
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'ci-563',
        version: '1.0.0',
        scripts: { 'audit:prod': 'npm audit --omit=dev' },
      })
    );
    expect(violations(dir)).not.toContain(MISSING);
  });
});
