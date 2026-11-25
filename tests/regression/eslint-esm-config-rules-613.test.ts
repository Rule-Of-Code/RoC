/**
 * #613: an ESM `eslint.config.mjs` could not be `require`d, so its rules were
 * taken from the file's text with a regular expression that missed a rule
 * with options (`'complexity': ['error', 10]`) and an unquoted key
 * (`complexity: 'error'`). A rule the project sets read as not set.
 *
 * The config is now loaded as ESLint loads it (imported by a child Node
 * process when `require` refuses it); one that cannot be loaded is said not to
 * be read, never guessed from its text.
 */
import fs from 'fs';
import path from 'path';

import { CodeQualityLawBase } from '../../src/checkers/code-quality-laws/code-quality-law-base';
import { makeTempDir } from '../helpers/temp-dirs';

type Read = {
  file: string;
  config?: Record<string, unknown>;
  notRead?: string;
};
const base = CodeQualityLawBase as unknown as {
  readESLintConfig(projectRoot: string): Read | null;
};

function readConfig(name: string, text: string): Read | null {
  const root = makeTempDir('roc-eslint613-');
  fs.writeFileSync(path.join(root, name), text);
  return base.readESLintConfig(root);
}

const rulesOf = (read: Read | null): Record<string, unknown> =>
  (read?.config?.rules as Record<string, unknown> | undefined) ?? {};

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

  it('a config that cannot be loaded is NOT read, not guessed from its text', () => {
    const read = readConfig(
      'eslint.config.mjs',
      [
        "import missing from 'an-eslint-plugin-that-is-not-installed';",
        "export default [missing, { rules: { 'complexity': ['error', 10] } }];",
        '',
      ].join('\n')
    );
    expect(read?.config).toBeUndefined();
    expect(read?.notRead).toBe(
      'eslint.config.mjs could not be loaded — its rules were NOT read'
    );
  });

  it('control: a CommonJS eslint.config.js is read as before', () => {
    const read = readConfig(
      'eslint.config.js',
      "module.exports = [{ rules: { complexity: ['error', 10] } }];\n"
    );
    expect(rulesOf(read).complexity).toEqual(['error', 10]);
  });
});
