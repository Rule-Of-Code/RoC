/**
 * CapacitorPluginStubHasContractTest (#272): a workspace-wide
 * moduleNameMapper stub hides the real plugin; one contract test must load
 * the real package.
 */
import { CapacitorPluginStubHasContractTestLaw } from '../../../src/checkers/capacitor-laws/capacitor-plugin-stub-has-contract-test';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';
import { card, selected, withoutTypeScript } from './bridge-fixture';

afterAll(removeProjects);

const TITLE = 'Capacitor Plugin Stub Has Contract Test';
const AUTH = '@capacitor-firebase/authentication';
const DEPS = { [AUTH]: '8.4.0', '@capacitor/push-notifications': '8.0.0' };
const PRESET = [
  "const path = require('node:path');",
  'module.exports = {',
  '  moduleNameMapper: {',
  `    '^@capacitor-firebase/authentication$': path.join(__dirname, 'tools/testing/auth.stub.ts'),`,
  '  },',
  '};',
].join('\n');
const APP = `import { FirebaseAuthentication } from '${AUTH}';\nexport const token = async () => (await FirebaseAuthentication.getCurrentUser()).user;\nexport const out = () => FirebaseAuthentication.signOut();\n`;
const run = (files: Record<string, string>, capacitor: Record<string, unknown> = {}) =>
  CapacitorPluginStubHasContractTestLaw.check(ctx(capacitorProject(files, undefined, DEPS), { thresholds: { capacitor } }));

describe('CapacitorPluginStubHasContractTestLaw (#272)', () => {
  it('is info severity, as the issue states', () => {
    expect(card(TITLE).defaultSeverity).toBe('info');
  });

  it('red: a Jest preset stubs the auth plugin and no test loads the real one (names stub and methods)', () => {
    const result = run({ 'jest.preset.js': PRESET, 'src/app/auth.ts': APP });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /@capacitor-firebase\/authentication is stubbed workspace-wide by jest\.preset\.js \(\^@capacitor-firebase\/authentication\$ → tools\/testing\/auth\.stub\.ts\) and no test loads the real package; the app calls getCurrentUser\(\), signOut\(\) on it/
      ),
    ]);
  });

  it('red: a project jest.config read although ignores exclude it; a Vitest alias array too', () => {
    const result = CapacitorPluginStubHasContractTestLaw.check(
      ctx(
        capacitorProject(
          {
            'apps/mobile/jest.config.cts': "module.exports = { moduleNameMapper: { '^@capacitor/push-notifications$': '<rootDir>/push.stub.ts' } };",
            'apps/web/vitest.config.ts': `export default { test: { alias: [{ find: /^@capacitor-firebase\\/authentication$/, replacement: './auth.stub.ts' }] } };`,
          },
          undefined,
          DEPS
        ),
        { ignores: { global: ['**/jest.config.cts', '**/vitest.config.ts'], tests: [], build: [], design: [] } }
      )
    );
    expect(result.violations).toEqual([
      expect.stringContaining(`${AUTH} is stubbed workspace-wide by apps/web/vitest.config.ts`),
      expect.stringContaining('@capacitor/push-notifications is stubbed workspace-wide by apps/mobile/jest.config.cts'),
    ]);
  });

  it('green: a spec calls jest.requireActual on the real plugin', () => {
    const result = run({
      'jest.preset.js': PRESET,
      'src/app/auth.contract.spec.ts': `const real = jest.requireActual('${AUTH}');\nit('reads the restored user', () => expect(real).toBeDefined());`,
    });
    expect(result.violations).toEqual([]);
  });

  it('green only when declared: a browser probe under thresholds.capacitor.contractTests imports it', () => {
    const files = { 'jest.preset.js': PRESET, 'tools/qa/auth-probe/probe-entry.js': `import { FirebaseAuthentication } from '${AUTH}';\n` };
    expect(run(files).passed).toBe(false);
    expect(run(files, { contractTests: ['tools/qa/**'] }).violations).toEqual([]);
  });

  it('red: a probe that imports a different package does not cover this one', () => {
    const files = { 'jest.preset.js': PRESET, 'tools/qa/probe.js': "import { App } from '@capacitor/app';\n" };
    expect(run(files, { contractTests: ['tools/qa/**'] }).passed).toBe(false);
  });

  it('green: no stub for any Capacitor plugin (a mapper for something else)', () => {
    const result = run({ 'jest.config.ts': "export default { moduleNameMapper: { '^lodash-es$': 'lodash' } };" });
    expect(result.violations).toEqual([]);
  });

  it('green: package.json "jest" with a stub and a requireActual contract test', () => {
    const result = run({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@capacitor/core': '8.5.1', ...DEPS },
        jest: { moduleNameMapper: { '^@capacitor/push-notifications$': '<rootDir>/push.stub.ts' } },
      }),
      'src/push.spec.ts': "jest.requireActual('@capacitor/push-notifications');",
    });
    expect(result.violations).toEqual([]);
  });

  it('cannot read: no TypeScript to parse a JS/TS config — fails, never passes', () => {
    const root = capacitorProject({ 'jest.preset.js': PRESET }, undefined, DEPS);
    const result = withoutTypeScript(() => CapacitorPluginStubHasContractTestLaw.check(ctx(root)));
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/module mappings in them were not read/);
  });

  describe('selection (requires)', () => {
    it('selected: @capacitor/core and a config', () => {
      expect(selected(TITLE, { '@capacitor/core': '8.5.1' })).toBe(true);
    });
    it('not selected: no Capacitor', () => {
      expect(selected(TITLE, { jest: '30' })).toBe(false);
    });
  });
});
