/**
 * ReactHooksLintEnforced (#220): the ESLint config ESLint would use for each
 * React package enables eslint-plugin-react-hooks — read from the parse of the
 * config, so a commented-out preset, an unused import or a rule turned off
 * inside the same file are seen for what they are.
 */
import { ReactHooksLintEnforcedLaw } from '../../../src/checkers/react-laws/react-hooks-lint-enforced';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { describeSelection, REACT_DEPS, reactProject } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactHooksLintEnforcedLaw;
const check = (files: Record<string, string>, overrides: Record<string, unknown> = {}) =>
  law.check(ctx(reactProject(files), overrides));
const flat = (...lines: string[]) => ({ 'eslint.config.mjs': lines.join('\n') });

/** The eslint.config.mjs create-next-app 16.4.6 writes, verbatim. */
const CREATE_NEXT_APP_CONFIG = [
  'import { defineConfig, globalIgnores } from "eslint/config";',
  'import nextVitals from "eslint-config-next/core-web-vitals";',
  'import nextTs from "eslint-config-next/typescript";',
  '',
  'const eslintConfig = defineConfig([',
  '  ...nextVitals,',
  '  ...nextTs,',
  '  // Override default ignores of eslint-config-next.',
  '  globalIgnores([',
  '    // Default ignores of eslint-config-next:',
  '    ".next/**",',
  '    "out/**",',
  '    "build/**",',
  '    "next-env.d.ts",',
  '  ]),',
  ']);',
  '',
  'export default eslintConfig;',
].join('\n');

const HOOKS_IMPORT = "import reactHooks from 'eslint-plugin-react-hooks';";

describe('ReactHooksLintEnforcedLaw (#220) — green', () => {
  it.each([
    ['create-next-app 16 (eslint-config-next/core-web-vitals spread)', { 'eslint.config.mjs': CREATE_NEXT_APP_CONFIG }],
    ['configs.flat.recommended', flat(HOOKS_IMPORT, 'export default [reactHooks.configs.flat.recommended];')],
    ["configs['recommended-latest']", flat(HOOKS_IMPORT, "export default [reactHooks.configs['recommended-latest']];")],
    ['configs.flat["recommended-latest"] spread', flat(HOOKS_IMPORT, "export default [{ ...reactHooks.configs.flat['recommended-latest'] }];")],
    [
      'both core rules by name',
      flat(
        HOOKS_IMPORT,
        "export default [{ plugins: { 'react-hooks': reactHooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': ['warn', { additionalHooks: 'x' }] } }];"
      ),
    ],
    [
      'CommonJS require',
      {
        'eslint.config.cjs': "const reactHooks = require('eslint-plugin-react-hooks');\nmodule.exports = [reactHooks.configs.flat.recommended];",
      },
    ],
    [
      'FlatCompat extends (Next 15 template)',
      flat(
        "import { FlatCompat } from '@eslint/eslintrc';",
        'const compat = new FlatCompat({ baseDirectory: import.meta.dirname });',
        "export default [...compat.extends('next/core-web-vitals', 'next/typescript')];"
      ),
    ],
    ['.eslintrc.json plugin preset', { '.eslintrc.json': '{ "extends": ["eslint:recommended", "plugin:react-hooks/recommended"] }' }],
    ['.eslintrc.json with comments', { '.eslintrc.json': '{\n  // the Next preset\n  "extends": "next/core-web-vitals"\n}' }],
  ])('%s', (_name, files) => {
    expect(check(files).violations).toEqual([]);
  });

  it('package.json eslintConfig', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'x', dependencies: REACT_DEPS, eslintConfig: { extends: ['react-app', 'plugin:react-hooks/recommended'] } }),
    });
    expect(law.check(ctx(root)).violations).toEqual([]);
  });

  it('a shared preset named in thresholds.react.hooksLintPresets', () => {
    const files = flat("import base from '@acme/eslint-config';", 'export default [...base];');
    const named = check(files, { thresholds: { react: { hooksLintPresets: ['@acme/eslint-config'] } } });
    expect(named.violations).toEqual([]);
  });

  it('an app config that spreads the workspace config is followed', () => {
    const root = project({
      'package.json': manifest({}),
      'eslint.config.mjs': [HOOKS_IMPORT, 'export default [reactHooks.configs.flat.recommended];'].join('\n'),
      'apps/web/package.json': manifest(REACT_DEPS),
      'apps/web/eslint.config.mjs': "import base from '../../eslint.config.mjs';\nexport default [...base];",
    });
    expect(law.check(ctx(root)).violations).toEqual([]);
  });
});

