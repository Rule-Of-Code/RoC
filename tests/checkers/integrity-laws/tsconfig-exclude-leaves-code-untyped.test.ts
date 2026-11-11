/**
 * TsconfigExcludeLeavesCodeUntyped (#199): tsconfigs resolved with the
 * compiler's own algorithm; an excluded tracked .ts file no tsconfig includes
 * is reported; what cannot be resolved is reported, never skipped.
 */
import { TsconfigExcludeLeavesCodeUntypedLaw as Law } from '../../../src/checkers/integrity-laws/tsconfig-exclude-leaves-code-untyped';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { card, gitProject } from './integrity-fixture';

afterAll(removeProjects);

const json = (value: unknown): string => JSON.stringify(value, null, 2);
const ROOT_TSCONFIG = json({ compilerOptions: { strict: true }, include: ['src/**/*.ts'], exclude: ['node_modules', 'e2e'] });
const SOURCES = {
  'src/app.ts': 'export const app = 1;\n',
  'e2e/login.spec.ts': 'test("login", () => undefinedThing());\n',
  'e2e/helpers.ts': 'export const h = 1;\n',
};

const run = (files: Record<string, string>, untracked: Record<string, string> = {}) =>
  Law.check(ctx(gitProject(files, untracked))).violations ?? [];

