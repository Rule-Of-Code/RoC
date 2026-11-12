/**
 * Testing-law residuals of 7.26.x.
 *
 * #303: `generic` — the config default, and the type left when the detector
 * recognises nothing — selected every `stack: typescript` law, so a Go module
 * failed Test Isolation Enforcement for having no TypeScript tests.
 *
 * #304: Unit Test Quality Standards built its test-file list with a glob that
 * ignored the project's config, so a root-relative `ignores.global` entry hid
 * nothing, and findings printed absolute paths with platform separators.
 *
 * #310: two Test Data Management findings named no files, and "not properly
 * mocked" read any `import … from` as an external dependency.
 */
import { ConfigLoader } from '../../src/config/loader';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { AuditLivenessLaw } from '../../src/checkers/meta-gate-laws/audit-liveness';
import { UnitTestQualityLaw } from '../../src/checkers/testing-laws/unit-test-quality';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { TestIsolationEnforcementLaw } from '../../src/laws/testing/test-isolation-enforcement';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { FileFilterUtils } from '../../src/utils/file-filter-utils';
import { FileUtils } from '../../src/utils/file-utils';
import { lawAppliesToProjectType, runsWithoutAllowlist } from '../../src/utils/law-identity';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);
afterEach(() => jest.restoreAllMocks());

/** The gate with the project root (written so this file also compiles against the pre-fix signature). */
type Gate = (stack: string | undefined, projectType: string | undefined, projectRoot?: string) => boolean;
const applies: Gate = lawAppliesToProjectType;
const registryApplies: Gate = ModularLawsRegistry.lawAppliesToProjectType.bind(ModularLawsRegistry);

/** What Test Data Management says when no test imports an external client. */
const MOCKING_NOT_JUDGED =
  'Mocking not judged: no test file imports a filesystem, network, database or process client, so there is nothing to mock';

const GO_MODULE = {
  'go.mod': 'module example.com/fx\n\ngo 1.22\n',
  'cmd/main.go': 'package main\n\nfunc main() {}\n',
};
const STATIC_SITE = {
  'index.html': '<!doctype html><title>x</title><script src="js/app.js"></script>\n',
  'js/app.js': 'document.title = "x";\n',
};

const TS_STACK = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(l => l.stack === 'typescript').map(l => l.title);

function selectedTitles(root: string): string[] {
  const auditor = new RuleOfCodeAuditor(ConfigLoader.load(root), root) as unknown as {
    getSelectedLaws(): Array<{ name?: string; title?: string }>;
  };
  return auditor.getSelectedLaws().map(law => String(law.title ?? law.name));
}

/** Run a law the way the registry does: with the project root published to the ignore matcher. */
async function asRegistry<T>(root: string, run: () => T | Promise<T>): Promise<T> {
  FileFilterUtils.currentProjectRoot = root;
  try {
    return await run();
  } finally {
    FileFilterUtils.currentProjectRoot = undefined;
  }
}

/** Make FileUtils.readFile fail for files whose path ends with `suffix`. */
function unreadable(suffix: string): void {
  const original = FileUtils.readFile.bind(FileUtils);
  jest.spyOn(FileUtils, 'readFile').mockImplementation(((file: string, options?: unknown) => {
    if (file.replace(/\\/g, '/').endsWith(suffix)) throw new Error('EACCES: permission denied');
    return (original as (f: string, o?: unknown) => string)(file, options);
  }) as typeof FileUtils.readFile);
}