describe('ReactHooksLintEnforcedLaw (#220) — red', () => {
  const NOT_ENFORCED = /^eslint\.config\.mjs: ESLint does not enforce eslint-plugin-react-hooks/;

  it('no ESLint config at all', () => {
    expect(check({}).violations).toEqual([
      expect.stringMatching(/^package\.json: declares react but no ESLint config was found/),
    ]);
  });

  it('a config without the plugin', () => {
    const result = check(flat("import js from '@eslint/js';", 'export default [js.configs.recommended];'));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
    expect(result.violations?.[0]).toContain('react-hooks/rules-of-hooks, react-hooks/exhaustive-deps are not enabled');
  });

  it('a preset that is commented out', () => {
    const result = check(flat(HOOKS_IMPORT, 'export default [', '  // reactHooks.configs.flat.recommended,', '];'));
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
  });

  it('the create-next-app config with its core-web-vitals spread commented out', () => {
    const config = CREATE_NEXT_APP_CONFIG.replace('  ...nextVitals,', '  // ...nextVitals,');
    const result = check({ 'eslint.config.mjs': config });
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
    // eslint-config-next/typescript is read and known to carry no hooks rules: not offered as a maybe
    expect(result.violations?.[0]).not.toContain('It imports');
  });

  it('a preset imported but never used', () => {
    const result = check(flat("import nextVitals from 'eslint-config-next/core-web-vitals';", 'export default [];'));
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
  });

  it('a rule name that only appears in a comment or a string', () => {
    const result = check(
      flat(HOOKS_IMPORT, "// 'react-hooks/rules-of-hooks': 'error'", "const note = \"'react-hooks/exhaustive-deps': 'warn'\";", 'export default [];')
    );
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
  });

  it('only one core rule enabled names the missing one', () => {
    const result = check(flat(HOOKS_IMPORT, "export default [{ plugins: { 'react-hooks': reactHooks }, rules: { 'react-hooks/rules-of-hooks': 'error' } }];"));
    expect(result.violations).toEqual([expect.stringContaining('react-hooks/exhaustive-deps is not enabled')]);
  });

  it.each([
    ["'off'", "'react-hooks/exhaustive-deps': 'off'", 'exhaustive-deps'],
    ['0', "'react-hooks/rules-of-hooks': 0", 'rules-of-hooks'],
    ["['off']", "'react-hooks/rules-of-hooks': ['off']", 'rules-of-hooks'],
    ['a relied-on compiler rule', "'react-hooks/set-state-in-effect': 'off'", 'set-state-in-effect'],
    ['purity', "'react-hooks/purity': 'off'", 'purity'],
  ])('a preset with a rule turned off: %s', (_name, rule, ruleName) => {
    const result = check(
      flat(HOOKS_IMPORT, `export default [reactHooks.configs.flat.recommended, { rules: { ${rule} } }];`)
    );
    expect(result.violations).toEqual([
      expect.stringMatching(new RegExp(`^eslint\\.config\\.mjs:2: react-hooks/${ruleName} is turned off`)),
    ]);
  });

  it('a rule the law does not rely on may be turned off', () => {
    const result = check(flat(HOOKS_IMPORT, "export default [reactHooks.configs.flat.recommended, { rules: { 'react-hooks/incompatible-library': 'off' } }];"));
    expect(result.violations).toEqual([]);
  });

  it('a shared preset it cannot read is named, not guessed (fails closed)', () => {
    const result = check(flat("import base from '@acme/eslint-config';", 'export default [...base];'));
    expect(result.violations).toEqual([expect.stringMatching(NOT_ENFORCED)]);
    expect(result.violations?.[0]).toContain('It imports @acme/eslint-config, which this law cannot read');
    expect(result.violations?.[0]).toContain('thresholds.react.hooksLintPresets');
  });

  it('a YAML .eslintrc is reported as not read', () => {
    const result = check({ '.eslintrc.yml': 'extends:\n  - plugin:react-hooks/recommended\n' });
    expect(result.violations).toEqual([
      expect.stringContaining('.eslintrc.yml: a YAML ESLint config is not read'),
      expect.stringMatching(/^\.eslintrc\.yml: ESLint does not enforce/),
    ]);
  });

  it('a React app of the workspace with no config of its own or above it', () => {
    const root = project({
      'package.json': manifest({}),
      'apps/web/package.json': manifest(REACT_DEPS),
      'apps/api/package.json': manifest({ express: '5.0.0' }),
      'apps/api/eslint.config.mjs': 'export default [];',
    });
    expect(law.check(ctx(root)).violations).toEqual([
      expect.stringMatching(/^apps\/web\/package\.json: declares react but no ESLint config was found/),
    ]);
  });

  it('a relative import that does not resolve is reported', () => {
    const result = check(flat(HOOKS_IMPORT, "import base from './missing.mjs';", 'export default [reactHooks.configs.flat.recommended, ...base];'));
    expect(result.violations).toEqual([expect.stringContaining('imports ./missing.mjs, which could not be resolved')]);
  });
});

describe('ReactHooksLintEnforcedLaw fails closed', () => {
  afterEach(() => jest.restoreAllMocks());

  it('without a TypeScript parser it reports the config as not read', () => {
    jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    const result = check({ 'eslint.config.mjs': CREATE_NEXT_APP_CONFIG });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining("could not load the 'typescript' package")]);
  });
});

describeSelection('ReactHooksLintEnforcedLaw.check', REACT_DEPS);
