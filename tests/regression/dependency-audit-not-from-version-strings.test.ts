/**
 * #545 — Dependency Security Scanning reported vulnerabilities that no audit
 * found. `NpmAuditAnalysisService.runNpmAudit` never ran a package manager's
 * audit: it counted one "moderate vulnerability" for every dependency written
 * as an exact 0.x version (`0.3.2`, but not `^0.3.2`), and "critical"/"high"
 * from a two-entry table matched against the version RANGE, not the
 * installed version. `VulnerabilityChecker` kept a second table of the same
 * kind. The message then said "NPM audit failed" / "NPM audit passed" for an
 * audit that never ran.
 *
 * The rule: a vulnerability count comes from an advisory database (a scanner's
 * report), never from the shape of a version string. Where no report was
 * read, the result says so; it does not pass or fail an audit it did not run.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { NpmAuditChecker } from '../../src/checkers/dependency-scanning/npm-audit-checker';
import { VulnerabilityChecker } from '../../src/checkers/dependency-scanning/vulnerability-checker';
import { NpmAuditConstants } from '../../src/laws/dependency-scanning/npm-audit-checker/constants/npm-audit.constants';
import { DependencySecurityScanningLaw } from '../../src/laws/security/dependency-security-scanning';
import * as childProcess from '../../src/utils/child-process';
import { FileUtils } from '../../src/utils/file-utils';

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * A Node project that does what the law asks: a committed lockfile, a
 * licence, and `npm audit` in its scripts. One dependency, installed at
 * `installed`, declared as `range`.
 */
function project(name: string, range: string, installed: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-545-'));
  made.push(dir);
  const write = (rel: string, value: unknown): void => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(value, null, 2));
  };
  write('package.json', {
    name: 'app',
    version: '1.0.0',
    private: true,
    license: 'MIT',
    scripts: { 'audit:prod': 'npm audit --omit=dev' },
    dependencies: { [name]: range },
  });
  write('package-lock.json', {
    name: 'app',
    version: '1.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        dependencies: { [name]: range },
      },
      [`node_modules/${name}`]: { version: installed, license: 'MIT' },
    },
  });
  write(`node_modules/${name}/package.json`, {
    name,
    version: installed,
    license: 'MIT',
  });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
  return dir;
}

const VULNERABILITY_COUNT = /\d+ (critical|high|moderate|low)\b.*vulnerabilit/i;

async function lawViolations(dir: string): Promise<string[]> {
  const result = await DependencySecurityScanningLaw.check({
    projectRoot: dir,
    config,
  });
  return result.violations ?? [];
}

describe('#545 a version string is not an advisory', () => {
  it('an exact 0.x pin is not counted as a moderate vulnerability', async () => {
    const violations = await lawViolations(
      project('tiny-helpers', '0.3.2', '0.3.2')
    );
    expect(violations.filter(v => VULNERABILITY_COUNT.test(v))).toEqual([]);
  });

  it('writing the same pin with ^ does not change the verdict', async () => {
    const exact = await lawViolations(
      project('tiny-helpers', '0.3.2', '0.3.2')
    );
    const caret = await lawViolations(
      project('tiny-helpers', '^0.3.2', '0.3.2')
    );
    expect(exact).toEqual(caret);
  });

  it('a range that mentions a table version is not a critical vulnerability', () => {
    // The range installs 4.17.21; the table matched the range text.
    const result = NpmAuditChecker.check({
      projectRoot: project('lodash', '4.17.20 || ^4.17.21', '4.17.21'),
      config,
    });
    expect(
      (result.violations ?? []).filter(v => VULNERABILITY_COUNT.test(v))
    ).toEqual([]);
  });

  it('the second checker does not keep its own table either', () => {
    const result = VulnerabilityChecker.check({
      projectRoot: project('lodash', '4.17.20 || ^4.17.21', '4.17.21'),
      config,
    });
    expect(
      (result.violations ?? []).filter(v => /severity vulnerabilit/i.test(v))
    ).toEqual([]);
  });
});

describe('#545 an audit that did not run is not reported as passed or failed', () => {
  it('a clean project is not told "NPM audit passed"', () => {
    const result = NpmAuditChecker.check({
      projectRoot: project('tiny-helpers', '^0.3.2', '0.3.2'),
      config,
    });
    expect(result.message).not.toMatch(/NPM audit (passed|failed)/i);
  });
});

describe('#545 controls (hold on develop and after the fix)', () => {
  it('a missing lockfile is still reported', () => {
    const dir = project('tiny-helpers', '^0.3.2', '0.3.2');
    fs.rmSync(path.join(dir, 'package-lock.json'));
    const result = NpmAuditChecker.check({ projectRoot: dir, config });
    expect(result.violations).toContainEqual(
      expect.stringContaining('Missing lock file')
    );
  });

  it('the law starts no package-manager process in a test', async () => {
    // Jest must never reach the network: an audit, if the law runs one, is
    // started through an injected runner, never the real npm.
    const spies = [
      jest.spyOn(childProcess, 'execSync'),
      jest.spyOn(childProcess, 'execFileSync'),
      jest.spyOn(childProcess, 'spawnSync'),
      jest.spyOn(childProcess, 'spawn'),
    ];
    await lawViolations(project('tiny-helpers', '0.3.2', '0.3.2'));
    const firstArgs: string[] = spies.flatMap(spy =>
      (spy.mock.calls as unknown[][]).map(call => String(call[0]))
    );
    const npmCalls = firstArgs.filter(cmd => /\b(npm|yarn|pnpm)\b/.test(cmd));
    spies.forEach(spy => spy.mockRestore());
    expect(npmCalls).toEqual([]);
  });
});

describe('#545 the result says what it does not measure', () => {
  it('a note, in the details and the message, not a violation', async () => {
    const result = await DependencySecurityScanningLaw.check({
      projectRoot: project('tiny-helpers', '^0.3.2', '0.3.2'),
      config,
    });
    expect(result.passed).toBe(true);
    expect(result.judgedNothing).toBeUndefined();
    expect(result.violations).toEqual([]);
    expect(result.details).toContainEqual(
      expect.stringMatching(/Vulnerabilities are not measured by this law/)
    );
    expect(result.message).toMatch(/not measured by this law/);
  });
});

describe('#545 a wildcard is a range, not the letter x', () => {
  it.each([
    'file:../packages/ext',
    'npm:x-lib@1.0.0',
    'workspace:*',
    'github:acme/next-x',
    '^1.2.0',
    '1.2.3',
  ])('%s is not a wildcard', range => {
    expect(NpmAuditConstants.isWildcardVersion(range)).toBe(false);
  });

  it.each([
    '*',
    'x',
    'latest',
    '',
    '1.x',
    '1.2.x',
    '1.2.*',
    'X.X.X',
    '1.0.0 || *',
  ])('"%s" is a wildcard', range => {
    expect(NpmAuditConstants.isWildcardVersion(range)).toBe(true);
  });
});