describe('TsconfigExcludeLeavesCodeUntypedLaw (#199)', () => {
  it('red: an excluded e2e directory in no tsconfig — directory and file count', () => {
    expect(run({ 'tsconfig.json': ROOT_TSCONFIG, ...SOURCES })).toEqual([
      expect.stringMatching(/^tsconfig\.json: exclude "e2e" leaves 2 TypeScript file\(s\) in no tsconfig \(e2e\/(helpers|login\.spec)\.ts, e2e\/(helpers|login\.spec)\.ts\)/),
    ]);
  });

  it('green: the excluded directory has a tsconfig of its own', () => {
    const files = { 'tsconfig.json': ROOT_TSCONFIG, 'e2e/tsconfig.json': json({ extends: '../tsconfig.json', include: ['**/*.ts'], exclude: [] }), ...SOURCES };
    expect(run(files)).toEqual([]);
  });

  it('green: the Nx split — the app config excludes specs, the spec config includes them', () => {
    const files = {
      'apps/web/tsconfig.json': json({ files: [], include: [], references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.spec.json' }] }),
      'apps/web/tsconfig.app.json': json({ include: ['src/**/*.ts'], exclude: ['src/**/*.spec.ts', 'jest.config.ts'] }),
      'apps/web/tsconfig.spec.json': json({ include: ['jest.config.ts', 'src/**/*.spec.ts'] }),
      'apps/web/src/main.ts': 'export {};\n',
      'apps/web/src/main.spec.ts': 'export {};\n',
      'apps/web/jest.config.ts': 'export default {};\n',
    };
    expect(run(files)).toEqual([]);
  });

  it('red: the Nx split with the spec config missing its include', () => {
    const files = {
      'apps/web/tsconfig.app.json': json({ include: ['src/**/*.ts'], exclude: ['src/**/*.spec.ts'] }),
      'apps/web/src/main.ts': 'export {};\n',
      'apps/web/src/main.spec.ts': 'export {};\n',
    };
    expect(run(files)).toEqual([
      expect.stringMatching(/^apps\/web\/tsconfig\.app\.json: exclude "src\/\*\*\/\*\.spec\.ts" leaves 1 /),
    ]);
  });

  it('skips dependency and build folders, and the outDir', () => {
    const files = {
      'tsconfig.json': json({ compilerOptions: { outDir: 'lib' }, include: ['src/**/*.ts'], exclude: ['node_modules', 'dist/**', 'lib'] }),
      'src/a.ts': 'export {};\n',
      'dist/a.ts': 'export {};\n',
      'lib/a.ts': 'export {};\n',
    };
    expect(run(files)).toEqual([]);
  });

  it('a shared base (no include, extended by another) does not cover what it would implicitly include', () => {
    const files = {
      'tsconfig.base.json': json({ compilerOptions: { strict: true }, exclude: ['node_modules'] }),
      'tsconfig.json': json({ extends: './tsconfig.base.json', include: ['src/**/*.ts'], exclude: ['e2e'] }),
      ...SOURCES,
    };
    expect(run(files)).toEqual([expect.stringMatching(/exclude "e2e" leaves 2/)]);
  });

  it('a standalone config with the implicit include does cover (whether it is run is a declared limit)', () => {
    const files = {
      'tsconfig.json': ROOT_TSCONFIG,
      'tsconfig.all.json': json({ compilerOptions: { noEmit: true } }),
      ...SOURCES,
    };
    expect(run(files)).toEqual([]);
  });

  it('an untracked tsconfig does not cover anything', () => {
    const untracked = { 'e2e/tsconfig.json': json({ include: ['**/*.ts'] }) };
    expect(run({ 'tsconfig.json': ROOT_TSCONFIG, ...SOURCES }, untracked)).toEqual([expect.stringMatching(/exclude "e2e" leaves 2/)]);
  });

  it('cannot resolve: an extends that does not exist fails, and its excludes are not passed', () => {
    const files = {
      'tsconfig.json': ROOT_TSCONFIG,
      'e2e/tsconfig.json': json({ extends: './missing.json', include: ['**/*.ts'] }),
      ...SOURCES,
    };
    const violations = run(files);
    expect(violations).toEqual([
      expect.stringMatching(/^e2e\/tsconfig\.json: cannot resolve — .*missing\.json/),
      expect.stringMatching(/^tsconfig\.json: exclude "e2e" leaves 2/),
    ]);
  });

  it('cannot resolve: a project reference that does not exist fails', () => {
    const files = {
      'tsconfig.json': json({ files: [], references: [{ path: './packages/gone' }] }),
      'src/a.ts': 'export {};\n',
    };
    expect(run(files)).toEqual([expect.stringMatching(/^tsconfig\.json: references packages\/gone\/tsconfig\.json, which does not exist/)]);
  });

  it('cannot resolve: an exclude that is not a list (the compiler rejects it too)', () => {
    expect(run({ 'tsconfig.json': json({ include: ['src/**/*.ts'], exclude: 'e2e' }), 'src/a.ts': 'export {};\n' })).toEqual([
      expect.stringMatching(/^tsconfig\.json: cannot resolve — Compiler option 'exclude' requires a value of type Array/),
    ]);
  });

  it('cannot resolve: an exclude list holding a non-string', () => {
    expect(run({ 'tsconfig.json': json({ include: ['src/**/*.ts'], exclude: ['e2e', 3] }), 'src/a.ts': 'export {};\n' })).toEqual([
      expect.stringMatching(/^tsconfig\.json: cannot resolve — Compiler option 'exclude' requires a value of type string/),
    ]);
  });

  it('a project reference to an untracked config is followed', () => {
    const files = { 'tsconfig.json': json({ ...JSON.parse(ROOT_TSCONFIG), references: [{ path: './e2e' }] }), ...SOURCES };
    const untracked = { 'e2e/tsconfig.json': json({ compilerOptions: { composite: true }, include: ['**/*.ts'] }) };
    expect(run(files, untracked)).toEqual([]);
  });

  it('fails when git cannot be asked', () => {
    const violations = Law.check(ctx(project({ 'tsconfig.json': ROOT_TSCONFIG, ...SOURCES }))).violations;
    expect(violations).toEqual([expect.stringContaining('could not list the files git tracks')]);
  });
});

describe('Tsconfig Exclude Leaves Code Untyped selection (requires)', () => {
  const requires = card('Tsconfig Exclude Leaves Code Untyped').requires;
  const deps = manifest({ typescript: '5.9.3' });

  it('is selected with typescript and a tsconfig at the root or in a workspace project', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': deps, 'tsconfig.json': '{}' }))).toBe(true);
    expect(lawRequirementsMet(requires, project({ 'package.json': deps, 'libs/a/b/tsconfig.json': '{}' }))).toBe(true);
  });

  it('is not selected without a tsconfig, or without typescript', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': deps }))).toBe(false);
    expect(lawRequirementsMet(requires, project({ 'package.json': manifest({}), 'tsconfig.json': '{}' }))).toBe(false);
  });
});
