/**
 * #487 — PatternMatchingUtils.hasAnyRegexPattern called `.test()` on the
 * caller's patterns as given. The database-URL and secret tables of the
 * environment-variable usage analyzer are global (`/g`, `/gi`) module
 * constants, so `lastIndex` carried from one call — and one file — to the
 * next: the same hard-coded connection string in two files was reported for
 * the first only.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { EnvironmentParityStandardsLaw } from '../../src/checkers/deployment-laws/environment-parity-standards';
import { EnvironmentSecurityEnforcementLaw } from '../../src/checkers/security-laws/environment-security-enforcement';
import { FileUtils } from '../../src/utils/file-utils';
import { PatternMatchingUtils } from '../../src/utils/pattern-matching-utils';

describe('#487 hasAnyRegexPattern does not depend on earlier calls', () => {
  it('the same /g pattern on the same text answers true three times', () => {
    const r = /mongodb:\/\/[^\s'"]+/g;
    const s = 'const url = "mongodb://u:p@h/db";';
    const answers = [1, 2, 3].map(() =>
      PatternMatchingUtils.hasAnyRegexPattern(s, [r])
    );
    expect(answers).toEqual([true, true, true]);
  });

  it('leaves the pattern as it found it', () => {
    const r = /secret/gi;
    PatternMatchingUtils.hasAnyRegexPattern('a secret here', [r]);
    expect(r.lastIndex).toBe(0);
  });

  it('a pattern without the flag is unaffected (control)', () => {
    const r = /mongodb:\/\//;
    expect(PatternMatchingUtils.hasAnyRegexPattern('mongodb://h', [r])).toBe(
      true
    );
    expect(PatternMatchingUtils.hasAnyRegexPattern('nothing', [r])).toBe(false);
  });
});

describe('#487 the same connection string in two files is two findings', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-487-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'regex-487', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    const line = 'export const db = "mongodb://user:pass@db.internal/app";\n';
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), line);
    fs.writeFileSync(path.join(dir, 'src', 'b.ts'), line);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reports a.ts and b.ts', () => {
    const { violations = [] } = EnvironmentSecurityEnforcementLaw.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    const reported = violations
      .filter(v => v.includes('Hardcoded database connection string'))
      .map(v => path.basename(v.replace(/: Hardcoded database.*$/, '')));
    expect(reported.sort()).toEqual(['a.ts', 'b.ts']);
  });
});

describe('#487 the tables are shared by two laws: both see every file', () => {
  // The same pattern constants serve Environment Security Enforcement and
  // Environment Parity Standards, so lastIndex carried from one law to the
  // next too: on three identical files one law caught a and c, the other b.
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-487b-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'regex-487b', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    const line = 'export const db = "mongodb://user:pass@db.internal/app";\n';
    for (const name of ['a.ts', 'b.ts', 'c.ts'])
      fs.writeFileSync(path.join(dir, 'src', name), line);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const dbFiles = (violations: string[] = []): string[] =>
    violations
      .filter(v => v.includes('Hardcoded database connection string'))
      .map(v => path.basename(v.replace(/: Hardcoded database.*$/, '')))
      .sort();

  it('Environment Security, then Environment Parity: a, b and c in both', () => {
    const context = {
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    };
    const security = EnvironmentSecurityEnforcementLaw.check(context);
    const parity = EnvironmentParityStandardsLaw.check(context);
    expect({
      security: dbFiles(security.violations),
      parity: dbFiles(parity.violations),
    }).toEqual({
      security: ['a.ts', 'b.ts', 'c.ts'],
      parity: ['a.ts', 'b.ts', 'c.ts'],
    });
  });
});
