/**
 * #433 — the environment-variable usage analyzer (Environment Security
 * Enforcement and Environment Parity Standards) judged every `process.env.X`
 * of a file by a text window around the FIRST occurrence, took `default` or
 * `? ` anywhere in it for a fallback, read law prose and comments as code,
 * flagged the variables a CI system sets, and reported one quoted URL twice.
 * Parity reported a missing `.env.example` twice.
 *
 * Now each read is judged where it stands in the parse, CI-provided names
 * are not asked for a fallback, and each URL in a string is reported once.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { EnvironmentParityStandardsLaw } from '../../src/checkers/deployment-laws/environment-parity-standards';
import { EnvironmentSecurityEnforcementLaw } from '../../src/checkers/security-laws/environment-security-enforcement';
import { FileUtils } from '../../src/utils/file-utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;
const realLoad = jest.requireActual<typeof tsxSource>(
  '../../src/utils/react/tsx-source'
).loadTypeScript;
// jest.config resets mocks before every test: give back the real loader.
beforeEach(() => loadTypeScript.mockImplementation(realLoad));

const config = FileUtils.getMinimalDefaultConfig();

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-433-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'env-433', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** The env-usage findings of Environment Security for one source file. */
function findings(source: string): string[] {
  const dir = project({ 'src/app.ts': source });
  made.push(dir);
  return (
    EnvironmentSecurityEnforcementLaw.check({
      projectRoot: dir,
      config,
    }).violations?.filter(v => /without fallback|Hardcoded URL/.test(v)) ?? []
  );
}

describe('#433 each process.env read is judged where it stands', () => {
  it('a second read without a fallback is reported, though the first has one', () => {
    const v = findings(
      [
        "const base = process.env.API_BASE || 'http://localhost:3000';",
        'export function call(): string {',
        '  return process.env.API_BASE + "/v1";',
        '}',
        'export { base };',
        '',
      ].join('\n')
    );
    expect(v).toEqual([
      expect.stringContaining('API_BASE used without fallback'),
    ]);
  });

  it('the word "default" near a read is not a fallback', () => {
    const v = findings(
      'export const key = process.env.SERVICE_KEY; // default set in deploy\n'
    );
    expect(v).toEqual([
      expect.stringContaining('SERVICE_KEY used without fallback'),
    ]);
  });

  it('a read stored and then checked is handled', () => {
    const v = findings(
      [
        'export function branch(): string | null {',
        '  const name = process.env.RELEASE_BRANCH;',
        '  if (!name) return null;',
        '  return name;',
        '}',
        '',
      ].join('\n')
    );
    expect(v).toEqual([]);
  });

  it('a comparison, an optional chain and a guard before use are handled', () => {
    const v = findings(
      [
        "export const prod = process.env.NODE_ENV !== 'production';",
        'export const trimmed = process.env.LABEL?.trim();',
        'export function token(): string {',
        "  if (!process.env.TOKEN) throw new Error('TOKEN required');",
        '  return process.env.TOKEN;',
        '}',
        '',
      ].join('\n')
    );
    expect(v).toEqual([]);
  });

  it('variables the CI system sets are not asked for a fallback', () => {
    const v = findings(
      [
        'export const sources = [',
        '  process.env.GITHUB_HEAD_REF,',
        '  process.env.CI_COMMIT_BRANCH,',
        '  process.env.BITBUCKET_BRANCH,',
        '];',
        '',
      ].join('\n')
    );
    expect(v).toEqual([]);
  });

  it('process.env.X written in a string or a comment is not a read', () => {
    const v = findings(
      [
        '// read process.env.DATABASE_URL at startup',
        "export const tip = 'Validate process.env.SECRET_KEY before use';",
        '',
      ].join('\n')
    );
    expect(v).toEqual([]);
  });

  it('an unhandled read is still reported (control)', () => {
    const v = findings('export const port = process.env.PORT;\n');
    expect(v).toEqual([expect.stringContaining('PORT used without fallback')]);
  });
});

describe('#433 each URL is reported once, from the string it is in', () => {
  it('a quoted URL is one finding, not two', () => {
    const v = findings(
      "export const api = 'https://api.prod-service.io/v1/orders';\n"
    );
    expect(v).toEqual([
      expect.stringContaining(
        'Hardcoded URL detected: https://api.prod-service.io/v1/orders'
      ),
    ]);
  });

  it('a URL in a comment is not a hardcoded value', () => {
    expect(
      findings('// see https://api.prod-service.io/v1\nexport const x = 1;\n')
    ).toEqual([]);
  });

  it('reserved example hosts are not endpoints', () => {
    expect(
      findings(
        'export const sample = \'const url = "https://api.example.com";\';\n'
      )
    ).toEqual([]);
  });

  it('a URL bound to a documentation name is a link, not an endpoint', () => {
    const v = findings(
      [
        'export const platform = {',
        "  reference: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',",
        '};',
        "export const SAM_REFERENCE = 'https://docs.aws.amazon.com/sam/';",
        '',
      ].join('\n')
    );
    expect(v).toEqual([]);
  });

  it('a URL the code calls is still reported (control)', () => {
    const v = findings(
      "export const load = () => fetch('https://orders.prod-service.io/list');\n"
    );
    expect(v).toContainEqual(
      expect.stringContaining('Hardcoded URL detected: ')
    );
    expect(v.join(' ')).toContain('orders.prod-service.io');
  });
});

describe('#433 a missing .env.example is one Environment Parity finding', () => {
  it('reports the missing contract once', () => {
    const dir = project({ 'src/app.ts': 'export const x = 1;\n' });
    made.push(dir);
    const { violations } = EnvironmentParityStandardsLaw.check({
      projectRoot: dir,
      config,
    });
    expect((violations ?? []).filter(v => /\.env\.example/.test(v))).toEqual([
      expect.stringContaining('No environment contract declared'),
    ]);
  });
});

describe('#433 without the parser, reads and URLs are not judged', () => {
  it('says the files were not read instead of passing them', () => {
    loadTypeScript.mockReturnValue(null);
    const dir = project({
      'src/app.ts': 'export const port = process.env.PORT;\n',
    });
    made.push(dir);
    const violations =
      EnvironmentSecurityEnforcementLaw.check({ projectRoot: dir, config })
        .violations ?? [];
    expect(violations.filter(v => /without fallback/.test(v))).toEqual([]);
    expect(violations).toContainEqual(
      expect.stringContaining(
        'the process.env reads and URLs of 1 file(s) were NOT read'
      )
    );
  });
});

describe('#433 a connection string is a value in a string', () => {
  const dbFindings = (source: string): string[] => {
    const dir = project({ 'src/db.ts': source });
    made.push(dir);
    return (
      EnvironmentSecurityEnforcementLaw.check({ projectRoot: dir, config })
        .violations ?? []
    ).filter(v => v.includes('Hardcoded database connection string'));
  };

  it('a comment naming the schemes is not one', () => {
    expect(
      dbFindings(
        '/** Holds a mongodb://, mysql:// or redis:// connection string. */\nexport const x = 1;\n'
      )
    ).toEqual([]);
  });

  it('a connection string in the code is one (control)', () => {
    expect(
      dbFindings('export const db = "mongodb://user:pass@db.internal/app";\n')
    ).toHaveLength(1);
  });
});
