/**
 * Husky and lint-staged in a project's package.json, tested where the setup
 * lives. Husky's bin is a stand-in script that records that it ran.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { RuleOfCodeConfig } from '../../src/config/types';
import {
  ensureHusky,
  generateLintStagedConfig,
  installLintStaged,
  isHuskyInstalled,
} from '../../src/hooks/husky-setup';
import { makeTempDir, removeTempDirs } from '../helpers/temp-dirs';

let dir: string;
const write = (file: string, text: string): void => {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
};
const manifest = (): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
const config = (type: string): RuleOfCodeConfig =>
  ({
    project: { name: 'x', type },
    hooks: { preCommit: true, prePush: false, commitMsg: false },
  }) as unknown as RuleOfCodeConfig;

beforeEach(() => {
  dir = makeTempDir('husky-setup-');
});
afterEach(removeTempDirs);

describe('isHuskyInstalled', () => {
  it('is true only for a manifest that declares husky', () => {
    expect(isHuskyInstalled(dir)).toBe(false);
    write('package.json', '{ not json');
    expect(isHuskyInstalled(dir)).toBe(false);
    write('package.json', '{"devDependencies":{"husky":"9.0.0"}}');
    expect(isHuskyInstalled(dir)).toBe(true);
  });
});

describe('ensureHusky', () => {
  it("runs the project's own husky bin and adds the prepare script once", () => {
    write('package.json', '{"devDependencies":{"husky":"9.0.0"}}');
    write('node_modules/husky/package.json', '{"bin":{"husky":"bin.js"}}');
    write(
      'node_modules/husky/bin.js',
      "require('fs').writeFileSync('ran.txt', 'yes');"
    );
    ensureHusky(dir);
    expect(fs.existsSync(path.join(dir, 'ran.txt'))).toBe(true);
    expect(manifest().scripts).toEqual({ prepare: 'husky' });
  });

  it('a husky that exits with an error is rethrown with what failed', () => {
    write('package.json', '{"devDependencies":{"husky":"9.0.0"}}');
    write('node_modules/husky/package.json', '{"bin":"bin.js"}');
    write('node_modules/husky/bin.js', 'process.exit(3);');
    expect(() => ensureHusky(dir)).toThrow(/^Failed to activate Husky: /);
  });
});

describe('lint-staged', () => {
  it('formats last, and lints with the Angular CLI only where there is one', () => {
    expect(generateLintStagedConfig(config('node'))).toEqual({
      '*.{ts,js}': ['npx ruleofcode audit --mode=pre-commit --staged'],
      '*.{ts,js,json,md}': ['prettier --write', 'git add'],
    });
    expect(generateLintStagedConfig(config('angular'))).toHaveProperty(
      ['*.{ts,js}', 1],
      'ng lint --fix'
    );
    expect(generateLintStagedConfig(config('ionic'))).not.toHaveProperty([
      '*.{ts,js}',
      1,
    ]);
  });

  it('writes the config and the pre-commit hook; without a manifest it throws', () => {
    expect(() => installLintStaged(dir, config('node'))).toThrow(
      'package.json not found'
    );
    write('package.json', '{"name":"x"}');
    fs.mkdirSync(path.join(dir, '.husky'));
    installLintStaged(dir, config('node'));
    expect(manifest()).toHaveProperty(['lint-staged', '*.{ts,js}']);
    expect(
      fs.readFileSync(path.join(dir, '.husky/pre-commit'), 'utf8')
    ).toContain('npx lint-staged\n');
  });
});
