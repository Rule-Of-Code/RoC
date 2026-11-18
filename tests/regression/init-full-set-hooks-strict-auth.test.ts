/**
 * A clean install by the README's Quick start (ruleofcode@7.26.9) found:
 *
 * B3  `init --quick` (and the non-interactive fallback, and the interactive
 *     default) wrote `paretoMode: true`, and the hooks inherit the config's
 *     scope — every new install gated commits on the Pareto subset, with a
 *     liveness floor of 0 because Pareto is a deliberate narrowing.
 * B2  the pre-commit hook ran `npx lint-staged` unconditionally while init
 *     installs neither the package nor a config: under husky's `sh -e` the
 *     first commit of a fresh project failed.
 * B4  TypeScript Strict Mode demanded noImplicitAny/noImplicitThis of a
 *     project with `"strict": true` (which turns them on), and did not follow
 *     `extends`; Authentication Security reported "Insecure password handling
 *     detected" on code that handles no password.
 * #345 the component-spec evidence counted a `createComponent(` in a comment
 *     and a type-only Testing Library import.
 */
import { execFileSync } from '../../src/utils/child-process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AngularTestingExcellenceLaw } from '../../src/checkers/angular-laws/angular-testing-excellence';
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { AuthenticationChecker } from '../../src/checkers/security-laws/authentication/authentication-checker';
import { setupQuickMode } from '../../src/cli/init-helpers';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { GitHooksInstaller } from '../../src/hooks/installer';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-b3-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

const quietly = async <T>(fn: () => T | Promise<T>): Promise<T> => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    return await fn();
  } finally {
    log.mockRestore();
  }
};

describe('B3 init writes the full law set', () => {
  it('quick mode writes paretoMode: false', async () => {
    const root = fixture({ 'package.json': JSON.stringify({ name: 'a', devDependencies: { typescript: '5.6.3' } }) });
    await quietly(() => setupQuickMode(root, { hooks: false }));
    const written = JSON.parse(fs.readFileSync(path.join(root, 'ruleofcode.config.json'), 'utf8'));
    expect(written.laws.paretoMode).toBe(false);
  });

  it('the interactive prompt defaults to the full set', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLawsConfiguration } = require('../../src/cli/init-interactive');
    let asked: Array<{ default?: string }> = [];
    const prompt = (async (questions: Array<{ default?: string }>) => {
      asked = questions;
      return { lawsMode: questions[0]?.default };
    }) as never;
    if (typeof getLawsConfiguration === 'function') {
      await quietly(() => getLawsConfiguration(prompt));
      expect(asked[0]?.default).toBe('full');
    } else {
      // The prompt is not exported under that name; read the source contract.
      const source = fs.readFileSync(path.join(__dirname, '../../src/cli/init-interactive.ts'), 'utf8');
      expect(source).toMatch(/default:\s*'full'/);
      expect(source).not.toMatch(/default:\s*'pareto'/);
    }
  });
});

