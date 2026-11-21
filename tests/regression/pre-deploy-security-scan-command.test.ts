/**
 * Pre-Deployment Checklist asks whether dependencies are scanned. It read
 * only script NAMES (audit, security, security:check, snyk …), so a project
 * whose `security-audit` script runs `npm audit`, or whose CI runs it, was
 * told scanning was not configured. The command is read now, in package
 * scripts and in CI steps.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PreDeploymentChecklistLaw } from '../../src/laws/deployment/pre-deployment-checklist';
import { FileUtils } from '../../src/utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-scan-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const NOT_SCANNED = 'Security vulnerability scanning not configured';
const pkg = (scripts: Record<string, string>): string =>
  JSON.stringify({ name: 'lib', version: '1.0.0', scripts });

const violations = async (files: Record<string, string>): Promise<string[]> =>
  (
    await PreDeploymentChecklistLaw.check({
      projectRoot: project(files),
      config: FileUtils.getMinimalDefaultConfig(),
    })
  ).violations ?? [];

describe('Pre-Deployment Checklist reads what a script or CI step runs', () => {
  it.each([
    [
      'security-audit: npm audit',
      {
        'package.json': pkg({
          'security-audit': 'npm audit --audit-level=high',
        }),
      },
    ],
    [
      'deps:check: pnpm audit',
      { 'package.json': pkg({ 'deps:check': 'pnpm audit --prod' }) },
    ],
    [
      'a CI step that runs npm audit',
      {
        'package.json': pkg({ test: 'jest' }),
        '.github/workflows/ci.yml':
          'on: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Security audit\n        run: npm audit --audit-level=high\n',
      },
    ],
  ])('%s: scanning is configured', async (_label, files) => {
    expect(await violations(files)).not.toContain(NOT_SCANNED);
  });

  it('red control: a step titled "npm audit" that runs the tests is not a scan', async () => {
    expect(
      await violations({
        'package.json': pkg({ test: 'jest' }),
        '.github/workflows/ci.yml':
          'on: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - name: npm audit\n        run: npm test\n',
      })
    ).toContain(NOT_SCANNED);
  });
});
