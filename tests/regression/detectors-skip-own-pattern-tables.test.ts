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
import { TodoManagementLaw } from '../../src/laws/documentation/todo-management';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { FileUtils } from '../../src/utils/file-utils';
import { lawRequirementsMet } from '../../src/utils/law-requirements';

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
    // #549: a service is recognised by what it does (a sign-in call), not by
    // being called AuthService.
    const v = violations({
      'src/auth.ts': [
        "import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';",
        'export class AuthService {',
        '  login(email: string, password: string) {',
        '    return signInWithEmailAndPassword(getAuth(), email, password);',
        '  }',
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

describe('Data Encryption: a dotted name path is not a secret', () => {
  const secretIn = (line: string): boolean => {
    const dir = project({ 'src/k.ts': `${line}\n` });
    return (
      DataEncryptionStandardsLaw.check({ projectRoot: dir, config })
        .violations ?? []
    ).some(v => v.includes('Potential hardcoded secret detected'));
  };

  it("const KEY = 'thresholds.next.guardExemptions' names a config key", () => {
    expect(
      secretIn("export const KEY = 'thresholds.next.guardExemptions';")
    ).toBe(false);
  });

  it("const KEY = 'a8f3k2l9q0x7' is still a secret (control)", () => {
    expect(secretIn("export const KEY = 'a8f3k2l9q0x7';")).toBe(true);
  });
});

describe('#428 Authentication Security is selected only where users reach the code', () => {
  const card = ModularLawsRegistry.getAll().find(
    law => law.name === 'Authentication Security'
  );
  const selected = (manifest: Record<string, unknown>): boolean => {
    const dir = project({});
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'auth-428', version: '1.0.0', ...manifest })
    );
    return lawRequirementsMet(card?.requires, dir);
  };

  it('a command-line tool is not a subject', () => {
    expect(
      selected({
        bin: { tool: 'dist/cli.js' },
        dependencies: { commander: '^12.0.0' },
      })
    ).toBe(false);
  });

  it.each([
    ['a web surface', { 'react-dom': '^18.0.0' }],
    ['an Angular app', { '@angular/core': '^20.0.0' }],
    ['a Node HTTP API', { express: '^4.0.0' }],
    ['a mobile app', { '@capacitor/core': '^6.0.0' }],
  ])('%s is (control)', (_kind, dependencies) => {
    expect(selected({ dependencies })).toBe(true);
  });
});

describe('#426 TODO Management reads Markdown as Markdown', () => {
  const todoCount = async (files: Record<string, string>): Promise<string> => {
    const dir = project(files);
    return (
      (await TodoManagementLaw.check({ projectRoot: dir, config })).message ??
      ''
    );
  };

  it('an apostrophe in prose does not turn an inline `// TODO` example into a TODO', async () => {
    expect(
      await todoCount({
        'CHANGELOG.md': [
          '# Changelog',
          '',
          "- don't read `'a'` as code; a `// TODO` in a string is an example",
          '- a double-backtick span: `` `// TODO` `` is an example too',
          '- a fenced example:',
          '',
          '```ts',
          '// TODO: an example, not a task',
          '```',
          '',
        ].join('\n'),
      })
    ).toContain('compliant: 0 TODOs');
  });

  it('an HTML comment TODO in Markdown and a // TODO in code still count (control)', async () => {
    expect(
      await todoCount({
        'notes.md':
          "It's here.\n<!-- TODO (Sprint 12): write the deployment guide for the team -->\n",
        'src/a.ts':
          '// TODO (Sprint 12): remove the legacy config shim after the migration\nexport const a = 1;\n',
      })
    ).not.toContain('compliant: 0 TODOs');
  });
});

describe('#428 a deployed service keeps Authentication Security', () => {
  it('a Procfile web process (bare node, no framework dependency) is a subject', () => {
    const dir = project({ Procfile: 'web: node server.js\n' });
    const card = ModularLawsRegistry.getAll().find(
      law => law.name === 'Authentication Security'
    );
    expect(lawRequirementsMet(card?.requires, dir)).toBe(true);
  });
});

describe('#426 a .ts test is parsed as TypeScript, not TSX', () => {
  const uncleaned = (body: string): string[] => {
    const dir = project({
      'src/sum.ts':
        'export const sum = (a: number, b: number): number => a + b;\n',
      'src/sum.test.ts': body,
    });
    return (
      TestDataManagementLaw.check({
        projectRoot: dir,
        config: ConfigLoader.load(dir),
      }).violations ?? []
    ).filter(v => v.startsWith('Tests missing proper cleanup'));
  };

  it('a generic arrow does not turn the fixture strings after it into code', () => {
    expect(
      uncleaned(
        [
          "import { sum } from './sum';",
          'const twice = <T>(ask: () => T): T[] => [ask(), ask()];',
          "const timers = 'setInterval(tick, 1000);';",
          "describe('sum', () => {",
          "  it('adds', () => expect(twice(() => sum(1, timers.length))).toHaveLength(2));",
          '});',
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it('a real setInterval with no cleanup is still reported (control)', () => {
    expect(
      uncleaned(
        [
          "import { sum } from './sum';",
          "describe('sum', () => {",
          "  it('ticks', () => {",
          '    setInterval(() => sum(1, 2), 1000);',
          '  });',
          '});',
          '',
        ].join('\n')
      )
    ).toHaveLength(1);
  });
});