describe('B2 the pre-commit hook runs lint-staged only when configured', () => {
  const guardOf = (root: string): string => {
    const hook = fs.readFileSync(path.join(root, '.husky', 'pre-commit'), 'utf8');
    const start = hook.indexOf('roc_lint_staged=0');
    const end = hook.indexOf('npx lint-staged', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // The guard block, with the real call swapped for a marker.
    return `${hook.slice(start, end)}echo RUN\nfi\necho DONE\n`;
  };

  it('the hook carries no unconditional lint-staged call', async () => {
    const root = fixture({ 'package.json': JSON.stringify({ name: 'a' }) });
    await quietly(() =>
      GitHooksInstaller.install({ projectRoot: root, config: { ...DEFAULT_CONFIG, hooks: { preCommit: true, prePush: false, commitMsg: false } } as never })
    );
    const hook = fs.readFileSync(path.join(root, '.husky', 'pre-commit'), 'utf8');
    const calls = hook.split('\n').filter(line => /npx lint-staged/.test(line));
    expect(calls).toEqual(['  npx lint-staged']);
    // CONTRIBUTING forbids --no-verify; the hook must not suggest it as a way out.
    expect(hook).not.toMatch(/use 'git commit --no-verify'/);
  });

  it.each([
    ['no lint-staged at all', { 'package.json': JSON.stringify({ name: 'a' }) }, 'DONE'],
    ['the package but no config', { 'package.json': JSON.stringify({ name: 'a', devDependencies: { 'lint-staged': '15.0.0' } }) }, 'DONE'],
    ['a "lint-staged" key in package.json', { 'package.json': JSON.stringify({ name: 'a', 'lint-staged': { '*.ts': 'eslint' } }) }, 'RUN DONE'],
    ['a .lintstagedrc.json', { 'package.json': JSON.stringify({ name: 'a' }), '.lintstagedrc.json': '{}' }, 'RUN DONE'],
    ['a lint-staged.config.js', { 'package.json': JSON.stringify({ name: 'a' }), 'lint-staged.config.js': 'module.exports = {};' }, 'RUN DONE'],
  ])('under sh -e: %s', async (_label, files, expected) => {
    const root = fixture(files as Record<string, string>);
    await quietly(() =>
      GitHooksInstaller.install({ projectRoot: root, config: { ...DEFAULT_CONFIG, hooks: { preCommit: true, prePush: false, commitMsg: false } } as never })
    );
    fs.writeFileSync(path.join(root, 'guard.sh'), guardOf(root));
    const out = execFileSync('sh', ['-e', 'guard.sh'], { cwd: root, encoding: 'utf8' });
    expect(out.trim().split(/\s+/).join(' ')).toBe(expected);
  });
});

describe('B4 TypeScript Strict Mode credits what strict turns on, through extends', () => {
  const strictFindings = (files: Record<string, string>): string[] =>
    (TypeScriptStrictLaw.check({ projectRoot: fixture(files), config: DEFAULT_CONFIG } as never).violations ?? []).filter(v =>
      /noImplicitAny|noImplicitThis|strict mode must be enabled/.test(v)
    );

  it('"strict": true satisfies noImplicitAny and noImplicitThis', () => {
    expect(strictFindings({ 'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }) })).toEqual([]);
  });

  it('strict inherited through extends counts', () => {
    expect(
      strictFindings({
        'tsconfig.base.json': JSON.stringify({ compilerOptions: { strict: true } }),
        'tsconfig.json': JSON.stringify({ extends: './tsconfig.base.json', compilerOptions: {} }),
      })
    ).toEqual([]);
  });

  it('control: an explicit noImplicitAny: false is still a finding', () => {
    expect(strictFindings({ 'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true, noImplicitAny: false } }) })).toEqual([
      'TypeScript noImplicitAny must be true',
    ]);
  });

  it('control: no strict is still a finding', () => {
    expect(strictFindings({ 'tsconfig.json': JSON.stringify({ compilerOptions: {} }) })).toEqual(
      expect.arrayContaining(['TypeScript strict mode must be enabled', 'TypeScript noImplicitAny must be true'])
    );
  });
});

describe('B4 Authentication Security says "insecure" only about insecure code', () => {
  const run = (files: Record<string, string>) =>
    AuthenticationChecker.checkAuthenticationImplementation(fixture(files), DEFAULT_CONFIG as never).violations;

  it('code that handles no password is not "insecure password handling"', () => {
    const violations = run({ 'src/index.ts': 'export const add = (a: number, b: number): number => a + b;\n' });
    expect(violations.join('\n')).not.toMatch(/Insecure password handling|Passwords are handled/);
  });

  it('control: md5 of a password is insecure', () => {
    expect(run({ 'src/auth.ts': "import md5 from 'md5';\nexport const store = (password: string) => md5(password);\n" }).join('\n')).toMatch(
      /Insecure password handling detected/
    );
  });

  it('control: a password with no hashing is named as such, not as "insecure"', () => {
    const text = run({ 'src/auth.ts': 'export function save(user: { password: string }) { return user.password.length; }\n' }).join('\n');
    expect(text).toMatch(/Passwords are handled without a recognised hashing library/);
    expect(text).not.toMatch(/Insecure password handling/);
  });
});

describe('#345 component-spec evidence is read from code', () => {
  const MANIFEST = JSON.stringify({ name: 'a', dependencies: { '@angular/core': '20.0.0' } });
  const COMPONENT = "@Component({ selector: 'app-hero', template: '' })\nexport class Hero {}\n";
  const check = (spec: string): string =>
    (
      AngularTestingExcellenceLaw.check({
        projectRoot: fixture({ 'package.json': MANIFEST, 'src/app/hero.ts': COMPONENT, 'src/app/hero.spec.ts': spec }),
        config: { ...DEFAULT_CONFIG, project: { ...DEFAULT_CONFIG.project, type: 'angular' } },
      } as never).violations ?? []
    ).join('\n');

  it('createComponent and TestBed only in a comment are no evidence', () => {
    const spec =
      "import { Hero } from './hero';\ndescribe('Hero class shape', () => {\n  // We used to call TestBed.createComponent(Hero) here.\n  it('exports the hero component class', () => { expect(Hero).toBeDefined(); });\n});\n";
    expect(check(spec)).toMatch(/missing ComponentFixture/);
    expect(check(spec)).toMatch(/missing TestBed/);
  });

  it('a type-only Testing Library import is no evidence', () => {
    const spec =
      "import type { RenderResult } from '@testing-library/angular';\nimport { Hero } from './hero';\ndescribe('Hero', () => { it('exports the class', () => { const r: RenderResult<Hero> | undefined = undefined; expect(r).toBeUndefined(); }); });\n";
    expect(check(spec)).toMatch(/missing ComponentFixture/);
  });

  it('control: a value import of render still counts', () => {
    const spec =
      "import { render } from '@testing-library/angular';\nimport { Hero } from './hero';\ndescribe('Hero', () => { it('renders', async () => { await render(Hero); }); });\n";
    expect(check(spec)).not.toMatch(/missing ComponentFixture|missing TestBed/);
  });
});

/**
 * #348: a laws.enabled allowlist of 2 laws out of the applicable set printed
 * "✅ CONSTITUTIONAL COMPLIANCE: PASSED" and the victory art under "FULL MODE",
 * because only Pareto was treated as partial.
 */
describe('#348 a narrowed run is PARTIAL N of M, never COMPLIANCE', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ConfigLoader } = require('../../src/config/loader');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RuleOfCodeAuditor } = require('../../src/core/auditing/audit-engine');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AuditResultProcessor } = require('../../src/core/auditing/result-processor');
  const PROJECT = {
    'package.json': JSON.stringify({ name: 'a', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
    'src/index.ts': 'export const add = (a: number, b: number): number => a + b;\n',
  };
  const audit = async (laws: Record<string, unknown>) => {
    const root = fixture({ ...PROJECT, 'ruleofcode.config.json': JSON.stringify({ project: { type: 'typescript' }, laws }) });
    const out: string[] = [];
    const capture = (chunk: unknown): boolean => {
      out.push(String(chunk));
      return true;
    };
    const spies = [
      jest.spyOn(console, 'log').mockImplementation((...a) => {
        out.push(a.map(String).join(' '));
      }),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(process.stdout, 'write').mockImplementation(capture),
      jest.spyOn(process.stderr, 'write').mockImplementation(capture),
    ];
    try {
      const auditor = await RuleOfCodeAuditor.create({ projectRoot: root, config: ConfigLoader.load(root), mode: 'full' });
      const result = await auditor.audit();
      // eslint-disable-next-line no-control-regex
      return { result, text: out.join('\n').replace(/\u001b\[[0-9;]*m/g, '') };
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  };

  it('an allowlist of 2 passing laws: PARTIAL "2 of M", no COMPLIANCE, scope in JSON', async () => {
    const { result, text } = await audit({ enabled: { 'Semantic Versioning Standards': true, 'Data Encryption Standards': true } });
    expect(result.passed).toBe(true);
    expect(result.scope).toMatchObject({ executedLaws: 2, selectedLaws: 2, narrowedBy: 'laws.enabled', partial: true });
    expect(result.scope.applicableLaws).toBeGreaterThan(2);
    expect(text).toContain(
      `PARTIAL SCAN — 2 of ${result.scope.applicableLaws} applicable laws ran (narrowed by laws.enabled). The selected laws passed; no compliance verdict.`
    );
    expect(text).not.toMatch(/CONSTITUTIONAL COMPLIANCE: PASSED/);
    const json = JSON.parse(AuditResultProcessor.exportResults(result, 'json'));
    expect(json.scope).toMatchObject({ executedLaws: 2, partial: true, narrowedBy: 'laws.enabled' });
  });

  it('a refused audit ran nothing: scope.executedLaws 0, selectedLaws the selection, not partial', async () => {
    const { result } = await audit({
      minLawsChecked: 73,
      enabled: { 'Semantic Versioning Standards': true, 'Data Encryption Standards': true },
    });
    expect(result.refused).toMatchObject({ reason: 'liveness-floor', selectedLaws: 2 });
    expect(result.scope).toMatchObject({ executedLaws: 0, selectedLaws: 2, narrowedBy: 'laws.enabled', partial: false });
  });

  it('a refusal with no allowlist also ran nothing: executedLaws 0, not partial', async () => {
    const { result } = await audit({ minLawsChecked: 9999 });
    expect(result.refused).toMatchObject({ reason: 'liveness-floor' });
    expect(result.scope).toMatchObject({ executedLaws: 0, narrowedBy: undefined, partial: false });
    expect(result.scope.selectedLaws).toBe(result.refused.selectedLaws);
    expect(result.scope.selectedLaws).toBe(result.scope.applicableLaws);
  });

  it('control: a waiver is not narrowing — no PARTIAL, M drops by the waived law', async () => {
    const plain = await audit({});
    const waived = await audit({ notApplicable: { 'Data Encryption Standards': 'no data at rest' } });
    expect(plain.result.scope.partial).toBe(false);
    expect(waived.result.scope).toMatchObject({ partial: false, narrowedBy: undefined });
    expect(waived.result.scope.applicableLaws).toBe(plain.result.scope.applicableLaws - 1);
    expect(waived.text).not.toMatch(/PARTIAL SCAN/);
  });
});
