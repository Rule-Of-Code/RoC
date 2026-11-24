/**
 * Whether the enabled hooks are there and current, tested where it is asked.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { validateHooks } from '../../src/hooks/hook-validation';
import { makeTempDir, removeTempDirs } from '../helpers/temp-dirs';

let dir: string;
const write = (file: string, text: string): void => {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
};
const validate = (hooks: Record<string, boolean>) =>
  validateHooks({
    projectRoot: dir,
    config: {
      project: { name: 'x', type: 'node' },
      hooks: { preCommit: false, prePush: false, commitMsg: false, ...hooks },
    } as unknown as RuleOfCodeConfig,
    version: '1.2.3',
  });

beforeEach(() => {
  dir = makeTempDir('hook-validation-');
});
afterEach(removeTempDirs);

describe('validateHooks', () => {
  it('names the missing hooks and the ones another version wrote', () => {
    write('.husky/pre-commit', '# RuleOfCode v1.2.3\n');
    write('.husky/commit-msg', '# RuleOfCode v1.0.0\n');
    expect(
      validate({ preCommit: true, prePush: true, commitMsg: true })
    ).toEqual({
      valid: false,
      missing: ['pre-push'],
      outdated: ['commit-msg'],
    });
  });

  it('is valid when every enabled hook is current, and when none is enabled', () => {
    write('.husky/pre-push', '# RuleOfCode v1.2.3\n');
    const valid = { valid: true, missing: [], outdated: [] };
    expect(validate({ prePush: true })).toEqual(valid);
    expect(validate({})).toEqual(valid);
  });

  it('without .husky every hook is missing; an empty hook file is outdated', () => {
    expect(validate({ preCommit: true }).missing).toEqual([
      'All hooks - .husky directory not found',
    ]);
    write('.husky/pre-commit', '');
    expect(validate({ preCommit: true }).outdated).toEqual(['pre-commit']);
  });

  it('a Python project whose hooks pre-commit owns has nothing to validate', () => {
    write('pyproject.toml', '[project]\nname = "x"\n');
    write('.pre-commit-config.yaml', 'repos: []\n');
    expect(validate({ preCommit: true }).valid).toBe(true);
  });
});
