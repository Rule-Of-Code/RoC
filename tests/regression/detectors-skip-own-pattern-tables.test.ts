/**
 * #426 (M3) — detectors judged their own pattern tables, the law registry's
 * prose and their fixture strings as the project's code: Data Encryption
 * flagged `WEAK_ALGORITHMS = ['MD5', …]`, Authentication Security found an
 * "insecure password" in `/md5.*password/` and an auth service in
 * `/AuthService/`, Test Data Management found hardcoded data in the strings
 * of its own test. The general rule: a pattern counts where it starts in
 * code; a string counts only where the code hands it to an API.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AuthenticationSecurityLaw } from '../../src/checkers/security-laws/authentication-security';
import { DataEncryptionStandardsLaw } from '../../src/checkers/security-laws/data-encryption-standards';
import { ConfigLoader } from '../../src/config/loader';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { FileUtils } from '../../src/utils/file-utils';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-426-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'm3-426', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const config = FileUtils.getMinimalDefaultConfig();

/** A detector's data module: tables, patterns and messages, no use of any. */
const PATTERN_TABLE = [
  "export const WEAK_ALGORITHMS = ['MD5', 'SHA1', 'DES', 'RC4'] as const;",
  'export const INSECURE = [/md5.*password/i, /AuthService/, /refreshToken/];',
  "export const PROTOCOLS = ['http://', 'git://'];",
  "export const RANDOM = 'Math.random';",
  'export const MESSAGES = {',
  "  weakHash: 'Using weak hash algorithms (MD5/SHA1)',",
  '  secret: \'password = "hunter2hunter2" in code is a hardcoded secret\',',
  "  base64: 'btoa(password) is not encryption',",
  '};',
  '',
].join('\n');

describe('#426 Data Encryption Standards judges code, not pattern tables', () => {
  it('a detector data module is no finding', () => {
    const dir = project({ 'src/patterns.ts': PATTERN_TABLE });
    const v =
      DataEncryptionStandardsLaw.check({ projectRoot: dir, config })
        .violations ?? [];
    expect(v.filter(x => x.includes('patterns.ts'))).toEqual([]);
  });

  it('weak hashing, a secret and an http URL in code are still found (control)', () => {
    const dir = project({
      'src/real.ts': [
        "import { createHash } from 'crypto';",
        "export const h = (s: string): string => createHash('md5').update(s).digest('hex');",
        'export const password = "hunter2hunter2";',
        "export const api = 'http://orders.prod-service.io/v1';",
        '',
      ].join('\n'),
    });
    const v = (
      DataEncryptionStandardsLaw.check({ projectRoot: dir, config })
        .violations ?? []
    ).join('\n');
    expect(v).toContain('Weak encryption algorithm detected: MD5');
    expect(v).toContain('Potential hardcoded secret detected');
    expect(v).toContain('HTTP connections detected');
  });
});

describe('#426 Authentication Security judges code, not its own patterns', () => {
  const violations = (files: Record<string, string>): string[] =>
    AuthenticationSecurityLaw.check({ projectRoot: project(files), config })
      .violations ?? [];

  it('/md5.*password/ in a table is not insecure handling; /AuthService/ is no service', () => {
    const v = violations({ 'src/patterns.ts': PATTERN_TABLE });
    expect(v).not.toContain('Insecure password handling detected');
    expect(v).toContain('No authentication service implementation found');
    expect(v).toContain('No proper token management implementation found');
  });

  it('a real service and token storage are recognised (control)', () => {
    const v = violations({
      'src/auth.ts': [
        'export class AuthService {',
        '  save(t: string): void {',
        "    localStorage.setItem('token', t);",
        '  }',
        '}',
        '',
      ].join('\n'),
    });
    expect(v).not.toContain('No authentication service implementation found');
    expect(v).not.toContain('No proper token management implementation found');
  });
});

describe('#426 Test Data Management judges code, not fixture strings', () => {
  const hardcoded = (testBody: string): boolean => {
    const dir = project({
      'src/sum.ts':
        'export const sum = (a: number, b: number): number => a + b;\n',
      'src/sum.test.ts': [
        "import { sum } from './sum';",
        "describe('sum', () => {",
        testBody,
        "  it('adds', () => {",
        '    expect(sum(1, 2)).toBe(3);',
        '  });',
        '});',
        '',
      ].join('\n'),
    });
    const v =
      TestDataManagementLaw.check({
        projectRoot: dir,
        config: ConfigLoader.load(dir),
      }).violations ?? [];
    return v.some(x => x.startsWith('Found hardcoded test data'));
  };

  it('a detector test keeping its inputs as source strings is not hardcoded data', () => {
    expect(
      hardcoded(
        [
          '  const fixture = `',
          "    const users = [{ id: '1', name: 'a' }];",
          '    jest.fn().mockReturnValue(12345);',
          '  `;',
          "  it('reads the fixture', () => expect(fixture.length).toBeGreaterThan(0));",
        ].join('\n')
      )
    ).toBe(false);
  });

  it('an inline array of records in the test code is still reported (control)', () => {
    expect(
      hardcoded(
        [
          "  const users = [{ id: '1', name: 'a' }];",
          "  it('has users', () => expect(users).toHaveLength(1));",
        ].join('\n')
      )
    ).toBe(true);
  });
});