describe('#303 — `generic` is not evidence of TypeScript', () => {
  it('a Go module with no config is typed generic and gets no stack: typescript law', () => {
    const root = project(GO_MODULE);
    expect(ConfigLoader.load(root).project.type).toBe('generic');
    const selected = selectedTitles(root);
    for (const title of [
      'Test Isolation Enforcement',
      'Test Data Management',
      'TypeScript Strict Mode (SACRED LAW)',
      'NX Commands Only Policy',
    ]) {
      expect(selected).not.toContain(title);
    }
    expect(selected.filter(t => TS_STACK.includes(t))).toEqual([]);
    expect(selected.length).toBeGreaterThan(0); // universal laws still run
  });

  it('a static site with no package.json gets no stack: typescript law', () => {
    const selected = selectedTitles(project(STATIC_SITE));
    expect(selected.filter(t => TS_STACK.includes(t))).toEqual([]);
  });

  it('a generic project with a package.json, or with a .ts file, keeps them', () => {
    const withManifest = project({ ...GO_MODULE, 'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }) });
    const withTsFile = project({ ...GO_MODULE, 'web/main.ts': 'export const x = 1;\n' });
    for (const root of [withManifest, withTsFile]) {
      expect(ConfigLoader.load(root).project.type).toBe('generic');
      expect(selectedTitles(root)).toContain('Test Isolation Enforcement');
    }
  });

  it('the gate: generic + typescript needs a JS/TS toolchain; other stacks and types are unchanged', () => {
    const go = project(GO_MODULE);
    expect(applies('typescript', 'generic', go)).toBe(false);
    expect(registryApplies('typescript', 'generic', go)).toBe(false);
    expect(applies(undefined, 'generic', go)).toBe(true);
    expect(applies('frontend', 'generic', go)).toBe(false);
    expect(applies('typescript', 'node', go)).toBe(true);
    expect(applies('typescript', 'python', go)).toBe(false);
    // Without a root the table alone answers, as before.
    expect(applies('typescript', 'generic')).toBe(true);
    // Installed and built code is not the project's own.
    const vendored = project({ ...GO_MODULE, 'node_modules/x/index.d.ts': 'export {};\n', 'dist/a.ts': '' });
    expect(applies('typescript', 'generic', vendored)).toBe(false);
    expect(applies('typescript', 'generic', project({ ...GO_MODULE, 'deno.json': '{}' }))).toBe(true);
  });

  it('the liveness floor counts the same laws the selector runs (no TS law on a Go module)', () => {
    const root = project(GO_MODULE);
    const config = ConfigLoader.load(root);
    const result = AuditLivenessLaw.check({
      projectRoot: root,
      config: { ...config, laws: { ...config.laws, __plannedLawCount: 0 } },
    } as never);
    const applicable = Number(/default 25% of (\d+) stack-applicable/.exec((result.violations ?? []).join(' '))?.[1]);
    const severity = (config.laws as { severity?: Record<string, unknown> }).severity;
    const expected = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
      l =>
        l.stack !== 'typescript' &&
        runsWithoutAllowlist({ name: l.title, id: l.id, defaultEnabled: l.defaultEnabled }, severity) &&
        lawAppliesToProjectType(l.stack, 'generic') &&
        lawRequirementsMet(l.requires, root)
    ).length;
    expect(applicable).toBe(expected);
  });
});

describe('#304 — Unit Test Quality Standards reads the project’s test files', () => {
  const SPEC = "describe('x', () => { it('works', () => { expect(1).toBe(1); }); });\n";
  const files = (ignores: string[]): Record<string, string> => ({
    'package.json': JSON.stringify({ name: 'tc', version: '1.0.0', devDependencies: { typescript: '5.9.3', jest: '29.0.0' } }),
    'ruleofcode.config.json': JSON.stringify({ ignores: { global: ignores } }),
    'src/app/a.spec.ts': SPEC,
    'src/vendor/c.spec.ts': SPEC,
    'tests/store.spec.ts': SPEC,
    'e2e/b.spec.ts': SPEC,
  });

  it.each([['src/vendor/**'], ['**/vendor/**']])('an ignores.global entry %s hides its test files', async pattern => {
    const root = project(files(['**/node_modules/**', pattern]));
    const result = await asRegistry(root, () =>
      UnitTestQualityLaw.check({ projectRoot: root, config: ConfigLoader.load(root) })
    );
    const text = (result.violations ?? []).join('\n');
    expect(text).not.toContain('vendor');
    expect(text).toContain('No edge case testing found in src/app/a.spec.ts');
    expect(text).toContain('No edge case testing found in tests/store.spec.ts');
    expect(text).toContain('No edge case testing found in e2e/b.spec.ts');
  });

  it('findings name files from the project root with forward slashes, never absolute', async () => {
    const root = project(files(['**/node_modules/**']));
    const result = await asRegistry(root, () =>
      UnitTestQualityLaw.check({ projectRoot: root, config: ConfigLoader.load(root) })
    );
    expect(result.violations?.length).toBeGreaterThan(0);
    for (const v of result.violations ?? []) {
      expect(v).not.toContain('\\');
      expect(v).not.toContain(root.replace(/\\/g, '/'));
      expect(v).not.toContain(root);
    }
  });

  it('an unreadable test file is a violation naming its path', async () => {
    const root = project(files(['**/node_modules/**']));
    unreadable('src/app/a.spec.ts');
    const result = await asRegistry(root, () =>
      UnitTestQualityLaw.check({ projectRoot: root, config: ConfigLoader.load(root) })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain('Could not read test file src/app/a.spec.ts, so nothing in it was judged');
  });
});

describe('#310 — Test Data Management names its files and judges mocking only where there is something to mock', () => {
  const PKG = JSON.stringify({ name: 'tc', version: '1.0.0', devDependencies: { typescript: '5.9.3', jest: '29.0.0' } });
  const check = (root: string) =>
    asRegistry(root, () => TestDataManagementLaw.check({ projectRoot: root, config: ConfigLoader.load(root) }));

  it('the reporter’s fixture: a pure-function spec, no external dependency → no mocking or setup finding', async () => {
    const root = project({
      'package.json': PKG,
      'src/sum.ts': 'export const sum = (a: number, b: number) => a + b;\n',
      'tests/sum.spec.ts':
        "import { sum } from '../src/sum'; describe('sum', () => { it('adds two numbers', () => expect(sum(1, 2)).toBe(3)); });\n",
    });
    const result = await check(root);
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.details).toContain(MOCKING_NOT_JUDGED);
  });

  it('an external client imported with no double anywhere → a violation naming the file and module', async () => {
    const root = project({
      'package.json': PKG,
      'tests/api.spec.ts':
        "import axios from 'axios';\nimport { readFileSync } from 'node:fs';\ndescribe('api', () => { it('gets', async () => { expect(await axios.get('x')).toBeDefined(); }); });\n",
      'tests/sum.spec.ts': "import { sum } from '../src/sum';\ndescribe('s', () => { it('adds', () => expect(sum(1, 2)).toBe(3)); });\n",
    });
    const result = await check(root);
    const mocking = (result.violations ?? []).find(v => v.includes('test double'));
    expect(mocking).toBeDefined();
    expect(mocking).toContain('tests/api.spec.ts (axios, node:fs)');
    expect(mocking).not.toContain('sum.spec.ts');
    expect(result.details).not.toContain(MOCKING_NOT_JUDGED);
  });

  it('an external client with a double in the suite passes the mocking check', async () => {
    const root = project({
      'package.json': PKG,
      'tests/api.spec.ts':
        "import axios from 'axios';\njest.mock('axios');\ndescribe('api', () => { it('gets', () => { expect(axios).toBeDefined(); }); });\n",
    });
    const result = await check(root);
    expect((result.violations ?? []).some(v => v.includes('test double'))).toBe(false);
  });

  it('missing setup/teardown names the files that share mutable state with no hook', async () => {
    const root = project({
      'package.json': PKG,
      'tests/counter.spec.ts': "let count = 0;\ndescribe('c', () => { it('inc', () => { count++; expect(count).toBe(1); }); });\n",
      'tests/reset.spec.ts':
        "let n = 0;\nbeforeEach(() => { n = 0; });\ndescribe('r', () => { it('inc', () => { n++; expect(n).toBe(1); }); });\n",
      'tests/pure.spec.ts': "describe('p', () => { it('ok', () => expect(1).toBe(1)); });\n",
    });
    const result = await check(root);
    const setup = (result.violations ?? []).find(v => v.includes('beforeEach/afterEach'));
    expect(setup).toBeDefined();
    expect(setup).toContain('tests/counter.spec.ts');
    expect(setup).not.toContain('reset.spec.ts');
    expect(setup).not.toContain('pure.spec.ts');
  });

  it('every violation names at least one file', async () => {
    const root = project({
      'package.json': PKG,
      'tests/bad.spec.ts':
        "import { Pool } from 'pg';\nlet shared = 0;\ndescribe('b', () => { it('q', async () => { const p = new Pool(); await p.connect(); shared++; expect(shared).toBe(1); }); });\n",
    });
    const result = await check(root);
    expect(result.violations?.length).toBeGreaterThan(0);
    for (const v of result.violations ?? []) expect(v).toContain('tests/bad.spec.ts');
  });

  it('an unreadable test file is a violation naming it — in both twins', async () => {
    const root = project({
      'package.json': PKG,
      'tests/sum.spec.ts': "describe('s', () => { it('adds', () => expect(1 + 2).toBe(3)); });\n",
      'tests/locked.spec.ts': "describe('l', () => { it('x', () => expect(1).toBe(1)); });\n",
    });
    unreadable('tests/locked.spec.ts');
    const config: RuleOfCodeConfig = ConfigLoader.load(root);
    for (const law of [TestDataManagementLaw, TestIsolationEnforcementLaw]) {
      const result = await asRegistry(root, () => law.check({ projectRoot: root, config }));
      expect(result.passed).toBe(false);
      expect(result.violations).toContain(
        'Test files could not be read, so nothing in them was judged: tests/locked.spec.ts'
      );
    }
  });
});
