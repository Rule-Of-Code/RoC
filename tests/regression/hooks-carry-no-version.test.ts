/**
 * The repository's own git hooks never name a stale RuleOfCode version.
 *
 * `.husky/commit-msg` printed "RuleOfCode v7.22.0" through 7.28.0: a version
 * written by hand into a hook drifts with every release and is wrong in every
 * message after the next one (23b0f6c removed it).
 *
 * The hooks do carry a version since 8.0.0, on purpose: `reinstall-hooks`
 * writes it, and the installer's hook check (`GitHooksInstaller.validateHooks`)
 * reads it to tell an up-to-date hook from an outdated one, so a hook without
 * it made every audit of this repository print "Outdated git hooks". Each
 * release reinstalls the hooks. What must never come back is the drift: any
 * version a hook names is the version in package.json.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const HUSKY = path.join(ROOT, '.husky');
const HOOKS = ['pre-commit', 'pre-push', 'commit-msg'];
const VERSION = (
  JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

describe('hooks name no stale version', () => {
  it.each(HOOKS)('.husky/%s names only the package version', hook => {
    const text = fs.readFileSync(path.join(HUSKY, hook), 'utf8');
    const named = [...text.matchAll(/\bv(\d+\.\d+\.\d+)\b/g)].map(m => m[1]);
    expect(named.filter(v => v !== VERSION)).toEqual([]);
  });

  it('a hook naming an older version is caught', () => {
    const stale = '# RuleOfCode v7.22.0 Commit Message Validation';
    const named = [...stale.matchAll(/\bv(\d+\.\d+\.\d+)\b/g)].map(m => m[1]);
    expect(named.filter(v => v !== VERSION)).toEqual(['7.22.0']);
  });
});
