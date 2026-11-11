/**
 * GuardFunctionHasProductionCaller (#198): an exported guard referenced only
 * by tests is reported; references are read from the syntax tree, so a
 * comment, a string, an import list or a barrel re-export is not a caller.
 */
import { GuardFunctionHasProductionCallerLaw as Law } from '../../../src/checkers/integrity-laws/guard-function-has-production-caller';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { card } from './integrity-fixture';

afterAll(removeProjects);

const GUARD = 'export function requireAdmin(user: { admin: boolean }): void {\n  if (!user.admin) throw new Error("forbidden");\n}\n';
const SPEC = "import { requireAdmin } from '../src/guards';\nit('throws', () => expect(() => requireAdmin({ admin: false })).toThrow());\n";

const run = (files: Record<string, string>, thresholds: Record<string, unknown> = {}) =>
  Law.check(ctx(project({ 'src/guards.ts': GUARD, 'tests/guards.spec.ts': SPEC, ...files }), { thresholds })).violations ?? [];

const NO_CALLER = /src\/guards\.ts:1: requireAdmin is exported as a guard but nothing outside the tests references it/;

describe('GuardFunctionHasProductionCallerLaw (#198)', () => {
  it('red: a guard only a test calls', () => {
    expect(run({})).toEqual([expect.stringMatching(NO_CALLER)]);
  });

  it('green: a production call', () => {
    const handler = "import { requireAdmin } from './guards';\nexport function handle(u: { admin: boolean }) { requireAdmin(u); }\n";
    expect(run({ 'src/handler.ts': handler })).toEqual([]);
  });

  it('green: a call through an aliased import', () => {
    const handler = "import { requireAdmin as mustBeAdmin } from './guards';\nexport const handle = (u: { admin: boolean }) => mustBeAdmin(u);\n";
    expect(run({ 'src/handler.ts': handler })).toEqual([]);
  });

  it('green: a guard passed by reference', () => {
    const routes = "import { requireAdmin } from './guards';\nexport const routes = [{ path: 'admin', guard: requireAdmin }];\n";
    expect(run({ 'src/routes.ts': routes })).toEqual([]);
  });

  it('green: a caller in the same module', () => {
    const guard = `${GUARD}export function handle(u: { admin: boolean }) { requireAdmin(u); }\n`;
    expect(run({ 'src/guards.ts': guard })).toEqual([]);
  });

  it('red: a comment, a string, an import list and a barrel re-export are not callers', () => {
    const files = {
      'src/index.ts': "export { requireAdmin } from './guards';\n",
      'src/handler.ts':
        "import { requireAdmin } from './guards';\n// requireAdmin(user) goes here\nexport const note = 'requireAdmin';\n",
    };
    expect(run(files)).toEqual([expect.stringMatching(NO_CALLER)]);
  });

  it('red: recursion inside the guard is not a caller', () => {
    const guard = 'export const requireAdmin = (n: number): number => (n > 0 ? requireAdmin(n - 1) : 0);\n';
    expect(run({ 'src/guards.ts': guard })).toEqual([expect.stringMatching(/requireAdmin is exported as a guard/)]);
  });

  it.each([
    ['e2e/helpers.ts'],
    ['src/__tests__/helper.ts'],
    ['src/guards.stories.ts'],
    ['src/guards.cy.ts'],
  ])('red: a call in %s is a test, not production', file => {
    const helper = "import { requireAdmin } from '../src/guards';\nexport const x = () => requireAdmin({ admin: true });\n";
    expect(run({ [file]: helper })).toEqual([expect.stringMatching(NO_CALLER)]);
  });

  it('names outside the prefixes, and a prefix not followed by a word boundary, are not guards', () => {
    const files = {
      'src/guards.ts': 'export function requirement() {}\nexport function checkout() {}\nexport function loadUser() {}\n',
    };
    expect(run(files)).toEqual([]);
  });

  it('every default prefix is checked', () => {
    const names = ['assertOwner', 'requireRole', 'enforceQuota', 'verifyToken', 'checkScope', 'scheduleDeletion'];
    const files = { 'src/guards.ts': names.map(name => `export function ${name}() {}\n`).join('') };
    expect(run(files)).toHaveLength(names.length);
  });

  it('thresholds.integrity.guardPrefixes replaces the default list', () => {
    const files = { 'src/guards.ts': `${GUARD}export function ensureOwner() {}\n` };
    expect(run(files, { integrity: { guardPrefixes: ['ensure'] } })).toEqual([
      expect.stringMatching(/ensureOwner is exported as a guard/),
    ]);
  });

  it.each([
    [[], /is empty/],
    [['require-'], /must be a list of identifier prefixes/],
    ['require', /must be a list of identifier prefixes/],
  ])('a guardPrefixes of %j is a finding, not a silent pass', (value, message) => {
    expect(run({}, { integrity: { guardPrefixes: value } })).toEqual([expect.stringMatching(message)]);
  });

  it('fails when nothing was scanned', () => {
    const result = Law.check(ctx(project({ 'package.json': manifest({ typescript: '5.9.3' }) })));
    expect(result.violations).toEqual([expect.stringContaining('no TypeScript source file was scanned')]);
  });

  it('fails, naming the files, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      expect(run({})).toEqual([expect.stringMatching(/file\(s\): could not load the 'typescript' package .* were NOT inspected/)]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Guard Function Has Production Caller selection (requires)', () => {
  const requires = card('Guard Function Has Production Caller').requires;

  it('is selected where typescript is declared', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': manifest({ typescript: '5.9.3' }) }))).toBe(true);
  });

  it('is not selected without it', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': manifest({ express: '5.0.0' }) }))).toBe(false);
  });
});
