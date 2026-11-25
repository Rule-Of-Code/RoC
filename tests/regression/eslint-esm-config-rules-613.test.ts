/**
 * #613: an ESM `eslint.config.mjs` could not be `require`d, so its rules were
 * taken from the file's text with a regular expression that missed a rule
 * with options (`'complexity': ['error', 10]`) and an unquoted key
 * (`complexity: 'error'`). A rule the project sets read as not set.
 *
 * The config is now imported by a child Node process, as ESLint imports it,
 * never in the audit's process: a config that exits, loops, prints or throws
 * is NOT read, with the reason, and the audit goes on. One child per config
 * file for the whole process.
 */
import fs from 'fs';
import path from 'path';

import { CodeQualityLawBase } from '../../src/checkers/code-quality-laws/code-quality-law-base';
import * as childProcess from '../../src/utils/child-process';
import {
  clearESLintJsConfigCache,
  loadESLintJsConfig,
} from '../../src/utils/eslint-js-config';
import { makeTempDir } from '../helpers/temp-dirs';

type Read = {
  file: string;
  config?: Record<string, unknown>;
  notRead?: string;
};
const base = CodeQualityLawBase as unknown as {
  readESLintConfig(projectRoot: string): Read | null;
};

function configAt(name: string, text: string): string {
  const root = makeTempDir('roc-eslint613-');
  fs.writeFileSync(path.join(root, name), text);
  return root;
}

const readConfig = (name: string, text: string): Read | null =>
  base.readESLintConfig(configAt(name, text));

const rulesOf = (read: Read | null): Record<string, unknown> =>
  (read?.config?.rules as Record<string, unknown> | undefined) ?? {};

afterEach(() => {
  jest.restoreAllMocks();
  clearESLintJsConfigCache();
});

describe('#613 eslint.config.mjs: the rules are read from the loaded config', () => {
  it("a rule with options, 'complexity': ['error', 10], is read with its options", () => {
    const read = readConfig(
      'eslint.config.mjs',
      "export default [{ rules: { 'complexity': ['error', 10] } }];\n"
    );
    expect(read?.notRead).toBeUndefined();
    expect(rulesOf(read).complexity).toEqual(['error', 10]);
  });

  it("an unquoted key, complexity: 'error', is read", () => {
    const read = readConfig(
      'eslint.config.mjs',
      "export default [{ rules: { complexity: 'error' } }];\n"
    );
    expect(rulesOf(read).complexity).toBe('error');
  });

  it('rules spread over several config objects merge, later over earlier', () => {
    const read = readConfig(
      'eslint.config.mjs',
      [
        "const base = { rules: { 'max-depth': ['warn', 4], complexity: 'off' } };",
        "export default [base, [{ files: ['**/*.ts'], rules: { complexity: ['error', { max: 12 }] } }]];",
        '',
      ].join('\n')
    );
    expect(rulesOf(read)).toEqual({
      'max-depth': ['warn', 4],
      complexity: ['error', { max: 12 }],
    });
  });

  it('a promised default export is awaited', () => {
    const read = readConfig(
      'eslint.config.mjs',
      "export default Promise.resolve([{ rules: { complexity: ['error', 8] } }]);\n"
    );
    expect(rulesOf(read).complexity).toEqual(['error', 8]);
  });

  it('top-level await is loaded', () => {
    const read = readConfig(
      'eslint.config.mjs',
      [
        'const max = await Promise.resolve(9);',
        "export default [{ rules: { complexity: ['error', max] } }];",
        '',
      ].join('\n')
    );
    expect(rulesOf(read).complexity).toEqual(['error', 9]);
  });

  it('what the config prints does not reach the audit and does not break the answer', () => {
    const write = jest.spyOn(process.stdout, 'write');
    const read = readConfig(
      'eslint.config.mjs',
      [
        'console.log(\'{"rules":{"fake":"error"}}\');',
        "process.stdout.write('noise');",
        "export default [{ rules: { complexity: 'error' } }];",
        '',
      ].join('\n')
    );
    expect(rulesOf(read)).toEqual({ complexity: 'error' });
    expect(write).not.toHaveBeenCalled();
  });

  it('control: a CommonJS eslint.config.js is read', () => {
    const read = readConfig(
      'eslint.config.js',
      "module.exports = [{ rules: { complexity: ['error', 10] } }];\n"
    );
    expect(rulesOf(read).complexity).toEqual(['error', 10]);
  });
});

describe('#613 a config that cannot be loaded is NOT read, with the reason, and the audit goes on', () => {
  it('an import that is not installed', () => {
    const read = readConfig(
      'eslint.config.mjs',
      [
        "import missing from 'an-eslint-plugin-that-is-not-installed';",
        "export default [missing, { rules: { 'complexity': ['error', 10] } }];",
        '',
      ].join('\n')
    );
    expect(read?.config).toBeUndefined();
    expect(read?.notRead).toMatch(
      /^eslint\.config\.mjs could not be loaded \(it threw: .*an-eslint-plugin-that-is-not-installed.*\) — its rules were NOT read$/
    );
  });

  it('a config that throws', () => {
    const read = readConfig(
      'eslint.config.mjs',
      "throw new Error('broken config');\n"
    );
    expect(read?.notRead).toBe(
      'eslint.config.mjs could not be loaded (it threw: broken config) — its rules were NOT read'
    );
  });

  it('process.exit(0) ends the child, not the audit, and reads as NOT read', () => {
    const read = readConfig(
      'eslint.config.mjs',
      "process.exit(0);\nexport default [{ rules: { complexity: 'error' } }];\n"
    );
    expect(read?.config).toBeUndefined();
    expect(read?.notRead).toBe(
      'eslint.config.mjs could not be loaded (it exited (code 0) before its rules were read) — its rules were NOT read'
    );
  });

  it('a config that never finishes is stopped at the time limit', () => {
    const root = configAt(
      'eslint.config.mjs',
      'while (true) {}\nexport default [];\n'
    );
    const started = Date.now();
    const answer = loadESLintJsConfig(
      path.join(root, 'eslint.config.mjs'),
      1500
    );
    expect(answer).toEqual({
      reason: 'it did not finish loading within 1.5 s',
    });
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});

describe('#613 one child per config file', () => {
  it('three reads of the same config start the child once', () => {
    const spawn = jest.spyOn(childProcess, 'spawnSync');
    const root = configAt(
      'eslint.config.mjs',
      "export default [{ rules: { complexity: 'error' } }];\n"
    );
    for (let i = 0; i < 3; i++) {
      expect(rulesOf(base.readESLintConfig(root))).toEqual({
        complexity: 'error',
      });
    }
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('a changed config is loaded again', () => {
    const spawn = jest.spyOn(childProcess, 'spawnSync');
    const root = configAt(
      'eslint.config.mjs',
      "export default [{ rules: { complexity: 'error' } }];\n"
    );
    base.readESLintConfig(root);
    fs.writeFileSync(
      path.join(root, 'eslint.config.mjs'),
      "export default [{ rules: { complexity: 'warn', 'max-depth': 'error' } }];\n"
    );
    expect(rulesOf(base.readESLintConfig(root))).toEqual({
      complexity: 'warn',
      'max-depth': 'error',
    });
    expect(spawn).toHaveBeenCalledTimes(2);
  });
});
